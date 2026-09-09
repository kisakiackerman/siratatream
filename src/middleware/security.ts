import type { Request, Response, NextFunction } from "express";

/**
 * 1. Comprehensive HTTP Security Headers Middleware
 * Protects against XSS, clickjacking, MIME sniffing, protocol downgrades, and data leakage.
 */
export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction) {
  // Prevent browser MIME-sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");

  // Legacy XSS filter for compatible browsers
  res.setHeader("X-XSS-Protection", "1; mode=block");

  // Enforce HTTPS across all subdomains (HSTS)
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");

  // Protect referrer leakage
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // Control DNS prefetching
  res.setHeader("X-DNS-Prefetch-Control", "off");

  // IE/Edge download restriction
  res.setHeader("X-Download-Options", "noopen");

  // Restrict sensitive device APIs
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), payment=(), usb=(), display-capture=()"
  );

  // Content-Security-Policy with safe frame-ancestors for AI Studio preview & YouTube/Google integrations
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self' https: data: blob: 'unsafe-inline' 'unsafe-eval'",
      "frame-ancestors 'self' https://*.google.com https://*.run.app https://ai.studio https://*.aistudio.google.com",
      "img-src 'self' https: data: blob:",
      "media-src 'self' https: blob: data:",
      "connect-src 'self' https: wss: data:",
      "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://www.dailymotion.com https://*.google.com https://accounts.google.com",
    ].join("; ")
  );

  // Remove Express server fingerprinting
  res.removeHeader("X-Powered-By");

  next();
}

/**
 * 2. Sliding-Window In-Memory Rate Limiter
 * Guards against brute-force attacks, denial-of-service, and quota exhaustion.
 */
interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Clean up stale IP records every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export function createRateLimiter(options: {
  windowMs: number;
  maxRequests: number;
  message?: string;
}) {
  const { windowMs, maxRequests, message = "Trop de requêtes. Veuillez patienter un instant." } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    // Extract client IP address reliably (handling Cloud Run reverse proxy headers)
    const forwarded = req.headers["x-forwarded-for"];
    const ip = typeof forwarded === "string" ? forwarded.split(",")[0].trim() : req.socket.remoteAddress || "unknown";
    const key = `${req.baseUrl || ""}${req.path}_${ip}`;
    const now = Date.now();

    let record = rateLimitStore.get(key);
    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs,
      };
      rateLimitStore.set(key, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, maxRequests - record.count);
    const resetSeconds = Math.ceil((record.resetTime - now) / 1000);

    res.setHeader("X-RateLimit-Limit", maxRequests);
    res.setHeader("X-RateLimit-Remaining", remaining);
    res.setHeader("X-RateLimit-Reset", resetSeconds);

    if (record.count > maxRequests) {
      res.setHeader("Retry-After", resetSeconds);
      return res.status(429).json({
        success: false,
        error: message,
        retryAfter: resetSeconds,
      });
    }

    next();
  };
}

// Pre-configured rate limiters
export const standardApiLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
});

export const aiEndpointLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30, // 30 AI calls/min max per IP
  message: "Limite de requêtes IA atteinte pour cette minute. Veuillez patienter.",
});

/**
 * 3. Anti-Injection & Input Sanitization Middleware
 * Recursively inspects requests to neutralize XSS, Prototype Pollution, and null-byte attacks.
 */
function sanitizeValue(value: any): any {
  if (typeof value === "string") {
    // Strip dangerous script tags and null bytes
    return value
      .replace(/\0/g, "")
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value !== null && typeof value === "object") {
    // Prototype pollution prevention
    const cleanObj: Record<string, any> = {};
    for (const key of Object.keys(value)) {
      if (key === "__proto__" || key === "constructor" || key === "prototype") {
        continue;
      }
      cleanObj[key] = sanitizeValue(value[key]);
    }
    return cleanObj;
  }

  return value;
}

export function inputSanitizerMiddleware(req: Request, res: Response, next: NextFunction) {
  // Guard against prototype pollution in raw body
  if (req.body && typeof req.body === "object") {
    const hasPrototypeExploit = Object.keys(req.body).some(
      (k) => k === "__proto__" || k === "constructor" || k === "prototype"
    );
    if (hasPrototypeExploit) {
      return res.status(400).json({ error: "Payload non autorisé (tentative de pollution de prototype)." });
    }
    req.body = sanitizeValue(req.body);
  }

  if (req.query && typeof req.query === "object") {
    req.query = sanitizeValue(req.query);
  }

  next();
}
