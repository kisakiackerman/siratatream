/**
 * Moteur automatique de séparation vocale et de suppression des instruments de musique
 * (traitement temps réel style Moises via Web Audio API + AudioWorklet DSP).
 *
 * Fonctionne de façon 100 % automatique et invisible (aucun bouton ni interface requise) :
 * 1. Analyse en continu le spectre fréquentiel et l'image stéréo (Mid / Side) du flux audio/vidéo.
 * 2. Détecte automatiquement la présence d'instruments (percussions/basses < 125 Hz, nappes/accords stéréo,
 *    cymbales/aigus > 5,2 kHz).
 * 3. Isole la voix humaine centrale et supprime les instruments en temps réel, tout en préservant
 *    la chaleur naturelle des récitations ou voix pures sans musique.
 */

export interface MediaContentHint {
  title?: string;
  description?: string;
  channel?: string;
  categories?: string[];
}

interface AttachedMediaPipeline {
  context: AudioContext;
  source: MediaElementAudioSourceNode;
  analyser: AnalyserNode;
  subBassHp1: BiquadFilterNode;
  subBassHp2: BiquadFilterNode;
  lowMidDip: BiquadFilterNode;
  vocalPresence: BiquadFilterNode;
  cymbalHighShelf: BiquadFilterNode;
  compressor: DynamicsCompressorNode;
  workletNode: AudioWorkletNode | null;
  fallbackDryGain: GainNode | null;
  fallbackMidGain: GainNode | null;
  musicLikelihoodBias: number;
  stereoSideRatio: number;
  instrumentConfidence: number;
  timerId: number | null;
  cleanupListeners: () => void;
}

const attachedMediaMap = new WeakMap<HTMLMediaElement, AttachedMediaPipeline>();
const registeredWorkletContexts = new WeakSet<AudioContext>();

const WORKLET_PROCESSOR_NAME = "sirat-vocal-isolator";

/**
 * Code du processeur AudioWorklet exécuté sur le thread audio temps réel.
 * Décompose le signal stéréo en canal central (Mid = voix) et canal latéral (Side = instruments stéréo),
 * applique un masque adaptatif de Wiener + annulation d'accompagnement et mesure le ratio stéréo.
 */
const WORKLET_PROCESSOR_CODE = `
class SiratVocalIsolatorProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {
        name: "isolationStrength",
        defaultValue: 0.0,
        minValue: 0.0,
        maxValue: 1.0,
        automationRate: "k-rate",
      },
    ];
  }

  constructor() {
    super();
    this.lpMidL = 0;
    this.lpSide = 0;
    this.envMidVoice = 0.001;
    this.envSideVoice = 0.0001;
    this.envLowPad = 0.0001;
    this.frameCounter = 0;
    this.midEnergyAcc = 0;
    this.sideEnergyAcc = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    if (!input || input.length === 0 || !output || output.length === 0) {
      return true;
    }

    const inL = input[0];
    const inR = input.length > 1 ? input[1] : input[0];
    const outL = output[0];
    const outR = output.length > 1 ? output[1] : null;
    const len = inL.length;

    const strengthArr = parameters.isolationStrength;
    const strength = strengthArr && strengthArr.length > 0 ? strengthArr[0] : 0.0;

    // Filtre passe-bas ~220 Hz pour séparer les basses/accords graves du cœur des formants vocaux
    const lpCoeff = 0.032;
    const envCoeff = 0.015;
    const isStereo = input.length > 1;

    for (let i = 0; i < len; i++) {
      const l = inL[i];
      const r = inR[i];
      const mid = isStereo ? 0.5 * (l + r) : l;
      const side = isStereo ? 0.5 * (l - r) : 0.0;

      // Séparation basse fréquence (~220 Hz) vs cœur vocal
      this.lpMidL += lpCoeff * (mid - this.lpMidL);
      this.lpSide += lpCoeff * (side - this.lpSide);

      const midLow = this.lpMidL;
      const midVoice = mid - midLow;
      const sideVoice = side - this.lpSide;

      // Suivi des enveloppes RMS pour le masque spectral adaptatif
      const absMidV = Math.abs(midVoice);
      const absSideV = Math.abs(sideVoice);
      const absLowP = Math.abs(midLow);

      this.envMidVoice += envCoeff * (absMidV - this.envMidVoice);
      this.envSideVoice += envCoeff * (absSideV - this.envSideVoice);
      this.envLowPad += envCoeff * (absLowP - this.envLowPad);

      this.midEnergyAcc += absMidV;
      this.sideEnergyAcc += absSideV;

      if (strength <= 0.01) {
        outL[i] = l;
        if (outR) outR[i] = r;
        continue;
      }

      // Masque de Wiener vocal : atténue automatiquement les passages dominés par les instruments latéraux ou nappes basses
      const v2 = this.envMidVoice * this.envMidVoice;
      const s2 = this.envSideVoice * this.envSideVoice;
      const l2 = this.envLowPad * this.envLowPad;
      const rawMask = v2 / (v2 + 1.65 * s2 + 0.55 * l2 + 1e-8);
      const minFloor = 1.0 - 0.84 * strength;
      const wienerMask = Math.max(minFloor, Math.min(1.0, rawMask));

      // Suppression de la composante instrumentale latérale et des basses résiduelles
      const cleanLow = midLow * (1.0 - 0.88 * strength) * wienerMask;
      const cleanVoice = midVoice * wienerMask;
      const residualSide = side * (1.0 - 0.96 * strength);

      // Reconstruction douce avec limitation anti-saturation
      let isolatedL = cleanVoice + cleanLow + residualSide;
      let isolatedR = cleanVoice + cleanLow - residualSide;

      // Léger recentrage sur les deux canaux pour la clarté vocale
      const monoCore = cleanVoice + cleanLow;
      isolatedL = monoCore * (0.85 * strength) + isolatedL * (1.0 - 0.85 * strength);
      isolatedR = monoCore * (0.85 * strength) + isolatedR * (1.0 - 0.85 * strength);

      const mixedL = l * (1.0 - strength) + isolatedL * strength;
      const mixedR = r * (1.0 - strength) + isolatedR * strength;

      outL[i] = Math.max(-0.98, Math.min(0.98, mixedL));
      if (outR) {
        outR[i] = Math.max(-0.98, Math.min(0.98, mixedR));
      }
    }

    this.frameCounter += 1;
    if (this.frameCounter >= 48) {
      const ratio = this.sideEnergyAcc / (this.midEnergyAcc + 1e-6);
      try {
        this.port.postMessage({ sideRatio: ratio });
      } catch {
        // ignore
      }
      this.frameCounter = 0;
      this.midEnergyAcc = 0;
      this.sideEnergyAcc = 0;
    }

    return true;
  }
}

registerProcessor("${WORKLET_PROCESSOR_NAME}", SiratVocalIsolatorProcessor);
`;

/**
 * Vérifie si un élément média peut être traité sans blocage CORS par Web Audio API.
 * Empêche absolument qu'un flux cross-origin sans CORS ne devienne muet.
 */
export function canProcessMediaElementWithWebAudio(el: HTMLMediaElement): boolean {
  if (typeof window === "undefined") return false;
  const src = (el.currentSrc || el.src || "").trim();
  if (!src) return false;

  if (src.startsWith("blob:") || src.startsWith("data:") || src.startsWith("/")) {
    return true;
  }

  try {
    const parsed = new URL(src, window.location.href);
    if (parsed.origin === window.location.origin) {
      return true;
    }
    if (el.crossOrigin === "anonymous") {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

/**
 * Transforme une URL directe HTTP(S) externe (MP4/WebM/MP3) en URL proxifiée same-origin
 * compatible CORS afin que le filtrage audio Moises-style fonctionne sur les flux distants.
 * Laisse intactes les URLs locales (blob:, data:, same-origin) et les playlists HLS (.m3u8).
 */
export function getInstrumentRemovalPlayableUrl(rawUrl: string): string {
  if (!rawUrl || typeof window === "undefined") return rawUrl;
  const trimmed = rawUrl.trim();
  if (!trimmed) return rawUrl;

  if (
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("/")
  ) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed, window.location.href);
    if (parsed.origin === window.location.origin) {
      return trimmed;
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return trimmed;
    }
    // Ne pas casser les URLs relatives à l'intérieur des manifests HLS (.m3u8)
    if (/\.m3u8(\?|$)/i.test(parsed.pathname)) {
      return trimmed;
    }
    return `/api/media/stream-proxy?url=${encodeURIComponent(parsed.toString())}`;
  } catch {
    return trimmed;
  }
}

/**
 * Estime un biais initial d'après les métadonnées de la vidéo :
 * - Les récitations coraniques pures restent neutres (0.0) jusqu'à détection acoustique réelle.
 * - Les contenus mentionnant musique, nasheed avec instruments, générique, bande-son, etc.
 *   abaissent le seuil de déclenchement pour effacer les instruments dès la première note.
 */
function estimateMusicLikelihoodBias(hint?: MediaContentHint): number {
  if (!hint) return 0.15;
  const text = `${hint.title || ""} ${hint.description || ""} ${hint.channel || ""} ${(hint.categories || []).join(" ")}`.toLowerCase();

  const hasExplicitMusicHints =
    /\b(instrument|instruments|musique|music|soundtrack|ost|background music|nasheed|anachid|orchestra|piano|guitar|guitare|oud|violin|violon|drums|percussion|remix|beat|karaoke|générique)\b/i.test(
      text
    );
  if (hasExplicitMusicHints) {
    return 0.65;
  }

  const isPureQuranOrAdhan =
    /\b(coran|quran|tarawih|tajwid|récitation|recitation|haramain|sourate|surah|adhan|appel à la prière)\b/i.test(
      text
    ) && !/musique|instrument/i.test(text);
  if (isPureQuranOrAdhan) {
    return 0.0;
  }

  return 0.2;
}

async function ensureWorkletLoaded(ctx: AudioContext): Promise<boolean> {
  if (!ctx.audioWorklet || typeof Blob === "undefined" || typeof URL === "undefined") {
    return false;
  }
  if (registeredWorkletContexts.has(ctx)) {
    return true;
  }

  try {
    const blob = new Blob([WORKLET_PROCESSOR_CODE], { type: "application/javascript" });
    const blobUrl = URL.createObjectURL(blob);
    try {
      await ctx.audioWorklet.addModule(blobUrl);
      registeredWorkletContexts.add(ctx);
      return true;
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  } catch {
    return false;
  }
}

/**
 * Analyse le spectre FFT en temps réel et ajuste automatiquement l'intensité de suppression des instruments.
 */
function runAcousticInstrumentDetectionTick(pipeline: AttachedMediaPipeline) {
  const { context, analyser, subBassHp1, subBassHp2, lowMidDip, vocalPresence, cymbalHighShelf, workletNode } =
    pipeline;

  if (context.state !== "running") return;

  const binCount = analyser.frequencyBinCount;
  const freqData = new Uint8Array(binCount);
  analyser.getByteFrequencyData(freqData);

  const sampleRate = context.sampleRate || 48000;
  const hzPerBin = sampleRate / analyser.fftSize;

  let subBassSum = 0;
  let subBassCount = 0;
  let lowMidSum = 0;
  let lowMidCount = 0;
  let vocalSum = 0;
  let vocalCount = 0;
  let highPercSum = 0;
  let highPercCount = 0;

  for (let i = 1; i < binCount; i++) {
    const hz = i * hzPerBin;
    const val = freqData[i];
    if (hz >= 32 && hz <= 118) {
      subBassSum += val;
      subBassCount++;
    } else if (hz > 118 && hz <= 240) {
      lowMidSum += val;
      lowMidCount++;
    } else if (hz >= 280 && hz <= 3400) {
      vocalSum += val;
      vocalCount++;
    } else if (hz >= 5400 && hz <= 15000) {
      highPercSum += val;
      highPercCount++;
    }
  }

  const subBassAvg = subBassCount ? subBassSum / subBassCount : 0;
  const lowMidAvg = lowMidCount ? lowMidSum / lowMidCount : 0;
  const vocalAvg = vocalCount ? vocalSum / vocalCount : 0;
  const highPercAvg = highPercCount ? highPercSum / highPercCount : 0;
  const totalSignal = subBassAvg + lowMidAvg + vocalAvg + highPercAvg;

  // Ignorer le silence total pour éviter de faire osciller les filtres entre deux phrases
  if (totalSignal < 14) {
    return;
  }

  const subBassRatio = subBassAvg / (vocalAvg + 12);
  const lowMidRatio = lowMidAvg / (vocalAvg + 12);
  const highPercRatio = highPercAvg / (vocalAvg + 12);
  const stereoSide = pipeline.stereoSideRatio;

  // Score instantané d'activité instrumentale (0 -> 1)
  let instantScore = pipeline.musicLikelihoodBias * 0.45;
  if (stereoSide > 0.18) {
    instantScore += Math.min(0.65, (stereoSide - 0.18) * 1.45);
  }
  if (subBassRatio > 0.38) {
    instantScore += Math.min(0.55, (subBassRatio - 0.38) * 0.9);
  }
  if (lowMidRatio > 0.62) {
    instantScore += Math.min(0.35, (lowMidRatio - 0.62) * 0.6);
  }
  if (highPercRatio > 0.28) {
    instantScore += Math.min(0.4, (highPercRatio - 0.28) * 0.85);
  }

  const clampedScore = Math.max(0, Math.min(1, instantScore));

  // Attaque rapide dès qu'un instrument démarre, relâchement doux pour éviter les coupures
  const smoothing = clampedScore > pipeline.instrumentConfidence ? 0.35 : 0.08;
  pipeline.instrumentConfidence += smoothing * (clampedScore - pipeline.instrumentConfidence);

  const activeStrength =
    pipeline.instrumentConfidence >= 0.34
      ? Math.min(0.96, (pipeline.instrumentConfidence - 0.22) * 1.25)
      : 0;

  const now = context.currentTime;
  const rampEnd = now + 0.12;

  // 1. Coupure passe-haut 24 dB/oct : 20 Hz (transparent) -> 128 Hz (efface batterie, kicks et basses)
  const targetHpFreq = 20 + activeStrength * 108;
  subBassHp1.frequency.setTargetAtTime(targetHpFreq, now, 0.08);
  subBassHp2.frequency.setTargetAtTime(targetHpFreq, now, 0.08);

  // 2. Atténuation des nappes/accords bas-médiums (~190 Hz)
  lowMidDip.gain.setTargetAtTime(-7.5 * activeStrength, now, 0.08);

  // 3. Atténuation des cymbales / charlestons / synthés aigus (> 5,2 kHz)
  cymbalHighShelf.gain.setTargetAtTime(-11.5 * activeStrength, now, 0.08);

  // 4. Clarté et présence des formants vocaux (2,15 kHz)
  vocalPresence.gain.setTargetAtTime(2.6 * activeStrength, now, 0.08);

  // 5. Force de séparation Mid-Side & Wiener dans le processeur AudioWorklet
  if (workletNode) {
    const param = workletNode.parameters.get("isolationStrength");
    if (param) {
      param.linearRampToValueAtTime(activeStrength, rampEnd);
    }
  } else if (pipeline.fallbackDryGain && pipeline.fallbackMidGain) {
    pipeline.fallbackDryGain.gain.setTargetAtTime(1 - activeStrength, now, 0.08);
    pipeline.fallbackMidGain.gain.setTargetAtTime(activeStrength, now, 0.08);
  }
}

/**
 * Attache automatiquement le moteur d'extraction vocale / suppression des instruments
 * à un élément <video> ou <audio>, sans aucune intervention utilisateur.
 * Retourne une fonction de nettoyage sûre.
 */
export function attachAutomaticInstrumentRemoval(
  mediaElement: HTMLMediaElement | null | undefined,
  hint?: MediaContentHint
): () => void {
  if (typeof window === "undefined" || !mediaElement) {
    return () => {};
  }

  const existing = attachedMediaMap.get(mediaElement);
  if (existing) {
    existing.musicLikelihoodBias = estimateMusicLikelihoodBias(hint);
    if (existing.context.state === "suspended") {
      existing.context.resume().catch(() => {});
    }
    return () => {};
  }

  let disposed = false;
  let activeCleanup: (() => void) | null = null;

  const tryInitialize = async () => {
    if (disposed || attachedMediaMap.has(mediaElement)) return;
    if (!canProcessMediaElementWithWebAudio(mediaElement)) {
      return;
    }

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    try {
      const ctx = new AudioCtx();
      if (ctx.state === "suspended") {
        await ctx.resume().catch(() => {});
      }
      if (disposed) {
        ctx.close().catch(() => {});
        return;
      }

      const source = ctx.createMediaElementSource(mediaElement);

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.72;

      const subBassHp1 = ctx.createBiquadFilter();
      subBassHp1.type = "highpass";
      subBassHp1.frequency.value = 20;
      subBassHp1.Q.value = 0.707;

      const subBassHp2 = ctx.createBiquadFilter();
      subBassHp2.type = "highpass";
      subBassHp2.frequency.value = 20;
      subBassHp2.Q.value = 0.707;

      const lowMidDip = ctx.createBiquadFilter();
      lowMidDip.type = "peaking";
      lowMidDip.frequency.value = 190;
      lowMidDip.Q.value = 1.1;
      lowMidDip.gain.value = 0;

      const vocalPresence = ctx.createBiquadFilter();
      vocalPresence.type = "peaking";
      vocalPresence.frequency.value = 2150;
      vocalPresence.Q.value = 1.05;
      vocalPresence.gain.value = 0;

      const cymbalHighShelf = ctx.createBiquadFilter();
      cymbalHighShelf.type = "highshelf";
      cymbalHighShelf.frequency.value = 5200;
      cymbalHighShelf.gain.value = 0;

      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -18;
      compressor.knee.value = 12;
      compressor.ratio.value = 2.6;
      compressor.attack.value = 0.006;
      compressor.release.value = 0.14;

      const workletReady = await ensureWorkletLoaded(ctx);
      if (disposed) {
        ctx.close().catch(() => {});
        return;
      }

      let workletNode: AudioWorkletNode | null = null;
      let fallbackDryGain: GainNode | null = null;
      let fallbackMidGain: GainNode | null = null;

      source.connect(analyser);

      if (workletReady) {
        workletNode = new AudioWorkletNode(ctx, WORKLET_PROCESSOR_NAME, {
          numberOfInputs: 1,
          numberOfOutputs: 1,
          outputChannelCount: [2],
        });
        source.connect(workletNode);
        workletNode.connect(subBassHp1);
      } else {
        // Fallback Web Audio : matrice Mid (L+R) vs Dry
        const splitter = ctx.createChannelSplitter(2);
        const midBus = ctx.createGain();
        midBus.gain.value = 0.5;
        const merger = ctx.createChannelMerger(2);

        fallbackDryGain = ctx.createGain();
        fallbackDryGain.gain.value = 1;

        fallbackMidGain = ctx.createGain();
        fallbackMidGain.gain.value = 0;

        source.connect(fallbackDryGain);
        fallbackDryGain.connect(subBassHp1);

        source.connect(splitter);
        splitter.connect(midBus, 0);
        splitter.connect(midBus, 1);
        midBus.connect(merger, 0, 0);
        midBus.connect(merger, 0, 1);
        merger.connect(fallbackMidGain);
        fallbackMidGain.connect(subBassHp1);
      }

      subBassHp1.connect(subBassHp2);
      subBassHp2.connect(lowMidDip);
      lowMidDip.connect(vocalPresence);
      vocalPresence.connect(cymbalHighShelf);
      cymbalHighShelf.connect(compressor);
      compressor.connect(ctx.destination);

      const pipeline: AttachedMediaPipeline = {
        context: ctx,
        source,
        analyser,
        subBassHp1,
        subBassHp2,
        lowMidDip,
        vocalPresence,
        cymbalHighShelf,
        compressor,
        workletNode,
        fallbackDryGain,
        fallbackMidGain,
        musicLikelihoodBias: estimateMusicLikelihoodBias(hint),
        stereoSideRatio: 0,
        instrumentConfidence: 0,
        timerId: null,
        cleanupListeners: () => {},
      };

      if (workletNode) {
        workletNode.port.onmessage = (event) => {
          if (typeof event.data?.sideRatio === "number") {
            pipeline.stereoSideRatio = event.data.sideRatio;
          }
        };
      }

      const startLoop = () => {
        if (ctx.state === "suspended") {
          ctx.resume().catch(() => {});
        }
        if (pipeline.timerId === null) {
          pipeline.timerId = window.setInterval(() => {
            runAcousticInstrumentDetectionTick(pipeline);
          }, 120);
        }
      };

      const stopLoop = () => {
        if (pipeline.timerId !== null) {
          clearInterval(pipeline.timerId);
          pipeline.timerId = null;
        }
      };

      const onPlay = () => startLoop();
      const onPauseOrEnd = () => stopLoop();
      const onGesture = () => {
        if (ctx.state === "suspended" && !mediaElement.paused) {
          ctx.resume().catch(() => {});
        }
      };

      mediaElement.addEventListener("play", onPlay);
      mediaElement.addEventListener("playing", onPlay);
      mediaElement.addEventListener("pause", onPauseOrEnd);
      mediaElement.addEventListener("ended", onPauseOrEnd);
      window.addEventListener("pointerdown", onGesture, { passive: true });
      window.addEventListener("keydown", onGesture, { passive: true });

      pipeline.cleanupListeners = () => {
        stopLoop();
        mediaElement.removeEventListener("play", onPlay);
        mediaElement.removeEventListener("playing", onPlay);
        mediaElement.removeEventListener("pause", onPauseOrEnd);
        mediaElement.removeEventListener("ended", onPauseOrEnd);
        window.removeEventListener("pointerdown", onGesture);
        window.removeEventListener("keydown", onGesture);
      };

      attachedMediaMap.set(mediaElement, pipeline);

      if (!mediaElement.paused) {
        startLoop();
      }
    } catch (err) {
      console.debug("Automatic vocal isolation standby:", err);
    }
  };

  const onReadyOrPlay = () => {
    if (mediaElement.readyState >= 2 || canProcessMediaElementWithWebAudio(mediaElement)) {
      void tryInitialize();
    }
  };

  if (mediaElement.readyState >= 2 && canProcessMediaElementWithWebAudio(mediaElement)) {
    void tryInitialize();
  }

  mediaElement.addEventListener("loadeddata", onReadyOrPlay);
  mediaElement.addEventListener("canplay", onReadyOrPlay);
  mediaElement.addEventListener("play", onReadyOrPlay);

  activeCleanup = () => {
    disposed = true;
    mediaElement.removeEventListener("loadeddata", onReadyOrPlay);
    mediaElement.removeEventListener("canplay", onReadyOrPlay);
    mediaElement.removeEventListener("play", onReadyOrPlay);
    const p = attachedMediaMap.get(mediaElement);
    if (p) {
      if (p.timerId !== null) {
        clearInterval(p.timerId);
        p.timerId = null;
      }
    }
  };

  return activeCleanup;
}
