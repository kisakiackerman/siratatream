import { useEffect, useCallback } from "react";
import { LogOut, X, ShieldCheck } from "lucide-react";

interface ExitAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmExit: () => void;
  title?: string;
  description?: string;
}

export default function ExitAppModal({
  isOpen,
  onClose,
  onConfirmExit,
  title = "Quitter l'application ?",
  description = "Vos favoris, votre historique de visionnage et votre profil sont sauvegardés en toute sécurité. Souhaitez-vous vraiment vous déconnecter et quitter Sirat Stream ?",
}: ExitAppModalProps) {
  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      id="exit-app-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-app-title"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-3xl p-6 bg-zinc-950/95 border border-white/15 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_16px_48px_rgba(0,0,0,0.85)] text-left space-y-4 transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          title="Fermer"
        >
          <X size={16} />
        </button>

        {/* Header with icon */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 flex-shrink-0 shadow-inner">
            <LogOut size={20} />
          </div>
          <div>
            <h3 id="exit-app-title" className="text-base sm:text-lg font-bold text-white tracking-tight">
              {title}
            </h3>
            <p className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
              <ShieldCheck size={12} className="text-emerald-400" />
              <span>Données synchronisées</span>
            </p>
          </div>
        </div>

        {/* Message body */}
        <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
          {description}
        </p>

        {/* Action buttons */}
        <div className="pt-2 flex items-center justify-end gap-2.5">
          <button
            type="button"
            id="btn-cancel-exit-app"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-zinc-200 hover:text-white text-xs sm:text-sm font-semibold transition-all cursor-pointer active:scale-95"
          >
            Rester sur l'application
          </button>
          <button
            type="button"
            id="btn-confirm-exit-app"
            onClick={() => {
              onClose();
              onConfirmExit();
            }}
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs sm:text-sm font-bold transition-all shadow-lg shadow-rose-950/50 cursor-pointer active:scale-95 flex items-center gap-1.5"
          >
            <LogOut size={14} />
            <span>Quitter l'application</span>
          </button>
        </div>
      </div>
    </div>
  );
}
