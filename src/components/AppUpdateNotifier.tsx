import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, CheckCircle2, ShieldCheck, X } from "lucide-react";
import { autonomousAIGuardian } from "@/lib/autonomousAIGuardian";

type VersionResponse = {
  version: string;
  buildTimestamp: number;
  currentUrl: string;
  timestamp: number;
  status: string;
};

export default function AppUpdateNotifier() {
  const [autoUpdatedNotification, setAutoUpdatedNotification] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

  const initialBuildTimestampRef = useRef<number | null>(null);
  const initialVersionRef = useRef<string | null>(null);
  const autoAppliedRef = useRef(false);

  // Vérification automatique et application silencieuse par l'IA
  const checkForUpdateAutomatically = useCallback(async () => {
    try {
      const res = await fetch(`/api/app-version?_t=${Date.now()}`, {
        cache: "no-store",
        headers: { Pragma: "no-cache" },
      });

      if (!res.ok) return;
      const data: VersionResponse = await res.json();

      if (initialBuildTimestampRef.current === null) {
        initialBuildTimestampRef.current = data.buildTimestamp;
        initialVersionRef.current = data.version;
      } else {
        const isNewBuild = data.buildTimestamp > initialBuildTimestampRef.current;
        const isNewVersion = initialVersionRef.current && data.version !== initialVersionRef.current;

        if ((isNewBuild || isNewVersion) && !autoAppliedRef.current) {
          autoAppliedRef.current = true;
          initialBuildTimestampRef.current = data.buildTimestamp;
          initialVersionRef.current = data.version;

          // 1. Déclencher l'auto-maintenance de l'IA Gardienne en arrière-plan
          await autonomousAIGuardian.healStorageQuota();
          await autonomousAIGuardian.healCatalogAndVideos();
          await autonomousAIGuardian.healAccountAndProfiles();

          // 2. Nettoyer les caches obsolètes
          if ("caches" in window) {
            try {
              const names = await caches.keys();
              names.forEach((name) => {
                if (name.includes("old") || name.includes("v1")) {
                  caches.delete(name);
                }
              });
            } catch {
              // ignore
            }
          }

          // 3. Notification discrète et temporaire indiquant que la mise à jour s'est faite automatiquement
          setAutoUpdatedNotification(`Version ${data.version} appliquée automatiquement`);
          setShowToast(true);

          // Masquer automatiquement après 4 secondes sans bloquer l'utilisateur
          setTimeout(() => {
            setShowToast(false);
          }, 4500);
        }
      }
    } catch {
      // Silencieux : mode résilient
    }
  }, []);

  useEffect(() => {
    // Vérification initiale
    checkForUpdateAutomatically();

    // Surveillance périodique toutes les 45 secondes
    const interval = setInterval(checkForUpdateAutomatically, 45000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkForUpdateAutomatically();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", checkForUpdateAutomatically);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", checkForUpdateAutomatically);
    };
  }, [checkForUpdateAutomatically]);

  if (!showToast || !autoUpdatedNotification) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -25, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -25, scale: 0.95 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-[110] w-[92%] max-w-md pointer-events-auto"
      >
        <div className="relative rounded-2xl p-3 bg-zinc-950/90 border border-emerald-400/40 text-white shadow-2xl backdrop-blur-2xl shadow-[inset_0_1px_1px_rgba(167,243,208,0.35),0_12px_35px_rgba(0,0,0,0.8)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-300 flex-shrink-0">
              <ShieldCheck size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-400 font-mono">
                  IA Gardienne Active
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              </div>
              <p className="text-xs text-zinc-200 font-medium truncate">
                {autoUpdatedNotification} • Zéro interruption
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowToast(false)}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
            title="Fermer"
          >
            <X size={14} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
