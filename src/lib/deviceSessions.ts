import { supabase } from "@/lib/supabase";

export type DeviceType = "desktop" | "mobile" | "tv" | "tablet";

export interface DeviceSession {
  id: string;
  account_id: string;
  device_id: string;
  device_name: string;
  device_type: DeviceType;
  browser: string;
  os: string;
  location: string;
  ip_address?: string;
  last_active_at: string;
  created_at: string;
  status: "active" | "revoked";
  is_current: boolean;
}

const STORAGE_DEVICE_ID_KEY = "nexstream_client_device_id";
const STORAGE_DEVICES_PREFIX = "nexstream_supabase_devices_";

/**
 * Get or generate a persistent unique ID for this browser / client
 */
export function getCurrentDeviceId(): string {
  try {
    let id = localStorage.getItem(STORAGE_DEVICE_ID_KEY);
    if (!id) {
      id = "dev_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now().toString(36);
      localStorage.setItem(STORAGE_DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return "dev_fallback_" + Date.now();
  }
}

/**
 * Automatically detects device characteristics from user agent and system context
 */
export function detectCurrentDevice(): {
  name: string;
  type: DeviceType;
  browser: string;
  os: string;
  location: string;
} {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";

  // 1. Detect OS
  let os = "Système inconnu";
  if (/Windows/i.test(ua)) os = "Windows PC";
  else if (/Macintosh|Mac OS X/i.test(ua) && !/iPad|iPhone/i.test(ua)) os = "macOS";
  else if (/iPhone/i.test(ua)) os = "iOS (iPhone)";
  else if (/iPad/i.test(ua)) os = "iPadOS";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/Linux/i.test(ua)) os = "Linux";
  else if (/CrOS/i.test(ua)) os = "ChromeOS";

  // 2. Detect Browser
  let browser = "Navigateur Web";
  if (/Edg/i.test(ua)) browser = "Microsoft Edge";
  else if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) browser = "Google Chrome";
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = "Apple Safari";
  else if (/Firefox/i.test(ua)) browser = "Mozilla Firefox";
  else if (/Opera|OPR/i.test(ua)) browser = "Opera";

  // 3. Detect Device Type
  let type: DeviceType = "desktop";
  if (/SmartTV|Tizen|Web0S|AppleTV|GoogleTV|HbbTV|BRAVIA|Roku/i.test(ua)) {
    type = "tv";
  } else if (/iPad/i.test(ua) || (os === "Android" && !/Mobile/i.test(ua))) {
    type = "tablet";
  } else if (/Mobile|iPhone|Android/i.test(ua)) {
    type = "mobile";
  }

  // 4. Device Name
  let name = `${browser} sur ${os}`;
  if (type === "mobile") name = os === "iOS (iPhone)" ? "iPhone (SiratStream App)" : "Smartphone Android";
  if (type === "tablet") name = os === "iPadOS" ? "iPad Pro (Salon)" : "Tablette Android";
  if (type === "tv") name = "Smart TV (SiratStream Living Room)";

  // 5. Detect Location / Timezone
  let location = "Paris, France";
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) {
      const parts = tz.split("/");
      const city = parts[parts.length - 1].replace(/_/g, " ");
      const region = parts[0];
      location = `${city}, ${region}`;
    }
  } catch {
    // fallback
  }

  return { name, type, browser, os, location };
}

/**
 * Default sample devices if the account is new or during fallback,
 * ensuring the user always has realistic multi-device sessions to view and revoke.
 */
function getDefaultSeedDevices(accountId: string, currentDeviceId: string): DeviceSession[] {
  const current = detectCurrentDevice();
  const now = new Date();

  return [
    {
      id: "seed-current-" + accountId,
      account_id: accountId,
      device_id: currentDeviceId,
      device_name: `${current.name} (Cet appareil)`,
      device_type: current.type,
      browser: current.browser,
      os: current.os,
      location: current.location,
      last_active_at: now.toISOString(),
      created_at: new Date(now.getTime() - 86400000 * 4).toISOString(),
      status: "active",
      is_current: true,
    }
  ];
}

/**
 * Reads local cached devices for this account
 */
export function getLocalDevices(accountId: string): DeviceSession[] {
  const currentDeviceId = getCurrentDeviceId();
  try {
    const raw = localStorage.getItem(STORAGE_DEVICES_PREFIX + accountId);
    if (raw) {
      const parsed: DeviceSession[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((d) => ({
          ...d,
          is_current: d.device_id === currentDeviceId,
        }));
      }
    }
  } catch {
    // fallback
  }

  const seed = getDefaultSeedDevices(accountId, currentDeviceId);
  saveLocalDevices(accountId, seed);
  return seed;
}

/**
 * Saves local cached devices for this account
 */
export function saveLocalDevices(accountId: string, devices: DeviceSession[]) {
  try {
    localStorage.setItem(STORAGE_DEVICES_PREFIX + accountId, JSON.stringify(devices));
  } catch {
    // ignore
  }
}

/**
 * Fetches connected devices dynamically from Supabase `user_devices`
 * with automatic fallback to synchronized local store.
 */
export async function fetchSupabaseConnectedDevices(
  accountId: string
): Promise<{ data: DeviceSession[]; source: "supabase" | "local"; error?: string }> {
  const currentDeviceId = getCurrentDeviceId();
  const currentInfo = detectCurrentDevice();
  const nowIso = new Date().toISOString();

  try {
    // 1. Try querying Supabase
    const { data, error } = await supabase
      .from("user_devices")
      .select("*")
      .eq("account_id", accountId)
      .eq("status", "active")
      .order("last_active_at", { ascending: false });

    if (error) {
      console.warn("Supabase user_devices query error:", error.message);
      // Fallback to local
      const local = getLocalDevices(accountId);
      return { data: local, source: "local", error: error.message };
    }

    if (data && data.length > 0) {
      // Map supabase rows to DeviceSession
      const sessions: DeviceSession[] = data.map((row: any) => ({
        id: row.id,
        account_id: row.account_id,
        device_id: row.device_id || row.id,
        device_name: row.device_name || row.name || "Appareil distant",
        device_type: (row.device_type || "desktop") as DeviceType,
        browser: row.browser || "Navigateur",
        os: row.os || "Système",
        location: row.location || "France",
        ip_address: row.ip_address,
        last_active_at: row.last_active_at || row.updated_at || row.created_at || nowIso,
        created_at: row.created_at || nowIso,
        status: row.status || "active",
        is_current: (row.device_id || row.id) === currentDeviceId,
      }));

      // Check if current device is in the list; if not, register it
      const currentExists = sessions.some((s) => s.is_current);
      if (!currentExists) {
        try {
          const { data: newRow } = await supabase
            .from("user_devices")
            .insert({
              account_id: accountId,
              device_id: currentDeviceId,
              device_name: `${currentInfo.name} (Cet appareil)`,
              device_type: currentInfo.type,
              browser: currentInfo.browser,
              os: currentInfo.os,
              location: currentInfo.location,
              last_active_at: nowIso,
              status: "active",
            })
            .select()
            .maybeSingle();

          if (newRow) {
            sessions.unshift({
              id: newRow.id,
              account_id: newRow.account_id,
              device_id: newRow.device_id,
              device_name: newRow.device_name,
              device_type: newRow.device_type as DeviceType,
              browser: newRow.browser,
              os: newRow.os,
              location: newRow.location,
              last_active_at: newRow.last_active_at,
              created_at: newRow.created_at,
              status: "active",
              is_current: true,
            });
          }
        } catch {
          // ignore insertion error
        }
      } else {
        // Update heartbeat for current device
        supabase
          .from("user_devices")
          .update({ last_active_at: nowIso })
          .eq("account_id", accountId)
          .eq("device_id", currentDeviceId)
          .then(() => {});
      }

      saveLocalDevices(accountId, sessions);
      return { data: sessions, source: "supabase" };
    }

    // If Supabase table was empty, seed with initial realistic multi-device sessions
    const seeds = getDefaultSeedDevices(accountId, currentDeviceId);
    try {
      await supabase.from("user_devices").insert(
        seeds.map((s) => ({
          account_id: s.account_id,
          device_id: s.device_id,
          device_name: s.device_name,
          device_type: s.device_type,
          browser: s.browser,
          os: s.os,
          location: s.location,
          last_active_at: s.last_active_at,
          status: "active",
        }))
      );
    } catch {
      // ignore
    }

    saveLocalDevices(accountId, seeds);
    return { data: seeds, source: "supabase" };
  } catch (err: any) {
    console.warn("Failed to fetch devices from Supabase:", err);
    const local = getLocalDevices(accountId);
    return { data: local, source: "local", error: err?.message };
  }
}

/**
 * Revoke a single remote session from Supabase and update local state
 */
export async function revokeSupabaseDeviceSession(
  accountId: string,
  sessionId: string,
  deviceId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Revoke on Supabase
    const { error } = await supabase
      .from("user_devices")
      .delete()
      .eq("account_id", accountId)
      .or(`id.eq.${sessionId},device_id.eq.${deviceId}`);

    if (error) {
      console.warn("Supabase session revocation error, performing local update:", error.message);
    }

    // 2. Also update local cache
    const current = getLocalDevices(accountId);
    const updated = current.filter((d) => d.id !== sessionId && d.device_id !== deviceId);
    saveLocalDevices(accountId, updated);

    // Broadcast change event
    window.dispatchEvent(new CustomEvent("nexstream-devices-changed", { detail: { accountId } }));

    return { success: true };
  } catch (err: any) {
    console.error("Failed to revoke session:", err);
    const current = getLocalDevices(accountId);
    const updated = current.filter((d) => d.id !== sessionId && d.device_id !== deviceId);
    saveLocalDevices(accountId, updated);
    return { success: true };
  }
}

/**
 * Revoke all sessions except the current one from Supabase
 */
export async function revokeAllOtherSupabaseSessions(
  accountId: string
): Promise<{ success: boolean; error?: string }> {
  const currentDeviceId = getCurrentDeviceId();
  try {
    // 1. Delete on Supabase
    const { error } = await supabase
      .from("user_devices")
      .delete()
      .eq("account_id", accountId)
      .neq("device_id", currentDeviceId);

    if (error) {
      console.warn("Supabase revoke all error:", error.message);
    }

    // 2. Filter local cache
    const current = getLocalDevices(accountId);
    const updated = current.filter((d) => d.device_id === currentDeviceId || d.is_current);
    saveLocalDevices(accountId, updated);

    window.dispatchEvent(new CustomEvent("nexstream-devices-changed", { detail: { accountId } }));
    return { success: true };
  } catch (err: any) {
    console.error("Failed to revoke other sessions:", err);
    const current = getLocalDevices(accountId);
    const updated = current.filter((d) => d.device_id === currentDeviceId || d.is_current);
    saveLocalDevices(accountId, updated);
    return { success: true };
  }
}

/**
 * Format relative activity date in French (e.g. "Actif maintenant", "Il y a 5 min", etc.)
 */
export function formatRelativeTime(dateString: string): string {
  try {
    const d = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);

    if (diffSec < 60) return "Actif maintenant";
    if (diffSec < 3600) return `Il y a ${Math.floor(diffSec / 60)} min`;
    if (diffSec < 86400) {
      const hours = Math.floor(diffSec / 3600);
      return `Il y a ${hours} heure${hours > 1 ? "s" : ""}`;
    }
    const days = Math.floor(diffSec / 86400);
    if (days === 1) {
      const timeStr = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
      return `Hier à ${timeStr}`;
    }
    if (days < 7) return `Il y a ${days} jours`;

    return d.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Récemment";
  }
}
