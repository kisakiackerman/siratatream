import { useState, useEffect, useCallback } from "react";
import {
  autonomousAIGuardian,
  type GuardianReport,
  type GlobalSweepResult,
} from "@/lib/autonomousAIGuardian";

export function useAIGuardian() {
  const [report, setReport] = useState<GuardianReport>(() => autonomousAIGuardian.getGuardianReport());
  const [isRunningCheck, setIsRunningCheck] = useState(false);
  const [isSweepingGlobal, setIsSweepingGlobal] = useState(false);
  const [sweepProgressText, setSweepProgressText] = useState("");
  const [sweepProgressPct, setSweepProgressPct] = useState(0);
  const [remoteHealNotice, setRemoteHealNotice] = useState<string | null>(null);

  useEffect(() => {
    // S'assurer que le gardien est initialisé
    autonomousAIGuardian.initialize();

    // S'abonner aux changements d'état
    const unsubscribe = autonomousAIGuardian.subscribe((updatedReport) => {
      setReport(updatedReport);
    });

    // Écouter les événements de guérison globale transmise à distance
    const handleRemoteHeal = (e: any) => {
      const msg = e?.detail?.message || "Purification globale terminée par l'IA";
      setRemoteHealNotice(msg);
      setTimeout(() => setRemoteHealNotice(null), 5000);
    };

    window.addEventListener("sirat-global-heal-received", handleRemoteHeal);

    return () => {
      unsubscribe();
      window.removeEventListener("sirat-global-heal-received", handleRemoteHeal);
    };
  }, []);

  const triggerVerification = useCallback(async () => {
    setIsRunningCheck(true);
    try {
      const updated = await autonomousAIGuardian.runFullDailyCheck("Vérification manuelle utilisateur");
      setReport(updated);
    } finally {
      setIsRunningCheck(false);
    }
  }, []);

  const runCreatorGlobalSweep = useCallback(
    async (creatorEmail: string): Promise<GlobalSweepResult> => {
      setIsSweepingGlobal(true);
      setSweepProgressPct(5);
      setSweepProgressText("Initialisation du scan multi-comptes et adresses IP...");
      try {
        const result = await autonomousAIGuardian.runCreatorGlobalScanAndHeal(
          creatorEmail,
          (stepText, progressPct) => {
            setSweepProgressText(stepText);
            setSweepProgressPct(progressPct);
          }
        );
        return result;
      } finally {
        setIsSweepingGlobal(false);
        setTimeout(() => {
          setSweepProgressPct(0);
          setSweepProgressText("");
        }, 4000);
      }
    },
    []
  );

  return {
    report,
    isRunningCheck,
    isSweepingGlobal,
    sweepProgressText,
    sweepProgressPct,
    remoteHealNotice,
    triggerVerification,
    runCreatorGlobalSweep,
    autoHealAccount: () => autonomousAIGuardian.healAccountAndProfiles(),
    autoHealVideos: () => autonomousAIGuardian.healCatalogAndVideos(),
    autoHealStorage: () => autonomousAIGuardian.healStorageQuota(),
  };
}

