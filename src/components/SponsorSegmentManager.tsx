import React, { useState, useMemo, useEffect } from "react";
import {
  Shield,
  ShieldCheck,
  Zap,
  Plus,
  Trash2,
  Edit3,
  Clock,
  Target,
  Play,
  RotateCcw,
  Check,
  Search,
  SlidersHorizontal,
  X,
  AlertCircle,
  Sparkles,
  Layers,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { ContentItem, catalog as defaultCatalog } from "@/data/catalog";
import {
  DetectedSponsorSegment,
  getAllCustomOverrides,
  getCustomSegmentsForVideo,
  saveCustomSegmentsForVideo,
  resetCustomSegmentsForVideo,
  fetchSponsorSegments,
} from "@/lib/sponsorDetectionService";

interface SponsorSegmentManagerProps {
  mode?: "in-player" | "studio";
  initialItem?: ContentItem;
  catalog?: ContentItem[];
  currentTimeSec?: number;
  durationSec?: number;
  onSeekTo?: (sec: number) => void;
  onPlayVideo?: (item: ContentItem) => void;
  onClose?: () => void;
}

export default function SponsorSegmentManager({
  mode = "studio",
  initialItem,
  catalog = defaultCatalog,
  currentTimeSec = 0,
  durationSec = 0,
  onSeekTo,
  onPlayVideo,
  onClose,
}: SponsorSegmentManagerProps) {
  // Selected video
  const [selectedVideoId, setSelectedVideoId] = useState<string>(
    initialItem?.youtubeId || initialItem?.id || defaultCatalog[0]?.youtubeId || "fuX7BViVyno"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChannel, setSelectedChannel] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Active editable segments for the selected video
  const [editingSegments, setEditingSegments] = useState<DetectedSponsorSegment[]>([]);

  // Find the selected ContentItem object
  const currentItem = useMemo(() => {
    return catalog.find((c) => (c.youtubeId || c.id) === selectedVideoId) || initialItem || catalog[0];
  }, [catalog, selectedVideoId, initialItem]);

  // Load segments whenever selected video changes
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const videoKey = currentItem?.youtubeId || currentItem?.id;
    if (!videoKey) {
      setLoading(false);
      return;
    }

    // Check custom overrides first
    const custom = getCustomSegmentsForVideo(videoKey);
    if (custom && custom.length > 0) {
      setEditingSegments(JSON.parse(JSON.stringify(custom)));
      setLoading(false);
      return;
    }

    // Fallback: fetch from service (catalog / sponsorblock / gemini)
    fetchSponsorSegments(currentItem, durationSec || 600)
      .then((segs) => {
        if (!cancelled) {
          setEditingSegments(JSON.parse(JSON.stringify(segs || [])));
        }
      })
      .catch((e) => console.warn("Failed to load segments:", e))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentItem, durationSec]);

  // Format seconds to mm:ss
  const formatTime = (seconds: number) => {
    const s = Math.max(0, Math.floor(seconds));
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}:${rem.toString().padStart(2, "0")}`;
  };

  // Adjust timing helper
  const adjustTiming = (index: number, field: "start" | "end", delta: number) => {
    setEditingSegments((prev) => {
      const next = [...prev];
      if (!next[index]) return prev;
      const currentVal = next[index][field];
      const maxVal = durationSec > 0 ? durationSec : 3600;
      const newVal = Math.max(0, Math.min(maxVal, Math.round((currentVal + delta) * 10) / 10));

      if (field === "start" && newVal >= next[index].end) {
        next[index].start = newVal;
        next[index].end = newVal + 15;
      } else if (field === "end" && newVal <= next[index].start) {
        next[index].end = Math.max(next[index].start + 5, newVal);
      } else {
        next[index][field] = newVal;
      }
      return next;
    });
  };

  // Set timing to current playback position
  const setTimingToCurrentTime = (index: number, field: "start" | "end") => {
    const roundedCur = Math.max(0, Math.round(currentTimeSec * 10) / 10);
    setEditingSegments((prev) => {
      const next = [...prev];
      if (!next[index]) return prev;
      if (field === "start") {
        next[index].start = roundedCur;
        if (next[index].end <= roundedCur) {
          next[index].end = roundedCur + 25;
        }
      } else {
        next[index].end = Math.max(roundedCur, next[index].start + 2);
      }
      return next;
    });
  };

  // Add a new segment
  const handleAddNewSegment = () => {
    const start = Math.max(0, Math.floor(currentTimeSec));
    const end = start + 30;
    const newSeg: DetectedSponsorSegment = {
      start,
      end,
      label: "Passer la pub créateur",
      type: "sponsor",
      sponsorName: "Sponsor créateur",
      confidence: 1.0,
      source: "manual",
    };
    setEditingSegments((prev) => [...prev, newSeg].sort((a, b) => a.start - b.start));
  };

  // Remove a segment
  const handleRemoveSegment = (index: number) => {
    setEditingSegments((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Save changes
  const handleSaveSegments = () => {
    const videoKey = currentItem?.youtubeId || currentItem?.id;
    if (!videoKey) return;

    // Validate segments
    const valid = editingSegments
      .filter((s) => s.end > s.start)
      .sort((a, b) => a.start - b.start);

    saveCustomSegmentsForVideo(videoKey, valid);
    setEditingSegments(valid);
    setSaveSuccessMsg(`✅ Timestamps enregistrés pour "${currentItem.title}" !`);
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  // Reset to default
  const handleResetToDefault = () => {
    const videoKey = currentItem?.youtubeId || currentItem?.id;
    if (!videoKey) return;

    resetCustomSegmentsForVideo(videoKey);
    const catSegs = currentItem.skipSegments
      ? currentItem.skipSegments.map((s) => ({
          start: s.start,
          end: s.end,
          label: s.label || "Passer la pub créateur",
          type: s.type || "sponsor",
          sponsorName: s.label?.replace("Passer le sponsor ", "") || "Pub créateur",
          confidence: 0.95,
          source: "creator_database" as const,
        }))
      : [];
    setEditingSegments(catSegs);
    setSaveSuccessMsg(`🔄 Timestamps réinitialisés aux valeurs d'origine.`);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // Filtered catalog for studio selector
  const filteredCatalog = useMemo(() => {
    return catalog.filter((item) => {
      const matchQuery =
        !searchQuery ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.channel.toLowerCase().includes(searchQuery.toLowerCase());
      const matchChannel = selectedChannel === "all" || item.channel === selectedChannel;
      return matchQuery && matchChannel;
    });
  }, [catalog, searchQuery, selectedChannel]);

  // Unique channel list
  const channelList = useMemo(() => {
    const set = new Set<string>();
    catalog.forEach((c) => {
      if (c.channel) set.add(c.channel);
    });
    return Array.from(set);
  }, [catalog]);

  return (
    <div
      className={`flex flex-col text-zinc-100 font-sans ${
        mode === "in-player"
          ? "w-full max-w-2xl bg-zinc-950/95 backdrop-blur-2xl border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4"
          : "space-y-6 w-full"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-zinc-950 font-bold shadow-md shadow-amber-500/20">
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                <span>Gestionnaire Anti-Pub & Timestamps</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono font-bold">
                  GEMINI IA & CRÉATEURS
                </span>
              </h3>
            </div>
            <p className="text-xs text-zinc-400">
              {mode === "in-player"
                ? `Calibrez les secondes exactes de début et fin de publicité pour "${currentItem?.title}".`
                : "Ajustez, ajoutez ou supprimez les timestamps de publicité sur l'ensemble du catalogue."}
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Success Notification */}
      {saveSuccessMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <Check size={16} />
            <span>{saveSuccessMsg}</span>
          </div>
        </div>
      )}

      {/* Studio Video Selector (Only in Studio mode) */}
      {mode === "studio" && (
        <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Rechercher une vidéo par titre ou créateur (ex: Yacine, Narro, Salomon)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={selectedChannel}
                onChange={(e) => setSelectedChannel(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="all">Tous les créateurs</option>
                {channelList.map((ch) => (
                  <option key={ch} value={ch}>
                    {ch}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Video Pick List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
            {filteredCatalog.map((v) => {
              const vKey = v.youtubeId || v.id;
              const isSelected = vKey === selectedVideoId;
              const hasSegments = v.skipSegments && v.skipSegments.length > 0;
              return (
                <button
                  key={v.id}
                  onClick={() => setSelectedVideoId(vKey)}
                  className={`text-left p-2.5 rounded-xl border flex items-center gap-2.5 transition-all cursor-pointer ${
                    isSelected
                      ? "bg-amber-500/15 border-amber-500/60 shadow-sm"
                      : "bg-zinc-950 hover:bg-zinc-900 border-zinc-800/80"
                  }`}
                >
                  <img
                    src={v.thumbnail}
                    alt={v.title}
                    className="w-12 h-8 rounded object-cover flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold text-white truncate">{v.title}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[9px] text-amber-400 font-medium">{v.channel}</span>
                      {hasSegments && (
                        <span className="px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[8px] font-mono">
                          {v.skipSegments?.length} pub(s)
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Video Card & Timeline Overview */}
      <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={currentItem?.thumbnail}
              alt={currentItem?.title}
              className="w-14 h-9 rounded-lg object-cover flex-shrink-0 border border-zinc-800"
            />
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-white truncate">{currentItem?.title}</h4>
              <p className="text-xs text-zinc-400 flex items-center gap-2">
                <span className="text-amber-400 font-semibold">{currentItem?.channel}</span>
                <span>· Durée : {currentItem?.duration || "15:00"}</span>
                {currentTimeSec > 0 && (
                  <span className="text-emerald-400 font-mono font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Position actuelle : {formatTime(currentTimeSec)} ({Math.floor(currentTimeSec)}s)
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleAddNewSegment}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-transform active:scale-95"
            >
              <Plus size={14} />
              <span>Ajouter une pub</span>
            </button>
          </div>
        </div>

        {/* Visual Timeline Bar with Segments */}
        <div className="pt-2">
          <div className="text-[10px] text-zinc-400 mb-1.5 flex justify-between">
            <span>Aperçu de la timeline (Segments de publicité en ambre)</span>
            <span>{editingSegments.length} segment(s) configuré(s)</span>
          </div>
          <div className="relative w-full h-3 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
            {/* Playhead position */}
            {durationSec > 0 && currentTimeSec > 0 && (
              <div
                className="absolute top-0 bottom-0 w-1 bg-white z-20 shadow-[0_0_8px_white]"
                style={{ left: `${Math.min(100, (currentTimeSec / durationSec) * 100)}%` }}
                title={`Position actuelle: ${formatTime(currentTimeSec)}`}
              />
            )}
            {/* Segments */}
            {editingSegments.map((seg, idx) => {
              const maxD = durationSec > 0 ? durationSec : 600;
              const leftPct = Math.max(0, Math.min(100, (seg.start / maxD) * 100));
              const widthPct = Math.max(1, Math.min(100 - leftPct, ((seg.end - seg.start) / maxD) * 100));
              return (
                <div
                  key={idx}
                  className="absolute top-0 bottom-0 bg-amber-400 border border-amber-200 z-10"
                  style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                  title={`${seg.label || "Pub"} (${formatTime(seg.start)} - ${formatTime(seg.end)})`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Segments List & Precise Calibration Controls */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <SlidersHorizontal size={13} className="text-amber-400" />
            <span>Minutage et Timestamps Précis</span>
          </span>
          <span className="text-[11px] text-zinc-500">
            Ajustez à la seconde exacte pour éliminer tout décalage
          </span>
        </div>

        {editingSegments.length === 0 ? (
          <div className="p-8 rounded-2xl bg-zinc-900/60 border border-dashed border-zinc-800 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
              <Shield size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-300">Aucun segment publicitaire configuré</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Cette vidéo n'a pas de coupure publicitaire ou n'a pas encore été analysée.
              </p>
            </div>
            <button
              onClick={handleAddNewSegment}
              className="px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-amber-500/30 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
            >
              <Plus size={14} />
              <span>Créer un premier timestamp</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {editingSegments.map((seg, idx) => {
              const segDuration = Math.max(0, Math.round((seg.end - seg.start) * 10) / 10);
              return (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 space-y-3 transition-colors shadow-sm"
                >
                  {/* Segment Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-2.5">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <input
                        type="text"
                        value={seg.label}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditingSegments((prev) => {
                            const next = [...prev];
                            next[idx].label = val;
                            return next;
                          });
                        }}
                        placeholder="Libellé du segment (ex: Passer le sponsor)"
                        className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-white font-semibold flex-1 focus:outline-none focus:border-amber-500"
                      />
                      <select
                        value={seg.type}
                        onChange={(e) => {
                          const val = e.target.value as "sponsor" | "intro" | "promo";
                          setEditingSegments((prev) => {
                            const next = [...prev];
                            next[idx].type = val;
                            return next;
                          });
                        }}
                        className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-[11px] text-zinc-300 focus:outline-none"
                      >
                        <option value="sponsor">Sponsor / Pub créateur</option>
                        <option value="intro">Introduction / Générique</option>
                        <option value="promo">Auto-promo / Appel aux dons</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        Durée : {segDuration}s
                      </span>
                      {onSeekTo && (
                        <button
                          type="button"
                          onClick={() => onSeekTo(Math.max(0, seg.start - 2))}
                          className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-emerald-600 text-zinc-300 hover:text-white text-[11px] font-semibold flex items-center gap-1 transition-colors"
                          title="Tester le saut automatique (se place 2s avant)"
                        >
                          <Play size={11} />
                          <span>Tester</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveSegment(idx)}
                        className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white flex items-center justify-center transition-colors"
                        title="Supprimer ce segment"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Calibration Steppers for Start & End */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* START TIMESTAMP CALIBRATION */}
                    <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-zinc-400 flex items-center gap-1">
                          <Clock size={12} className="text-amber-400" />
                          <span>Début de la publicité</span>
                        </span>
                        <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-white bg-zinc-900 px-2 py-0.5 rounded border border-zinc-700">
                          <span>{formatTime(seg.start)}</span>
                          <span className="text-zinc-500">({seg.start}s)</span>
                        </div>
                      </div>

                      {/* Steppers */}
                      <div className="flex items-center justify-between gap-1 flex-wrap">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => adjustTiming(idx, "start", -5)}
                            className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-[10px] font-bold"
                          >
                            -5s
                          </button>
                          <button
                            type="button"
                            onClick={() => adjustTiming(idx, "start", -1)}
                            className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-[10px] font-bold"
                          >
                            -1s
                          </button>
                          <button
                            type="button"
                            onClick={() => adjustTiming(idx, "start", 1)}
                            className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-[10px] font-bold"
                          >
                            +1s
                          </button>
                          <button
                            type="button"
                            onClick={() => adjustTiming(idx, "start", 5)}
                            className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-[10px] font-bold"
                          >
                            +5s
                          </button>
                        </div>

                        {currentTimeSec > 0 && (
                          <button
                            type="button"
                            onClick={() => setTimingToCurrentTime(idx, "start")}
                            className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-zinc-950 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1 transition-colors"
                            title="Prendre la position actuelle de la vidéo"
                          >
                            <Target size={11} />
                            <span>= Position ({formatTime(currentTimeSec)})</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* END TIMESTAMP CALIBRATION */}
                    <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-zinc-400 flex items-center gap-1">
                          <Clock size={12} className="text-emerald-400" />
                          <span>Fin de la pub (Reprise vidéo)</span>
                        </span>
                        <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-white bg-zinc-900 px-2 py-0.5 rounded border border-zinc-700">
                          <span>{formatTime(seg.end)}</span>
                          <span className="text-zinc-500">({seg.end}s)</span>
                        </div>
                      </div>

                      {/* Steppers */}
                      <div className="flex items-center justify-between gap-1 flex-wrap">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => adjustTiming(idx, "end", -5)}
                            className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-[10px] font-bold"
                          >
                            -5s
                          </button>
                          <button
                            type="button"
                            onClick={() => adjustTiming(idx, "end", -1)}
                            className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-[10px] font-bold"
                          >
                            -1s
                          </button>
                          <button
                            type="button"
                            onClick={() => adjustTiming(idx, "end", 1)}
                            className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-[10px] font-bold"
                          >
                            +1s
                          </button>
                          <button
                            type="button"
                            onClick={() => adjustTiming(idx, "end", 5)}
                            className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-[10px] font-bold"
                          >
                            +5s
                          </button>
                        </div>

                        {currentTimeSec > 0 && (
                          <button
                            type="button"
                            onClick={() => setTimingToCurrentTime(idx, "end")}
                            className="px-2 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-zinc-950 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1 transition-colors"
                            title="Prendre la position actuelle de la vidéo"
                          >
                            <Target size={11} />
                            <span>= Position ({formatTime(currentTimeSec)})</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-zinc-800">
        <button
          type="button"
          onClick={handleResetToDefault}
          className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs font-semibold flex items-center gap-2 border border-zinc-800 transition-colors w-full sm:w-auto justify-center"
        >
          <RotateCcw size={14} />
          <span>Réinitialiser par défaut</span>
        </button>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors flex-1 sm:flex-initial"
            >
              Fermer
            </button>
          )}

          <button
            type="button"
            onClick={handleSaveSegments}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all active:scale-95 flex-1 sm:flex-initial"
          >
            <Check size={16} />
            <span>Enregistrer les Timestamps</span>
          </button>
        </div>
      </div>
    </div>
  );
}
