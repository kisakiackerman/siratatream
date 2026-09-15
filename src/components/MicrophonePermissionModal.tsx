import { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  CheckCircle2,
  AlertCircle,
  Settings,
  ExternalLink,
  Volume2,
  Sparkles,
  ShieldCheck,
  X,
  RefreshCw,
} from "lucide-react";
import { GlassPanel } from "./GlassSurface";

interface MicrophonePermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPermissionGranted?: () => void;
}

export type MicStatus = "checking" | "granted" | "prompt" | "denied" | "unsupported";

export default function MicrophonePermissionModal({
  isOpen,
  onClose,
  onPermissionGranted,
}: MicrophonePermissionModalProps) {
  const [status, setStatus] = useState<MicStatus>("checking");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [testSpeech, setTestSpeech] = useState<string>("");
  const [isTesting, setIsTesting] = useState(false);
  const [audioLevel, setAudioLevel] = useState<number>(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Check current permission state using the Permissions API
  const checkPermission = async () => {
    setErrorMsg(null);
    if (typeof window === "undefined") return;

    if (!navigator?.mediaDevices?.getUserMedia) {
      setStatus("unsupported");
      return;
    }

    try {
      if (navigator.permissions && navigator.permissions.query) {
        const perm = await navigator.permissions.query({ name: "microphone" as PermissionName });
        setStatus(perm.state as MicStatus);

        perm.onchange = () => {
          setStatus(perm.state as MicStatus);
          if (perm.state === "granted" && onPermissionGranted) {
            onPermissionGranted();
          }
        };
      } else {
        // Fallback: If permissions API is unavailable, status remains 'prompt'
        setStatus("prompt");
      }
    } catch {
      setStatus("prompt");
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkPermission();
    } else {
      stopTesting();
    }
    return () => {
      stopTesting();
    };
  }, [isOpen]);

  // Request browser permission explicitly
  const handleRequestPermission = async () => {
    setIsRequesting(true);
    setErrorMsg(null);

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error("Votre navigateur ne supporte pas l'API MediaDevices.");
      }

      // Explicitly trigger the browser's native permission prompt
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      setStatus("granted");
      setIsRequesting(false);

      // Start live audio visualizer for 5 seconds to confirm audio capture
      startLiveLevelMeter(stream);

      if (onPermissionGranted) {
        onPermissionGranted();
      }
    } catch (err: any) {
      setIsRequesting(false);
      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        setStatus("denied");
        setErrorMsg(
          "Permission refusée par le navigateur. Cliquez sur l'icône de cadenas 🔒 à gauche de la barre d'adresse pour réactiver le microphone."
        );
      } else if (err?.name === "NotFoundError" || err?.name === "DevicesNotFoundError") {
        setStatus("denied");
        setErrorMsg("Aucun microphone physique détecté ou branché sur cet appareil.");
      } else {
        setErrorMsg(err?.message || "Erreur lors de la demande d'accès au micro.");
      }
    }
  };

  // Live audio level visualizer
  const startLiveLevelMeter = (stream: MediaStream) => {
    micStreamRef.current = stream;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateMeter = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animationFrameRef.current = requestAnimationFrame(updateMeter);
      };

      updateMeter();

      // Automatically release visualizer stream after 8 seconds
      setTimeout(() => {
        stopTesting();
      }, 8000);
    } catch {
      // Fallback
    }
  };

  const stopTesting = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {
        // Ignore
      }
      audioContextRef.current = null;
    }
    setAudioLevel(0);
    setIsTesting(false);
  };

  // Test live speech recognition
  const handleTestSpeech = () => {
    const win = window as any;
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRec) {
      setErrorMsg("Reconnaissance vocale non disponible sur ce navigateur.");
      return;
    }

    try {
      setIsTesting(true);
      setTestSpeech("Écoute en cours... Dites par exemple « Sourate Al-Baqara »");

      const rec = new SpeechRec();
      rec.lang = "fr-FR";
      rec.interimResults = true;

      rec.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0]?.transcript || "";
        }
        if (transcript.trim()) {
          setTestSpeech(`« ${transcript.trim()} »`);
        }
      };

      rec.onerror = (e: any) => {
        setIsTesting(false);
        if (e.error !== "no-speech") {
          setErrorMsg("Erreur reconnaissance vocale : " + e.error);
        }
      };

      rec.onend = () => {
        setIsTesting(false);
      };

      rec.start();
    } catch (err: any) {
      setIsTesting(false);
      setErrorMsg(err.message || "Impossible de démarrer le test vocal.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-zinc-950/95 border border-emerald-500/30 rounded-3xl shadow-[0_25px_60px_-15px_rgba(16,185,129,0.3)] overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mic-modal-title"
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${
                status === "granted"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  : status === "denied"
                  ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                  : "bg-amber-500/20 text-amber-400 border border-amber-500/40"
              }`}
            >
              {status === "granted" ? (
                <Mic className="w-6 h-6 animate-pulse" />
              ) : status === "denied" ? (
                <MicOff className="w-6 h-6" />
              ) : (
                <Mic className="w-6 h-6" />
              )}
            </div>
            <div>
              <h2 id="mic-modal-title" className="text-lg font-bold text-white tracking-tight">
                Permission Microphone
              </h2>
              <p className="text-xs text-zinc-400">
                Autorisez le navigateur pour la recherche vocale et les commandes audio
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopTesting();
              onClose();
            }}
            className="p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Status Badge */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-semibold text-zinc-300">Statut navigateur :</span>
              {status === "granted" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <CheckCircle2 size={13} />
                  Autorisé
                </span>
              )}
              {status === "prompt" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <AlertCircle size={13} />
                  En attente d'autorisation
                </span>
              )}
              {status === "denied" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  <MicOff size={13} />
                  Refusé / Bloqué
                </span>
              )}
              {status === "unsupported" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-zinc-800 text-zinc-400">
                  Non supporté
                </span>
              )}
              {status === "checking" && (
                <span className="text-xs text-zinc-500">Vérification en cours...</span>
              )}
            </div>

            <button
              onClick={checkPermission}
              className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
              title="Actualiser le statut de la permission"
            >
              <RefreshCw size={12} />
              <span>Actualiser</span>
            </button>
          </div>

          {/* Error Message if any */}
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200 flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle size={16} className="text-rose-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">Action requise</p>
                <p className="leading-relaxed">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Action Area depending on status */}
          {status === "granted" ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 space-y-3">
                <div className="flex items-center gap-2 text-emerald-300 text-sm font-semibold">
                  <ShieldCheck size={18} />
                  <span>Le microphone est actif et prêt à l'emploi</span>
                </div>
                <p className="text-xs text-emerald-100/80 leading-relaxed">
                  Vous pouvez maintenant dicter vos recherches de vidéos, sourates ou récits prophétiques directement avec votre voix.
                </p>

                {/* Live audio meter */}
                {audioLevel > 0 && (
                  <div className="space-y-1.5 pt-2">
                    <div className="flex justify-between text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                      <span>Niveau sonore capté</span>
                      <span>{audioLevel}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-zinc-900 rounded-full overflow-hidden border border-emerald-500/20">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 transition-all duration-75"
                        style={{ width: `${audioLevel}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Speech test section */}
              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={handleTestSpeech}
                  disabled={isTesting}
                  className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  <Sparkles size={15} />
                  <span>{isTesting ? "Écoute en cours..." : "Tester la reconnaissance vocale"}</span>
                </button>
                <button
                  type="button"
                  onClick={handleRequestPermission}
                  className="py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white font-medium text-xs flex items-center justify-center gap-2 border border-zinc-800 transition-colors"
                >
                  <Volume2 size={15} />
                  <span>Tester le niveau audio</span>
                </button>
              </div>

              {testSpeech && (
                <div className="p-3 bg-zinc-900/90 rounded-xl border border-zinc-800 text-xs text-center text-emerald-200 font-medium animate-in fade-in">
                  {testSpeech}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Request Button */}
              <button
                type="button"
                onClick={handleRequestPermission}
                disabled={isRequesting}
                className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-[0.99] text-zinc-950 font-black text-sm flex items-center justify-center gap-2.5 transition-all shadow-[0_0_25px_rgba(16,185,129,0.35)] disabled:opacity-50"
              >
                <Mic size={18} />
                <span>{isRequesting ? "Demande en cours au navigateur..." : "Demander la permission au navigateur"}</span>
              </button>

              {/* Instructions if blocked or pending */}
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2.5 text-xs text-zinc-300">
                <p className="font-bold text-white flex items-center gap-1.5">
                  <Settings size={14} className="text-emerald-400" />
                  Comment autoriser le micro si la popup n'apparaît pas ?
                </p>
                <ol className="list-decimal list-inside space-y-1.5 text-zinc-400 leading-relaxed">
                  <li>
                    Cliquez sur l'icône <strong className="text-zinc-200">🔒 Cadenas</strong> ou <strong className="text-zinc-200">Paramètres du site</strong> tout à gauche de la barre d'adresse de votre navigateur.
                  </li>
                  <li>
                    Trouvez la ligne <strong className="text-zinc-200">Microphone</strong> et passez-la sur <strong className="text-emerald-400">Autoriser</strong>.
                  </li>
                  <li>
                    Revenez sur cette page et cliquez sur <strong className="text-zinc-200">« Actualiser »</strong>.
                  </li>
                </ol>

                <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500">
                  <span>Recommandé : Google Chrome, Safari, Microsoft Edge</span>
                  <a
                    href="https://support.google.com/chrome/answer/2693767"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <span>Aide navigateur</span>
                    <ExternalLink size={10} />
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 px-6 bg-zinc-900/40 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
          <span>🔒 Vos données vocales restent privées et ne sont jamais enregistrées.</span>
          <button
            onClick={() => {
              stopTesting();
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
