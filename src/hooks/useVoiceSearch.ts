import { useState, useEffect, useCallback, useRef } from "react";

interface IWindow extends Window {
  webkitSpeechRecognition?: any;
  SpeechRecognition?: any;
}

export type MicPermissionState = "prompt" | "granted" | "denied" | "unsupported";

export interface VoiceSearchState {
  supported: boolean;
  listening: boolean;
  permissionState: MicPermissionState;
  error: string | null;
  transcript: string;
  start: () => Promise<void>;
  stop: () => void;
  toggle: () => void;
  requestPermission: () => Promise<boolean>;
  clearError: () => void;
}

export function useVoiceSearch(onResult: (transcript: string) => void): VoiceSearchState {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [permissionState, setPermissionState] = useState<MicPermissionState>("prompt");
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");

  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const onResultRef = useRef(onResult);
  const timeoutRef = useRef<any>(null);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  // Check microphone permissions on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!navigator?.mediaDevices?.getUserMedia) {
      setPermissionState("unsupported");
    } else if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: "microphone" as PermissionName })
        .then((status) => {
          setPermissionState(status.state as MicPermissionState);
          status.onchange = () => {
            setPermissionState(status.state as MicPermissionState);
          };
        })
        .catch(() => {
          setPermissionState("prompt");
        });
    }

    const win = window as IWindow;
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (SpeechRec) {
      setSupported(true);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore cleanup error
        }
        recognitionRef.current = null;
      }
      isListeningRef.current = false;
    };
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Request browser permission explicitly
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined" || !navigator?.mediaDevices?.getUserMedia) {
      setError("Votre navigateur ne supporte pas l'accès au microphone.");
      setPermissionState("unsupported");
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      // Immediately release tracks once permission is confirmed
      stream.getTracks().forEach((track) => track.stop());
      setPermissionState("granted");
      setError(null);
      return true;
    } catch (err: any) {
      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        setPermissionState("denied");
        setError("Microphone bloqué : veuillez autoriser le micro dans les paramètres ou l'icône de cadenas de la barre d'adresse de votre navigateur.");
      } else {
        setError("Impossible d'accéder au microphone : " + (err?.message || "erreur inconnue"));
      }
      return false;
    }
  }, []);

  const stop = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore
        }
      }
    }
    isListeningRef.current = false;
    setListening(false);
  }, []);

  const start = useCallback(async () => {
    if (typeof window === "undefined") return;
    setError(null);
    setTranscript("");

    const win = window as IWindow;
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRec) {
      setError("La reconnaissance vocale n'est pas supportée par votre navigateur actuel (Chrome, Edge ou Safari conseillés).");
      return;
    }

    // Safely stop existing instance before creating a new one
    if (isListeningRef.current || recognitionRef.current) {
      stop();
    }

    // Try requesting microphone access if permissions API is available
    if (navigator?.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Immediately release tracks
        stream.getTracks().forEach((track) => track.stop());
      } catch (mediaErr: any) {
        if (mediaErr?.name === "NotAllowedError" || mediaErr?.name === "PermissionDeniedError") {
          setError("Microphone bloqué : veuillez autoriser l'accès au micro dans votre navigateur.");
          setListening(false);
          isListeningRef.current = false;
          return;
        }
        // Continue anyway as SpeechRecognition might have distinct permission handling
      }
    }

    try {
      const recognition = new SpeechRec();
      recognition.continuous = false;
      recognition.interimResults = true; // Provides instantaneous visual feedback as the user speaks
      recognition.lang = navigator.language || "fr-FR";
      recognition.maxAlternatives = 3;

      recognition.onstart = () => {
        isListeningRef.current = true;
        setListening(true);
        setError(null);

        // Auto-stop after 15 seconds of silence
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          if (isListeningRef.current) {
            stop();
          }
        }, 15000);
      };

      recognition.onresult = (event: any) => {
        let interim = "";
        let final = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const part = event.results[i][0]?.transcript || "";
          if (event.results[i].isFinal) {
            final += part;
          } else {
            interim += part;
          }
        }

        const recognizedText = final.trim() || interim.trim();
        if (recognizedText) {
          setTranscript(recognizedText);
          onResultRef.current(recognizedText);
        }

        if (final.trim()) {
          isListeningRef.current = false;
          setListening(false);
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
        }
      };

      recognition.onerror = (event: any) => {
        isListeningRef.current = false;
        setListening(false);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        const err = event?.error;
        if (err === "not-allowed" || err === "permission-denied") {
          setError("Accès micro refusé. Veuillez autoriser le microphone dans la barre d'adresse de votre navigateur.");
        } else if (err === "no-speech") {
          setError("Aucune voix détectée. Parlez plus fort ou approchez-vous du micro.");
        } else if (err === "audio-capture") {
          setError("Aucun microphone détecté sur votre appareil.");
        } else if (err === "network") {
          setError("Erreur réseau pour la reconnaissance vocale.");
        } else if (err !== "aborted") {
          setError("Recherche vocale interrompue. Veuillez réessayer.");
        }
      };

      recognition.onend = () => {
        isListeningRef.current = false;
        setListening(false);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        recognitionRef.current = null;
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      isListeningRef.current = false;
      setListening(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      if (err?.name === "InvalidStateError" || err?.message?.includes("already started")) {
        return;
      }
      setError("Impossible d'activer la recherche vocale. Veuillez réessayer.");
      console.warn("Speech recognition initialization failed:", err);
    }
  }, [stop]);

  const toggle = useCallback(() => {
    if (isListeningRef.current) {
      stop();
    } else {
      start();
    }
  }, [start, stop]);

  return {
    supported,
    listening,
    permissionState,
    error,
    transcript,
    start,
    stop,
    toggle,
    requestPermission,
    clearError,
  };
}

