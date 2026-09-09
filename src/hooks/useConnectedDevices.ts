import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import {
  DeviceSession,
  DeviceType,
  fetchSupabaseConnectedDevices,
  revokeSupabaseDeviceSession,
  revokeAllOtherSupabaseSessions,
  getCurrentDeviceId,
  detectCurrentDevice,
  saveLocalDevices,
} from "@/lib/deviceSessions";

export function useConnectedDevices() {
  const { user } = useAuth();
  const [devices, setDevices] = useState<DeviceSession[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [source, setSource] = useState<"supabase" | "local">("supabase");
  const [error, setError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState<boolean>(false);

  const accountId =
    (user as any)?.uid || (user as any)?.id || "guest-account-nexstream";

  const loadDevices = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      else setRefreshing(true);

      try {
        const result = await fetchSupabaseConnectedDevices(accountId);
        setDevices(result.data);
        setSource(result.source);
        if (result.error && result.source === "local") {
          // keep source as local with graceful info
        }
      } catch (err: any) {
        setError(err?.message || "Erreur de chargement");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accountId]
  );

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  // Listen to custom local dispatch events for instant cross-component updates
  useEffect(() => {
    const handleCustomChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.accountId === accountId) {
        loadDevices(true);
      }
    };
    window.addEventListener("nexstream-devices-changed", handleCustomChange);
    return () => {
      window.removeEventListener("nexstream-devices-changed", handleCustomChange);
    };
  }, [accountId, loadDevices]);

  // Realtime Supabase subscription if available
  useEffect(() => {
    try {
      const channel = supabase
        .channel(`public:user_devices:${accountId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "user_devices",
            filter: `account_id=eq.${accountId}`,
          },
          () => {
            loadDevices(true);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch {
      // ignore realtime errors in environments where realtime websocket is restricted
    }
  }, [accountId, loadDevices]);

  // Revoke single session
  const revokeSession = useCallback(
    async (sessionDbId: string, deviceId: string): Promise<boolean> => {
      setRevokingId(sessionDbId);
      try {
        await revokeSupabaseDeviceSession(accountId, sessionDbId, deviceId);
        setDevices((prev) =>
          prev.filter((d) => d.id !== sessionDbId && d.device_id !== deviceId)
        );
        return true;
      } catch (err: any) {
        setError(err?.message || "Erreur lors de la révocation");
        return false;
      } finally {
        setRevokingId(null);
      }
    },
    [accountId]
  );

  // Revoke all other sessions
  const revokeAllOthers = useCallback(async (): Promise<boolean> => {
    setRevokingAll(true);
    try {
      const currentDeviceId = getCurrentDeviceId();
      await revokeAllOtherSupabaseSessions(accountId);
      setDevices((prev) =>
        prev.filter((d) => d.device_id === currentDeviceId || d.is_current)
      );
      return true;
    } catch (err: any) {
      setError(err?.message || "Erreur lors de la révocation");
      return false;
    } finally {
      setRevokingAll(false);
    }
  }, [accountId]);

  return {
    devices,
    loading,
    refreshing,
    source,
    error,
    revokingId,
    revokingAll,
    revokeSession,
    revokeAllOthers,
    refreshDevices: () => loadDevices(true),
  };
}
