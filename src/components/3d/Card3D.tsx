import React, { useRef, useState, useCallback, useEffect } from "react";
import { TOKENS_3D } from "@/styles/designTokens3d";

interface Card3DProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  maxTilt?: number; // max tilt angle in degrees (default: 8.5)
  depth?: number; // elevation in px on hover (default: 16)
  scale?: number; // scale on hover (default: 1.03)
  glare?: boolean; // specular glare effect
  glareColor?: "gold" | "emerald" | "white";
  className?: string;
  onClick?: () => void;
  as?: "div" | "button";
}

export default function Card3D({
  children,
  maxTilt = TOKENS_3D.tilt.maxAngle,
  depth = 16,
  scale = 1.03,
  glare = true,
  glareColor = "emerald",
  className = "",
  onClick,
  as = "div",
  ...rest
}: Card3DProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState<string>("perspective(900px) rotateX(0deg) rotateY(0deg) translateZ(0px) scale(1)");
  const [glarePos, setGlarePos] = useState<{ x: number; y: number; opacity: number }>({ x: 50, y: 50, opacity: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      setReducedMotion(mq.matches);
      const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
      mq.addEventListener("change", listener);
      return () => mq.removeEventListener("change", listener);
    }
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (reducedMotion || !cardRef.current || e.pointerType === "touch") return;

      const rect = cardRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Invert Y so moving mouse up tilts card toward user
      const rotateX = -((y - centerY) / centerY) * maxTilt;
      const rotateY = ((x - centerX) / centerX) * maxTilt;

      const glareX = Math.round((x / rect.width) * 100);
      const glareY = Math.round((y / rect.height) * 100);

      setTransform(
        `perspective(900px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateZ(${depth}px) scale(${scale})`
      );
      setGlarePos({ x: glareX, y: glareY, opacity: 0.75 });
    },
    [depth, maxTilt, reducedMotion, scale]
  );

  const handlePointerEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handlePointerLeave = useCallback(() => {
    setIsHovered(false);
    setTransform("perspective(900px) rotateX(0deg) rotateY(0deg) translateZ(0px) scale(1)");
    setGlarePos((prev) => ({ ...prev, opacity: 0 }));
  }, []);

  const glareGradient =
    glareColor === "gold"
      ? `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(251, 191, 36, 0.35) 0%, rgba(251, 191, 36, 0.08) 45%, transparent 70%)`
      : glareColor === "emerald"
      ? `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(167, 243, 208, 0.35) 0%, rgba(52, 211, 153, 0.08) 45%, transparent 70%)`
      : `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255, 255, 255, 0.35) 0%, rgba(255, 255, 255, 0.08) 45%, transparent 70%)`;

  const Component = as as any;

  return (
    <Component
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onClick={onClick}
      style={{
        transform: reducedMotion ? (isHovered ? `scale(${scale})` : "scale(1)") : transform,
        transformStyle: "preserve-3d",
        transition: isHovered
          ? "transform 140ms ease-out, box-shadow 180ms ease"
          : "transform 260ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 260ms ease",
        willChange: isHovered ? "transform" : "auto",
      }}
      className={`relative select-none ${className}`}
      {...rest}
    >
      {/* Contenu de la carte avec propagation de l'espace 3D */}
      <div style={{ transformStyle: "preserve-3d" }} className="w-full h-full">
        {children}
      </div>

      {/* Reflet spéculaire 3D (Glint / Glare) suivant la position de la souris */}
      {glare && !reducedMotion && (
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-[inherit] pointer-events-none transition-opacity duration-300"
          style={{
            background: glareGradient,
            opacity: glarePos.opacity,
            mixBlendMode: "screen",
          }}
        />
      )}
    </Component>
  );
}
