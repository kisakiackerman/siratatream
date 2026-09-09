import { useState, useMemo, useEffect } from "react";
import {
  X,
  Sparkles,
  Plus,
  Edit3,
  Trash2,
  Check,
  Search,
  UploadCloud,
  DownloadCloud,
  Film,
  Play,
  RotateCcw,
  Tag,
  Star,
  Flame,
  Clock,
  Radio,
  Sliders,
  Send,
  Loader2,
  Wand2,
  ExternalLink,
  Info,
  Layers,
  ChevronRight,
  ShieldCheck,
  Copy,
  AlertCircle,
  Eye,
  CheckCircle2,
  ThumbsUp,
  Users,
  Video,
  FileDown,
  MonitorPlay,
  Tv,
  FolderPlus,
  UserPlus,
  RefreshCw,
  SlidersHorizontal,
  Code,
  Terminal,
  Share2,
  Database,
  ArrowRight,
  HelpCircle,
  Maximize2,
  Volume2,
  Mail,
  MessageSquare,
  Inbox,
  MailOpen,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "@/hooks/useAuth";
import {
  useCreatorCatalog,
  type GlobalAnnouncement,
  type CustomChannelInfo,
} from "@/hooks/useCreatorCatalog";
import { useVideoSuggestions, VideoSuggestion } from "@/hooks/useVideoSuggestions";
import { useCreatorMessages, CreatorMessage } from "@/hooks/useCreatorMessages";
import { type ContentItem, type Category, type Channel } from "@/data/catalog";
import SponsorSegmentManager from "@/components/SponsorSegmentManager";

interface CreatorStudioModalProps {
  onClose: () => void;
  onPlayVideo?: (item: ContentItem) => void;
  initialTab?: StudioTab;
}

type StudioTab =
  | "ai-studio"
  | "catalog-editor"
  | "ad-manager"
  | "categories-channels"
  | "live-preview"
  | "suggestions"
  | "messages"
  | "announcements"
  | "spotlight"
  | "cloud-sync";

const PRESET_AI_PROMPTS = [
  {
    title: "Le Récit de Youssef (Joseph)",
    prompt: "Raconte la beauté du récit du Prophète Youssef (psl), les épreuves du puits, de la prison et sa noblesse morale.",
    category: "Prophètes",
  },
  {
    title: "Le Miracle de la Fente de la Lune",
    prompt: "Génère un épisode sur le miracle de la scission de la lune accordé au Prophète Muhammad (psl) à La Mecque.",
    category: "Miracles du Coran",
  },
  {
    title: "L'Arrivée de Bilal à Médine",
    prompt: "Un récit immersif sur la délivrance de Bilal ibn Rabah et le premier appel à la prière (Adhan).",
    category: "Compagnons",
  },
  {
    title: "Les Mystères de l'Âme (Rûh)",
    prompt: "Une réflexion spirituelle et coranique sur la création de l'âme et le monde invisible.",
    category: "Histoire & Mystère",
  },
];

export default function CreatorStudioModal({ onClose, onPlayVideo, initialTab }: CreatorStudioModalProps) {
  const { user, firebaseUser, isCreator } = useAuth();
  const {
    catalog,
    allCatalogIncludingDeleted,
    customItems,
    deletedVideoIds,
    customCategories,
    customChannels,
    allActiveCategories,
    allActiveChannels,
    addOrUpdateContent,
    deleteContent,
    restoreDeletedVideo,
    resetDeletedVideos,
    addCategory,
    removeCategory,
    addChannel,
    removeChannel,
    announcement,
    spotlightId,
    setAnnouncement,
    setSpotlightId,
    resetCatalogDefaults,
    exportBackup,
    importBackup,
  } = useCreatorCatalog();

  const {
    suggestions,
    deleteSuggestion,
    updateStatus: updateSuggestionStatus,
  } = useVideoSuggestions();

  const {
    messages: creatorMessages,
    unreadCount: creatorUnreadCount,
    markAsRead: markCreatorMsgAsRead,
    deleteMessage: deleteCreatorMsg,
  } = useCreatorMessages();

  const [activeTab, setActiveTab] = useState<StudioTab>(initialTab || "ai-studio");

  // AI Studio State (Google AI Studio Experience)
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiVideoUrlInput, setAiVideoUrlInput] = useState("");
  const [aiSelectedChannel, setAiSelectedChannel] = useState<string>("NARRO");
  const [aiSelectedCategory, setAiSelectedCategory] = useState<string>("Prophètes");
  const [aiTemperature, setAiTemperature] = useState(0.7);
  const [aiSystemInstruction, setAiSystemInstruction] = useState(
    "Tu es le Directeur Créatif & Spécialiste du Contenu SiratStream. Tu produis des fiches immersives, respectueuses et fidèles aux sources authentiques."
  );
  const [aiLoading, setAiLoading] = useState(false);
  const [aiGeneratedItem, setAiGeneratedItem] = useState<Partial<ContentItem> | null>(null);
  const [aiRawText, setAiRawText] = useState<string | null>(null);
  const [aiStatusMsg, setAiStatusMsg] = useState<string | null>(null);
  const [aiActivePreviewTab, setAiActivePreviewTab] = useState<"player" | "hero" | "card" | "json">("player");
  const [previewPlaying, setPreviewPlaying] = useState(false);

  // Dedicated Video Preview Modal for testing
  const [testVideoItem, setTestVideoItem] = useState<Partial<ContentItem> | null>(null);

  // Catalog Edit / Add Modal State
  const [editingItem, setEditingItem] = useState<Partial<ContentItem> | null>(null);
  const [isNewItemMode, setIsNewItemMode] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showDeletedModal, setShowDeletedModal] = useState(false);
  const [confirmResetAllDeleted, setConfirmResetAllDeleted] = useState(false);

  // Video Delete Confirmation & Toast State
  const [videoToDelete, setVideoToDelete] = useState<ContentItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteFeedback, setDeleteFeedback] = useState<{ message: string; id: string; title: string } | null>(null);

  // Delete Handlers
  const handleInitiateDelete = (item: ContentItem) => {
    setVideoToDelete(item);
  };

  const handleConfirmDelete = async () => {
    if (!videoToDelete) return;
    const target = videoToDelete;
    setIsDeleting(true);
    try {
      await deleteContent(target.id);
      setVideoToDelete(null);
      setDeleteFeedback({
        message: `La vidéo "${target.title}" a été supprimée du catalogue.`,
        id: target.id,
        title: target.title,
      });
      setTimeout(() => {
        setDeleteFeedback((prev) => (prev?.id === target.id ? null : prev));
      }, 7000);
    } catch (err) {
      console.error("Erreur suppression:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUndoDelete = async (id: string) => {
    await restoreDeletedVideo(id);
    setDeleteFeedback(null);
  };

  // New Category / Channel Forms
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newChannelForm, setNewChannelForm] = useState<CustomChannelInfo>({
    name: "",
    description: "",
    avatar: "",
  });
  const [channelSuccessNotice, setChannelSuccessNotice] = useState<string | null>(null);

  // Live Preview State
  const [previewItemId, setPreviewItemId] = useState<string | null>(null);
  const [livePublishNotice, setLivePublishNotice] = useState<string | null>(null);

  // Announcement State
  const [annForm, setAnnForm] = useState<GlobalAnnouncement>(
    announcement || {
      enabled: true,
      text: "✨ Nouvelle série disponible sur SiratStream !",
      subtext: "Explorez les récits authentiques et méditations en haute définition.",
      badge: "NOUVEAUTÉ",
      badgeColor: "emerald",
    }
  );
  const [annSavedAlert, setAnnSavedAlert] = useState(false);

  // Extract video ID or direct link helper
  const extractVideoInfo = (urlOrId: string): { videoId: string; videoUrl?: string; type: "youtube" | "direct" | "vimeo" | "dailymotion" } => {
    if (!urlOrId) return { videoId: "", type: "youtube" };
    const clean = urlOrId.trim();

    if (clean.includes("vimeo.com")) {
      const parts = clean.split("vimeo.com/");
      return { videoId: parts[1]?.split("?")[0] || clean, videoUrl: clean, type: "vimeo" };
    }
    if (clean.includes("dailymotion.com") || clean.includes("dai.ly")) {
      const parts = clean.includes("dai.ly/") ? clean.split("dai.ly/") : clean.split("video/");
      return { videoId: parts[1]?.split("?")[0] || clean, videoUrl: clean, type: "dailymotion" };
    }
    if (clean.endsWith(".mp4") || clean.endsWith(".webm") || clean.startsWith("blob:") || (clean.startsWith("http") && !clean.includes("youtu") && !clean.includes("vimeo"))) {
      return { videoId: `direct_${Date.now()}`, videoUrl: clean, type: "direct" };
    }
    if (clean.includes("youtube.com/watch?v=")) {
      return { videoId: clean.split("v=")[1]?.split("&")[0] || clean, type: "youtube" };
    }
    if (clean.includes("youtu.be/")) {
      return { videoId: clean.split("youtu.be/")[1]?.split("?")[0] || clean, type: "youtube" };
    }
    return { videoId: clean, type: "youtube" };
  };

  // Filtered catalog list
  const filteredCatalog = useMemo(() => {
    return catalog.filter((item) => {
      if (categoryFilter !== "all" && !item.categories.includes(categoryFilter as Category)) {
        return false;
      }
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.channel.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [catalog, categoryFilter, searchFilter]);

  // Deleted items lookup
  const deletedItemsList = useMemo(() => {
    return allCatalogIncludingDeleted.filter((item) => deletedVideoIds.includes(item.id));
  }, [allCatalogIncludingDeleted, deletedVideoIds]);

  // Spotlight Content Item for Live Preview
  const spotlightItem = useMemo(() => {
    return catalog.find((c) => c.id === spotlightId) || catalog.find((c) => c.featured) || catalog[0];
  }, [catalog, spotlightId]);

  // Currently inspected item in preview
  const currentPreviewItem = useMemo(() => {
    if (previewItemId) {
      return catalog.find((c) => c.id === previewItemId) || spotlightItem;
    }
    return spotlightItem;
  }, [previewItemId, catalog, spotlightItem]);

  // AI Studio Generation Action
  const handleAIGenerate = async (customPrompt?: string) => {
    const promptToUse = customPrompt || aiPrompt;
    if (!promptToUse.trim() && !aiVideoUrlInput.trim()) return;

    setAiLoading(true);
    setAiStatusMsg("✨ Google AI Studio génère le manifeste de contenu...");
    setAiRawText(null);
    setAiGeneratedItem(null);
    setPreviewPlaying(false);

    try {
      const response = await fetch("/api/creator/ai-studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-content",
          prompt: `${promptToUse} ${aiVideoUrlInput ? `(Lien vidéo : ${aiVideoUrlInput})` : ""}`,
        }),
      });

      const res = await response.json();
      if (res.success && res.data) {
        if (res.data.rawText) {
          setAiRawText(res.data.rawText);
        } else {
          const d = res.data;
          const fakeId = "custom-" + Date.now();
          const targetUrl = aiVideoUrlInput.trim() || d.youtubeId || "Xs26kdKEwlg";
          const parsedInfo = extractVideoInfo(targetUrl);

          const newItem: Partial<ContentItem> = {
            id: fakeId,
            youtubeId: parsedInfo.videoId,
            videoUrl: parsedInfo.videoUrl || (parsedInfo.type === "youtube" ? undefined : targetUrl),
            videoSourceType: parsedInfo.type,
            title: d.title || promptToUse,
            description: d.description || "",
            channel: (aiSelectedChannel || d.channel || "NARRO") as Channel,
            categories: aiSelectedCategory ? [aiSelectedCategory as Category] : (d.categories as Category[]) || ["Prophètes"],
            year: d.year || new Date().getFullYear(),
            rating: d.rating || "Tous publics",
            duration: d.duration || "18:30",
            score: d.score || 98,
            thumbnail: parsedInfo.type === "youtube"
              ? `https://i.ytimg.com/vi/${parsedInfo.videoId}/maxresdefault.jpg`
              : `https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop&q=80`,
            image: parsedInfo.type === "youtube"
              ? `https://i.ytimg.com/vi/${parsedInfo.videoId}/maxresdefault.jpg`
              : `https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop&q=80`,
            heroImage: parsedInfo.type === "youtube"
              ? `https://i.ytimg.com/vi/${parsedInfo.videoId}/maxresdefault.jpg`
              : `https://images.unsplash.com/photo-1542838132-92c53300491e?w=1600&auto=format&fit=crop&q=80`,
            featured: true,
            isNew: true,
            isTrending: true,
          };
          setAiGeneratedItem(newItem);
        }
        setAiStatusMsg("✅ Manifeste généré avec succès ! Vous pouvez tester la lecture ci-dessous avant d'ajouter.");
      } else {
        setAiStatusMsg("⚠️ Erreur de réponse de l'IA Studio.");
      }
    } catch (err: any) {
      setAiStatusMsg("Erreur réseau : " + err.message);
    } finally {
      setAiLoading(false);
    }
  };

  // Publish AI Generated item directly to catalog
  const handlePublishGeneratedItem = async () => {
    if (!aiGeneratedItem || !aiGeneratedItem.title) return;
    const parsed = extractVideoInfo(aiGeneratedItem.videoUrl || aiGeneratedItem.youtubeId || "Xs26kdKEwlg");

    const completeItem: ContentItem = {
      id: aiGeneratedItem.id || `custom-${Date.now()}`,
      youtubeId: parsed.videoId,
      videoUrl: parsed.videoUrl,
      videoSourceType: parsed.type,
      title: aiGeneratedItem.title,
      description: aiGeneratedItem.description || "",
      channel: (aiGeneratedItem.channel || "NARRO") as Channel,
      categories: (aiGeneratedItem.categories as Category[]) || ["Prophètes"],
      year: aiGeneratedItem.year || new Date().getFullYear(),
      rating: aiGeneratedItem.rating || "Tous publics",
      duration: aiGeneratedItem.duration || "18:00",
      score: aiGeneratedItem.score || 95,
      thumbnail: aiGeneratedItem.thumbnail || (parsed.type === "youtube" ? `https://i.ytimg.com/vi/${parsed.videoId}/maxresdefault.jpg` : `https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop&q=80`),
      image: aiGeneratedItem.image || (parsed.type === "youtube" ? `https://i.ytimg.com/vi/${parsed.videoId}/maxresdefault.jpg` : `https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop&q=80`),
      heroImage: aiGeneratedItem.heroImage || aiGeneratedItem.image,
      featured: Boolean(aiGeneratedItem.featured),
      isNew: Boolean(aiGeneratedItem.isNew),
      isTrending: Boolean(aiGeneratedItem.isTrending),
    };

    const res = await addOrUpdateContent(completeItem);
    if (res.success) {
      setAiStatusMsg("🚀 Vidéo validée et ajoutée au catalogue officiel SiratStream !");
      setAiGeneratedItem(null);
      setActiveTab("catalog-editor");
    } else {
      setAiStatusMsg("Erreur de publication : " + res.error);
    }
  };

  // Import community suggestion directly into AI Studio or add modal
  const handleImportSuggestionToAI = (suggestion: VideoSuggestion) => {
    setAiVideoUrlInput(suggestion.url);
    setAiPrompt(`Titre suggéré : ${suggestion.title}. Catégorie : ${suggestion.category}. ${suggestion.note ? `Note utilisateur : ${suggestion.note}` : ""}`);
    setAiSelectedCategory(suggestion.category || "Prophètes");
    setActiveTab("ai-studio");
    handleAIGenerate(`Titre suggéré : ${suggestion.title}. Catégorie : ${suggestion.category}. Notes: ${suggestion.note || ""}`);
  };

  const handleDirectAddSuggestion = (suggestion: VideoSuggestion) => {
    const parsed = extractVideoInfo(suggestion.url);
    setIsNewItemMode(true);
    setEditingItem({
      id: `custom-${Date.now()}`,
      title: suggestion.title,
      description: suggestion.note || `Suggéré par la communauté : ${suggestion.submittedBy}`,
      youtubeId: parsed.videoId,
      videoUrl: parsed.videoUrl || suggestion.url,
      videoSourceType: parsed.type,
      channel: "NARRO",
      categories: [suggestion.category ? (suggestion.category as Category) : "Prophètes"],
      duration: "18:00",
      year: new Date().getFullYear(),
      rating: "Tous publics",
      score: 96,
      featured: false,
      isNew: true,
    });
    setActiveTab("catalog-editor");
  };

  // Save edited or newly created item
  const handleSaveItem = async () => {
    if (!editingItem || !editingItem.title || (!editingItem.youtubeId && !editingItem.videoUrl)) {
      alert("Veuillez renseigner au moins le titre et un lien vidéo valide (YouTube, MP4 ou Vimeo).");
      return;
    }

    const rawInput = editingItem.videoUrl || editingItem.youtubeId || "";
    const parsed = extractVideoInfo(rawInput);

    const completeItem: ContentItem = {
      id: editingItem.id || `custom-${Date.now()}`,
      youtubeId: parsed.videoId,
      videoUrl: editingItem.videoUrl || parsed.videoUrl,
      videoSourceType: editingItem.videoSourceType || parsed.type,
      downloadUrl: editingItem.downloadUrl || (parsed.type === "direct" ? parsed.videoUrl : undefined),
      title: editingItem.title,
      description: editingItem.description || "",
      channel: (editingItem.channel || "NARRO") as Channel,
      categories: (editingItem.categories as Category[]) || ["Prophètes"],
      year: editingItem.year || new Date().getFullYear(),
      rating: editingItem.rating || "Tous publics",
      duration: editingItem.duration || "15:00",
      score: editingItem.score || 95,
      thumbnail: editingItem.thumbnail || (parsed.type === "youtube" ? `https://i.ytimg.com/vi/${parsed.videoId}/maxresdefault.jpg` : `https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop&q=80`),
      image: editingItem.image || (parsed.type === "youtube" ? `https://i.ytimg.com/vi/${parsed.videoId}/maxresdefault.jpg` : `https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop&q=80`),
      heroImage: editingItem.heroImage || editingItem.image,
      featured: Boolean(editingItem.featured),
      isNew: Boolean(editingItem.isNew),
      isTrending: Boolean(editingItem.isTrending),
    };

    const res = await addOrUpdateContent(completeItem);
    if (res.success) {
      setEditingItem(null);
      setIsNewItemMode(false);
      setPreviewItemId(completeItem.id);
    } else {
      alert("Erreur lors de la sauvegarde : " + res.error);
    }
  };

  // Video File Download / Export helper
  const handleExportVideo = (item: ContentItem) => {
    if (item.videoUrl && (item.videoUrl.endsWith(".mp4") || item.videoUrl.endsWith(".webm"))) {
      const a = document.createElement("a");
      a.href = item.videoUrl;
      a.download = `${item.title.replace(/[^a-zA-Z0-9-_]/g, "_")}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      const jsonStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(item, null, 2));
      const a = document.createElement("a");
      a.href = jsonStr;
      a.download = `${item.title.replace(/[^a-zA-Z0-9-_]/g, "_")}_manifest.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // Save Announcement
  const handleSaveAnnouncement = async () => {
    await setAnnouncement(annForm);
    setAnnSavedAlert(true);
    setTimeout(() => setAnnSavedAlert(false), 3000);
  };

  // Add Category Handler
  const handleAddCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    const res = await addCategory(newCategoryName.trim());
    if (res.success) {
      setNewCategoryName("");
      setChannelSuccessNotice(`✅ Catégorie « ${newCategoryName.trim()} » ajoutée avec succès !`);
      setTimeout(() => setChannelSuccessNotice(null), 3500);
    } else {
      alert(res.error || "Impossible d'ajouter cette catégorie.");
    }
  };

  // Add Channel Handler
  const handleAddChannelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelForm.name.trim()) return;
    const res = await addChannel({
      name: newChannelForm.name.trim(),
      description: newChannelForm.description?.trim() || "Créateur de contenu officiel SiratStream",
      avatar: newChannelForm.avatar?.trim() || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=100",
    });
    if (res.success) {
      setNewChannelForm({ name: "", description: "", avatar: "" });
      setChannelSuccessNotice(`✅ Chaîne / Créateur « ${newChannelForm.name.trim()} » créé avec succès !`);
      setTimeout(() => setChannelSuccessNotice(null), 3500);
    } else {
      alert(res.error || "Impossible d'ajouter cette chaîne.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-hidden">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/90 backdrop-blur-lg"
      />

      {/* Modal Dialog Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-7xl h-[94vh] liquid-glass-modal backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-zinc-100 font-sans"
      >
        {/* Top Google AI Studio Header Bar */}
        <div className="px-6 py-3.5 border-b border-white/10 bg-white/5 backdrop-blur-xl flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                  <span>Google AI Studio & Administration</span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full liquid-glass text-blue-300 border border-blue-400/30 font-mono font-bold">
                    GEMINI 2.5
                  </span>
                </h2>
              </div>
              <p className="text-[11px] text-zinc-300">
                Espace Super-Admin : <span className="text-emerald-300 font-medium">{firebaseUser?.email || user?.email || "kisakiackerman744@gmail.com"}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full liquid-glass border border-white/15 text-[11px] text-zinc-300 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>AI Studio Sandbox Ready</span>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full liquid-glass hover:bg-white/15 border border-white/20 text-zinc-300 hover:text-white flex items-center justify-center transition-all shadow-md"
              aria-label="Fermer le Studio"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 border-b border-white/10 bg-black/30 backdrop-blur-md flex items-center gap-1.5 overflow-x-auto shrink-0 scrollbar-none py-2">
          <button
            onClick={() => setActiveTab("ai-studio")}
            className={`flex items-center gap-2 py-1.5 px-3.5 text-xs font-semibold rounded-full transition-all whitespace-nowrap ${
              activeTab === "ai-studio"
                ? "liquid-glass text-blue-300 border border-blue-400/40 font-bold shadow-md"
                : "liquid-glass text-zinc-400 hover:text-white hover:bg-white/10 border border-white/10"
            }`}
          >
            <Wand2 size={15} className={activeTab === "ai-studio" ? "text-blue-300" : "text-zinc-400"} />
            <span>Contenu Assisté par IA (AI Studio)</span>
          </button>

          <button
            onClick={() => setActiveTab("catalog-editor")}
            className={`flex items-center gap-2 py-1.5 px-3.5 text-xs font-semibold rounded-full transition-all whitespace-nowrap ${
              activeTab === "catalog-editor"
                ? "liquid-glass-emerald text-emerald-200 border border-emerald-300/40 font-bold shadow-md"
                : "liquid-glass text-zinc-400 hover:text-white hover:bg-white/10 border border-white/10"
            }`}
          >
            <Film size={15} className={activeTab === "catalog-editor" ? "text-emerald-300" : "text-zinc-400"} />
            <span>Gestion des Vidéos</span>
            <span className="px-1.5 py-0.2 bg-white/10 text-white rounded-full text-[10px]">
              {catalog.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("ad-manager")}
            className={`flex items-center gap-2 py-1.5 px-3.5 text-xs font-semibold rounded-full transition-all whitespace-nowrap ${
              activeTab === "ad-manager"
                ? "liquid-glass text-amber-300 border border-amber-400/40 font-bold shadow-md"
                : "liquid-glass text-zinc-400 hover:text-white hover:bg-white/10 border border-white/10"
            }`}
          >
            <ShieldCheck size={15} className={activeTab === "ad-manager" ? "text-amber-300" : "text-zinc-400"} />
            <span>Anti-Pub & Timestamps Sponsors</span>
            <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded-full text-[9px] font-bold">
              IA & TIMINGS
            </span>
          </button>

          <button
            onClick={() => setActiveTab("categories-channels")}
            className={`flex items-center gap-2 py-1.5 px-3.5 text-xs font-semibold rounded-full transition-all whitespace-nowrap ${
              activeTab === "categories-channels"
                ? "liquid-glass text-amber-300 border border-amber-400/40 font-bold shadow-md"
                : "liquid-glass text-zinc-400 hover:text-white hover:bg-white/10 border border-white/10"
            }`}
          >
            <Layers size={15} className={activeTab === "categories-channels" ? "text-amber-300" : "text-zinc-400"} />
            <span>Catalogues, Chaînes & Créateurs</span>
            <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded-full text-[9px] font-bold">
              NOUVEAU
            </span>
          </button>

          <button
            onClick={() => setActiveTab("live-preview")}
            className={`flex items-center gap-2 py-1.5 px-3.5 text-xs font-semibold rounded-full transition-all whitespace-nowrap ${
              activeTab === "live-preview"
                ? "liquid-glass text-cyan-300 border border-cyan-400/40 font-bold shadow-md"
                : "liquid-glass text-zinc-400 hover:text-white hover:bg-white/10 border border-white/10"
            }`}
          >
            <Eye size={15} className={activeTab === "live-preview" ? "text-cyan-300" : "text-zinc-400"} />
            <span>Prévisualisation aistudio.google</span>
          </button>

          <button
            onClick={() => setActiveTab("suggestions")}
            className={`flex items-center gap-2 py-1.5 px-3.5 text-xs font-semibold rounded-full transition-all whitespace-nowrap ${
              activeTab === "suggestions"
                ? "liquid-glass text-amber-300 border border-amber-400/40 font-bold shadow-md"
                : "liquid-glass text-zinc-400 hover:text-white hover:bg-white/10 border border-white/10"
            }`}
          >
            <ThumbsUp size={15} className={activeTab === "suggestions" ? "text-amber-300" : "text-zinc-400"} />
            <span>Suggestion de l'utilisateur</span>
            {suggestions.length > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-500/30 text-amber-200 rounded-full text-[10px] font-bold">
                {suggestions.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("messages")}
            className={`flex items-center gap-2 py-1.5 px-3.5 text-xs font-semibold rounded-full transition-all whitespace-nowrap ${
              activeTab === "messages"
                ? "liquid-glass text-emerald-300 border border-emerald-400/40 font-bold shadow-md"
                : "liquid-glass text-zinc-400 hover:text-white hover:bg-white/10 border border-white/10"
            }`}
          >
            <Mail size={15} className={activeTab === "messages" ? "text-emerald-300" : "text-zinc-400"} />
            <span>Messages Reçus</span>
            {creatorUnreadCount > 0 && (
              <span className="px-1.5 py-0.2 bg-emerald-500 text-black rounded-full text-[10px] font-black animate-pulse">
                {creatorUnreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("announcements")}
            className={`flex items-center gap-2 py-1.5 px-3.5 text-xs font-semibold rounded-full transition-all whitespace-nowrap ${
              activeTab === "announcements"
                ? "liquid-glass text-sky-300 border border-sky-400/40 font-bold shadow-md"
                : "liquid-glass text-zinc-400 hover:text-white hover:bg-white/10 border border-white/10"
            }`}
          >
            <Radio size={15} className={activeTab === "announcements" ? "text-sky-300" : "text-zinc-400"} />
            <span>Flash Info</span>
          </button>

          <button
            onClick={() => setActiveTab("spotlight")}
            className={`flex items-center gap-2 py-1.5 px-3.5 text-xs font-semibold rounded-full transition-all whitespace-nowrap ${
              activeTab === "spotlight"
                ? "liquid-glass text-purple-300 border border-purple-400/40 font-bold shadow-md"
                : "liquid-glass text-zinc-400 hover:text-white hover:bg-white/10 border border-white/10"
            }`}
          >
            <Star size={15} className={activeTab === "spotlight" ? "text-purple-300" : "text-zinc-400"} />
            <span>Hero Banner</span>
          </button>

          <button
            onClick={() => setActiveTab("cloud-sync")}
            className={`flex items-center gap-2 py-1.5 px-3.5 text-xs font-semibold rounded-full transition-all whitespace-nowrap ${
              activeTab === "cloud-sync"
                ? "liquid-glass text-emerald-200 border border-emerald-300/40 font-bold shadow-md"
                : "liquid-glass text-zinc-400 hover:text-white hover:bg-white/10 border border-white/10"
            }`}
          >
            <UploadCloud size={15} className={activeTab === "cloud-sync" ? "text-emerald-300" : "text-zinc-400"} />
            <span>Sauvegarde</span>
          </button>
        </div>

        {/* Tab Contents Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* TAB 1: ASSISTANT IA STUDIO (AVEC LECTEUR VIDÉO INTÉGRÉ) */}
          {activeTab === "ai-studio" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto items-start">
              {/* Left Column: Prompt Input & Parameters */}
              <div className="lg:col-span-5 space-y-4">
                <div className="p-5 rounded-2xl liquid-glass-card border border-white/15 space-y-3.5 shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-300 flex items-center gap-1.5">
                      <Code size={14} />
                      <span>Paramètres IA Studio</span>
                    </span>
                    <span className="text-[10px] font-mono liquid-glass text-blue-300 border border-blue-400/30 px-2.5 py-0.5 rounded-full font-bold">
                      Structured Output: JSON
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-zinc-300">
                      Lien Vidéo à tester ou analyser (YouTube, MP4, Vimeo)
                    </label>
                    <input
                      type="text"
                      placeholder="https://www.youtube.com/watch?v=... ou https://.../video.mp4"
                      value={aiVideoUrlInput}
                      onChange={(e) => setAiVideoUrlInput(e.target.value)}
                      className="w-full bg-white/5 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-400 focus:bg-white/10 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-zinc-300">
                      Consigne / Prompt de création pour l'IA
                    </label>
                    <textarea
                      rows={3}
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="Ex: Raconte l'histoire du Prophète Youssef (psl), la sagesse morale et la fin heureuse..."
                      className="w-full bg-white/5 border border-white/15 rounded-xl p-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-400 focus:bg-white/10 transition-all resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-zinc-300">Catégorie cible</label>
                      <select
                        value={aiSelectedCategory}
                        onChange={(e) => setAiSelectedCategory(e.target.value)}
                        className="w-full bg-white/5 border border-white/15 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-blue-400"
                      >
                        {allActiveCategories.map((c) => (
                          <option key={c} value={c} className="bg-zinc-900 text-white">
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-zinc-300">Chaîne / Créateur</label>
                      <select
                        value={aiSelectedChannel}
                        onChange={(e) => setAiSelectedChannel(e.target.value)}
                        className="w-full bg-white/5 border border-white/15 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-blue-400"
                      >
                        {allActiveChannels.map((ch) => (
                          <option key={ch} value={ch} className="bg-zinc-900 text-white">
                            {ch}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-zinc-400">Exemples :</span>
                      {PRESET_AI_PROMPTS.slice(0, 2).map((p) => (
                        <button
                          key={p.title}
                          type="button"
                          onClick={() => {
                            setAiPrompt(p.prompt);
                            setAiSelectedCategory(p.category);
                            handleAIGenerate(p.prompt);
                          }}
                          className="px-2.5 py-1 rounded-full liquid-glass hover:bg-white/15 text-zinc-200 text-[10px] transition-all border border-white/10"
                        >
                          {p.title.split(" ")[2] || p.title}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => handleAIGenerate()}
                      disabled={aiLoading || (!aiPrompt.trim() && !aiVideoUrlInput.trim())}
                      className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs px-5 py-2.5 rounded-full shadow-lg shadow-blue-950/60 transition-all disabled:opacity-50 active:scale-95 border border-blue-400/30"
                    >
                      {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                      <span>{aiLoading ? "Génération..." : "Générer (Run)"}</span>
                    </button>
                  </div>
                </div>

                {aiStatusMsg && (
                  <div className="p-3.5 rounded-2xl liquid-glass border border-blue-400/30 text-xs text-blue-200 flex items-start gap-2 shadow-md">
                    <Info size={15} className="shrink-0 mt-0.5 text-blue-300" />
                    <span>{aiStatusMsg}</span>
                  </div>
                )}
              </div>

              {/* Right Column: Live Video Player & Generated Card Preview */}
              <div className="lg:col-span-7 space-y-4">
                {aiGeneratedItem ? (
                  <div className="bg-zinc-900 border border-blue-500/40 rounded-3xl p-5 space-y-4 shadow-2xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={18} className="text-emerald-400" />
                        <h4 className="font-bold text-white text-sm">
                          Aperçu & Lecteur Vidéo avant Publication
                        </h4>
                      </div>
                      <span className="text-[11px] px-2.5 py-1 bg-blue-500/20 text-blue-300 rounded-lg font-semibold border border-blue-500/30">
                        {aiGeneratedItem.categories?.[0] || "Prophètes"}
                      </span>
                    </div>

                    {/* LIVE INTERACTIVE VIDEO PLAYER */}
                    <div className="relative rounded-2xl overflow-hidden bg-black aspect-video border border-zinc-800 shadow-inner group">
                      {aiGeneratedItem.videoSourceType === "direct" && aiGeneratedItem.videoUrl ? (
                        <video
                          src={aiGeneratedItem.videoUrl}
                          controls
                          playsInline
                          className="w-full h-full object-contain"
                          poster={aiGeneratedItem.thumbnail || aiGeneratedItem.image}
                        />
                      ) : aiGeneratedItem.videoSourceType === "vimeo" && aiGeneratedItem.youtubeId ? (
                        <iframe
                          src={`https://player.vimeo.com/video/${aiGeneratedItem.youtubeId}?autoplay=0`}
                          className="w-full h-full border-0"
                          allow="autoplay; fullscreen; picture-in-picture"
                          allowFullScreen
                        />
                      ) : (
                        <iframe
                          src={`https://www.youtube-nocookie.com/embed/${aiGeneratedItem.youtubeId || "Xs26kdKEwlg"}?autoplay=0&rel=0&modestbranding=1&enablejsapi=1`}
                          className="w-full h-full border-0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                          title={aiGeneratedItem.title}
                        />
                      )}
                    </div>

                    {/* Video Metadata Inspector */}
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-bold text-white text-base leading-snug">
                          {aiGeneratedItem.title}
                        </h3>
                        <span className="text-xs text-emerald-400 font-bold px-2 py-0.5 bg-emerald-500/10 rounded">
                          {aiGeneratedItem.score}% Match
                        </span>
                      </div>

                      <p className="text-xs text-zinc-300 leading-relaxed line-clamp-3">
                        {aiGeneratedItem.description}
                      </p>

                      <div className="flex items-center gap-4 text-[11px] text-zinc-400 pt-2 border-t border-zinc-800/80">
                        <span>Chaîne : <strong className="text-zinc-200">{aiGeneratedItem.channel}</strong></span>
                        <span>Durée : <strong className="text-zinc-200">{aiGeneratedItem.duration}</strong></span>
                        <span>Source : <strong className="text-blue-300 uppercase">{aiGeneratedItem.videoSourceType || "YouTube"}</strong></span>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center justify-between gap-3 pt-3 border-t border-zinc-800">
                      <button
                        onClick={() => {
                          if (onPlayVideo && aiGeneratedItem) {
                            onPlayVideo(aiGeneratedItem as ContentItem);
                          }
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition-colors"
                      >
                        <Maximize2 size={14} />
                        <span>Plein Écran</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setAiGeneratedItem(null)}
                          className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-colors"
                        >
                          Réinitialiser
                        </button>

                        <button
                          onClick={handlePublishGeneratedItem}
                          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/60 transition-all active:scale-95"
                        >
                          <Check size={16} />
                          <span>Valider & Ajouter au Catalogue</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full min-h-[340px] rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/40 flex flex-col items-center justify-center p-8 text-center space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-zinc-900 flex items-center justify-center text-zinc-600 border border-zinc-800">
                      <MonitorPlay size={28} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm text-zinc-300">Lecteur de Test Prêt</h4>
                      <p className="text-xs text-zinc-500 max-w-sm">
                        Collez un lien vidéo ou saisissez une consigne à gauche pour générer et tester la lecture en direct avec l'assistant Google AI Studio.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: CATALOG EDITOR & VIDEO MANAGEMENT (SUPPRESSION DE N'IMPORTE QUELLE VIDÉO) */}
          {activeTab === "catalog-editor" && (
            <div className="space-y-6">
              {/* Deletion Toast Feedback with Undo */}
              {deleteFeedback && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-zinc-100 text-xs flex items-center justify-between gap-3 shadow-lg shadow-rose-950/30"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                      <Trash2 size={14} />
                    </div>
                    <span className="font-medium text-rose-200">{deleteFeedback.message}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleUndoDelete(deleteFeedback.id)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-300 hover:text-amber-200 font-bold transition-colors flex items-center gap-1.5"
                    >
                      <RotateCcw size={12} />
                      <span>Annuler / Restaurer</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteFeedback(null)}
                      className="text-zinc-400 hover:text-white p-1"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Action and Filter bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <div className="relative flex-1 max-w-md">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Rechercher une vidéo du catalogue..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/15 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-400 focus:bg-white/10 transition-all shadow-sm"
                    />
                  </div>

                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-3.5 py-2.5 bg-white/5 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-400 shadow-sm"
                  >
                    <option value="all" className="bg-zinc-900 text-white">Toutes les catégories ({catalog.length})</option>
                    {allActiveCategories.map((c) => (
                      <option key={c} value={c} className="bg-zinc-900 text-white">
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2.5">
                  {deletedVideoIds.length > 0 && (
                    <button
                      onClick={() => setShowDeletedModal(true)}
                      className="flex items-center gap-1.5 px-3.5 py-2.5 liquid-glass hover:bg-white/15 border border-white/15 text-amber-300 rounded-full text-xs font-semibold transition-all shadow-sm"
                      title="Voir les vidéos supprimées"
                    >
                      <RotateCcw size={14} />
                      <span>{deletedVideoIds.length} masquée{deletedVideoIds.length > 1 ? "s" : ""}</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setIsNewItemMode(true);
                      setEditingItem({
                        id: `custom-${Date.now()}`,
                        title: "",
                        description: "",
                        youtubeId: "",
                        videoUrl: "",
                        videoSourceType: "youtube",
                        channel: "NARRO",
                        categories: ["Prophètes"],
                        duration: "15:00",
                        year: new Date().getFullYear(),
                        rating: "Tous publics",
                        score: 95,
                        featured: false,
                        isNew: true,
                      });
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 liquid-glass-emerald border border-emerald-400/40 text-emerald-200 rounded-full text-xs font-bold shadow-lg shadow-emerald-950/40 hover:bg-emerald-400/25 transition-all active:scale-95"
                  >
                    <Plus size={15} />
                    <span>Ajouter une Vidéo</span>
                  </button>
                </div>
              </div>

              {/* Videos Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCatalog.map((item) => {
                  const isCustom = customItems.some((c) => c.id === item.id);
                  const isSpotlight = spotlightId === item.id;

                  return (
                    <div
                      key={item.id}
                      className="liquid-glass-card border border-white/15 hover:border-white/30 rounded-2xl p-4 flex flex-col justify-between gap-3 group transition-all shadow-md"
                    >
                      <div className="space-y-2.5">
                        <div className="relative rounded-xl overflow-hidden aspect-video bg-zinc-950">
                          <img
                            src={item.image}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://i.ytimg.com/vi/${item.youtubeId}/hqdefault.jpg`;
                            }}
                          />
                          <div className="absolute top-2 left-2 flex items-center gap-1">
                            <span className="px-2 py-0.5 rounded-full liquid-glass text-[10px] font-bold text-white border border-white/20 shadow-sm">
                              {item.categories[0]}
                            </span>
                            {item.videoUrl && (
                              <span className="px-2 py-0.5 rounded-full liquid-glass-emerald text-emerald-200 text-[9px] font-black uppercase border border-emerald-400/30">
                                {item.videoSourceType || "MP4"}
                              </span>
                            )}
                          </div>
                          {isSpotlight && (
                            <div className="absolute top-2 right-2 liquid-glass border border-amber-400/40 text-amber-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-md">
                              <Star size={10} className="fill-current" />
                              <span>HERO</span>
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center justify-between text-[11px] text-zinc-400 pb-1">
                            <span>{item.channel}</span>
                            <span>{item.duration}</span>
                          </div>
                          <h3 className="font-bold text-sm text-white line-clamp-1 group-hover:text-emerald-300 transition-colors">
                            {item.title}
                          </h3>
                          <p className="text-xs text-zinc-400 line-clamp-2 mt-1">
                            {item.description}
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              if (onPlayVideo) onPlayVideo(item);
                            }}
                            className="p-2 rounded-xl liquid-glass hover:bg-white/15 border border-white/15 text-emerald-300 hover:text-emerald-200 text-xs transition-all shadow-sm"
                            title="Lire la vidéo"
                          >
                            <Play size={14} />
                          </button>

                          <button
                            onClick={() => handleExportVideo(item)}
                            className="p-2 rounded-xl liquid-glass hover:bg-white/15 border border-white/15 text-amber-300 hover:text-amber-200 text-xs transition-all shadow-sm"
                            title="Exporter la vidéo"
                          >
                            <DownloadCloud size={14} />
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setEditingItem(item);
                              setIsNewItemMode(false);
                            }}
                            className="p-2 rounded-xl liquid-glass hover:bg-white/15 border border-white/15 text-zinc-300 hover:text-white transition-all shadow-sm"
                            title="Modifier"
                          >
                            <Edit3 size={14} />
                          </button>

                          {/* Delete any video from catalog */}
                          <button
                            type="button"
                            onClick={() => handleInitiateDelete(item)}
                            className="p-2 rounded-xl liquid-glass hover:bg-rose-500/20 border border-white/15 text-zinc-400 hover:text-rose-400 transition-all shadow-sm"
                            title="Supprimer cette vidéo du catalogue"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB: GESTIONNAIRE ANTI-PUB & TIMESTAMPS SPONSOR */}
          {activeTab === "ad-manager" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-6xl mx-auto"
            >
              <SponsorSegmentManager
                mode="studio"
                catalog={catalog}
                onPlayVideo={onPlayVideo ? (item) => onPlayVideo(item) : undefined}
              />
            </motion.div>
          )}

          {/* TAB 3: GESTION DES CATALOGUES, CHAÎNES & CRÉATEURS */}
          {activeTab === "categories-channels" && (
            <div className="space-y-8 max-w-5xl mx-auto">
              {channelSuccessNotice && (
                <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                  <Check size={16} />
                  <span>{channelSuccessNotice}</span>
                </div>
              )}

              {/* 1. Catégories / Catalogues */}
              <div className="liquid-glass-card p-6 rounded-3xl border border-white/15 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="font-bold text-white text-base flex items-center gap-2">
                      <FolderPlus size={18} className="text-amber-300" />
                      <span>Gestion des Catalogues & Catégories</span>
                    </h3>
                    <p className="text-xs text-zinc-300">
                      Ajoutez de nouvelles catégories pour classer les vidéos sur toute la plateforme.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleAddCategorySubmit} className="flex gap-2 max-w-lg pt-1">
                  <input
                    type="text"
                    placeholder="Nom du nouveau catalogue (ex: Sira & Hadith, Jeunesse...)"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="flex-1 px-4 py-2.5 bg-white/5 border border-white/15 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 focus:bg-white/10 transition-all"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 liquid-glass border border-amber-400/40 text-amber-200 hover:bg-white/15 rounded-full text-xs font-bold transition-all shadow-md active:scale-95"
                  >
                    Ajouter
                  </button>
                </form>

                <div className="flex flex-wrap gap-2 pt-2">
                  {allActiveCategories.map((cat) => {
                    const isCustom = customCategories.includes(cat);
                    const count = catalog.filter((c) => c.categories.includes(cat as Category)).length;
                    return (
                      <div
                        key={cat}
                        className="px-3.5 py-1.5 rounded-full liquid-glass border border-white/15 flex items-center gap-2 text-xs font-semibold text-zinc-200 shadow-sm"
                      >
                        <span>{cat}</span>
                        <span className="text-[10px] text-zinc-400 px-1.5 py-0.2 bg-white/10 rounded-full font-bold">
                          {count}
                        </span>
                        {isCustom && (
                          <button
                            type="button"
                            onClick={() => removeCategory(cat)}
                            className="text-zinc-400 hover:text-rose-400 ml-1 transition-colors"
                            title="Supprimer la catégorie personnalisée"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. Chaînes & Créateurs */}
              <div className="liquid-glass-card p-6 rounded-3xl border border-white/15 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="font-bold text-white text-base flex items-center gap-2">
                      <UserPlus size={18} className="text-emerald-300" />
                      <span>Gestion des Chaînes & Créateurs Officiels</span>
                    </h3>
                    <p className="text-xs text-zinc-300">
                      Ajoutez de nouveaux créateurs de contenu pour signer et organiser les séries.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleAddChannelSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <input
                    type="text"
                    placeholder="Nom du créateur / chaîne *"
                    value={newChannelForm.name}
                    onChange={(e) => setNewChannelForm({ ...newChannelForm, name: e.target.value })}
                    className="px-4 py-2.5 bg-white/5 border border-white/15 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-400 focus:bg-white/10 transition-all"
                  />
                  <input
                    type="text"
                    placeholder="Description du créateur..."
                    value={newChannelForm.description || ""}
                    onChange={(e) => setNewChannelForm({ ...newChannelForm, description: e.target.value })}
                    className="px-4 py-2.5 bg-white/5 border border-white/15 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-400 focus:bg-white/10 transition-all"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 liquid-glass-emerald border border-emerald-400/40 text-emerald-200 rounded-full text-xs font-bold transition-all shadow-md active:scale-95"
                  >
                    Ajouter le Créateur
                  </button>
                </form>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-3">
                  {customChannels.map((ch) => {
                    const videoCount = catalog.filter((c) => c.channel === ch.name).length;
                    return (
                      <div
                        key={ch.name}
                        className="liquid-glass-card border border-white/15 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-md"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-amber-300 font-bold text-sm overflow-hidden shadow-inner">
                            {ch.avatar ? (
                              <img src={ch.avatar} alt={ch.name} className="w-full h-full object-cover" />
                            ) : (
                              ch.name.slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div>
                            <h4 className="font-bold text-xs text-white">{ch.name}</h4>
                            <p className="text-[10px] text-zinc-400">{videoCount} vidéo{videoCount > 1 ? "s" : ""}</p>
                          </div>
                        </div>

                        {!["NARRO", "NARRO DIN", "Yacine", "Towards Eternity", "Croyant Rationnel", "Récitations Haramain"].includes(ch.name) && (
                          <button
                            onClick={() => removeChannel(ch.name)}
                            className="text-zinc-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                            title="Supprimer ce créateur"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PRÉVISUALISATION AISTUDIO.GOOGLE */}
          {activeTab === "live-preview" && (
            <div className="space-y-6 max-w-6xl mx-auto font-mono text-xs">
              {/* Header Google AI Studio Banner */}
              <div className="bg-gradient-to-r from-blue-950/60 via-zinc-900 to-zinc-900 border border-blue-500/30 rounded-3xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 font-sans">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-ping" />
                    <h3 className="text-base font-bold text-white">
                      Google AI Studio Workspace — Mode Sandbox Live
                    </h3>
                  </div>
                  <p className="text-xs text-zinc-300 max-w-2xl">
                    Environnement de simulation interactif haute fidélité. Testez le rendu vidéo, les bannières d'accueil et le manifeste JSON en temps réel avant déploiement.
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => {
                      setLivePublishNotice("✅ Catalogue synchronisé avec succès sur tous les appareils connectés !");
                      setTimeout(() => setLivePublishNotice(null), 4000);
                    }}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-xl shadow-blue-950/60 transition-all active:scale-95"
                  >
                    <CheckCircle2 size={16} />
                    <span>Déployer en Production</span>
                  </button>
                </div>
              </div>

              {livePublishNotice && (
                <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 font-sans">
                  <Check size={16} />
                  <span>{livePublishNotice}</span>
                </div>
              )}

              {/* Google AI Studio Tabs for Preview */}
              <div className="border-b border-zinc-800 flex items-center gap-4 text-xs font-semibold font-sans">
                <button
                  onClick={() => setAiActivePreviewTab("player")}
                  className={`py-2.5 border-b-2 transition-all ${
                    aiActivePreviewTab === "player"
                      ? "border-blue-400 text-blue-400"
                      : "border-transparent text-zinc-400 hover:text-white"
                  }`}
                >
                  📺 Lecteur Vidéo Live Test
                </button>
                <button
                  onClick={() => setAiActivePreviewTab("hero")}
                  className={`py-2.5 border-b-2 transition-all ${
                    aiActivePreviewTab === "hero"
                      ? "border-blue-400 text-blue-400"
                      : "border-transparent text-zinc-400 hover:text-white"
                  }`}
                >
                  🌟 Bannière Hero (Page d'accueil)
                </button>
                <button
                  onClick={() => setAiActivePreviewTab("card")}
                  className={`py-2.5 border-b-2 transition-all ${
                    aiActivePreviewTab === "card"
                      ? "border-blue-400 text-blue-400"
                      : "border-transparent text-zinc-400 hover:text-white"
                  }`}
                >
                  🗂️ Carte Grille Catalogue
                </button>
                <button
                  onClick={() => setAiActivePreviewTab("json")}
                  className={`py-2.5 border-b-2 transition-all ${
                    aiActivePreviewTab === "json"
                      ? "border-blue-400 text-blue-400"
                      : "border-transparent text-zinc-400 hover:text-white"
                  }`}
                >
                  📋 Manifeste JSON & Config
                </button>
              </div>

              {/* View 1: Live Video Player */}
              {aiActivePreviewTab === "player" && (
                <div className="space-y-4 font-sans">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    <div className="lg:col-span-8 bg-black rounded-3xl overflow-hidden border border-zinc-800 aspect-video shadow-2xl">
                      {currentPreviewItem.videoSourceType === "direct" && currentPreviewItem.videoUrl ? (
                        <video
                          src={currentPreviewItem.videoUrl}
                          controls
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <iframe
                          src={`https://www.youtube-nocookie.com/embed/${currentPreviewItem.youtubeId || "Xs26kdKEwlg"}?autoplay=0&rel=0&modestbranding=1`}
                          className="w-full h-full border-0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      )}
                    </div>

                    <div className="lg:col-span-4 bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-4">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold uppercase">
                        Active Item In Sandbox
                      </span>
                      <h3 className="font-bold text-white text-base leading-snug">
                        {currentPreviewItem.title}
                      </h3>
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        {currentPreviewItem.description}
                      </p>
                      <div className="pt-2 border-t border-zinc-800 text-xs space-y-1.5 text-zinc-400">
                        <div className="flex justify-between">
                          <span>Chaîne :</span>
                          <strong className="text-white">{currentPreviewItem.channel}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Catégorie :</span>
                          <strong className="text-amber-300">{currentPreviewItem.categories[0]}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Durée :</span>
                          <strong className="text-white">{currentPreviewItem.duration}</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* View 2: Hero Preview */}
              {aiActivePreviewTab === "hero" && (
                <div className="relative rounded-3xl overflow-hidden border border-zinc-800 bg-zinc-950 aspect-[21/9] flex items-end p-6 sm:p-10 font-sans">
                  <img
                    src={currentPreviewItem.heroImage || currentPreviewItem.image}
                    alt={currentPreviewItem.title}
                    className="absolute inset-0 w-full h-full object-cover brightness-50"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
                  <div className="relative z-10 space-y-2 max-w-2xl">
                    <span className="px-2.5 py-0.5 bg-amber-500 text-black text-[10px] font-black uppercase rounded-full">
                      HERO SPOTLIGHT
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-white">{currentPreviewItem.title}</h2>
                    <p className="text-xs text-zinc-300 line-clamp-2">{currentPreviewItem.description}</p>
                  </div>
                </div>
              )}

              {/* View 3: Card Grid Preview */}
              {aiActivePreviewTab === "card" && (
                <div className="max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden p-3 space-y-3 font-sans">
                  <img src={currentPreviewItem.image} alt="Preview" className="w-full aspect-video object-cover rounded-xl" />
                  <h4 className="font-bold text-sm text-white truncate">{currentPreviewItem.title}</h4>
                  <p className="text-xs text-zinc-400 line-clamp-2">{currentPreviewItem.description}</p>
                </div>
              )}

              {/* View 4: JSON Manifest Inspector */}
              {aiActivePreviewTab === "json" && (
                <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 overflow-x-auto text-xs font-mono text-emerald-400">
                  <pre>{JSON.stringify(currentPreviewItem, null, 2)}</pre>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: SUGGESTIONS DES UTILISATEURS (EXCLUSIVEMENT CELLES DE LA COMMUNAUTÉ) */}
          {activeTab === "suggestions" && (
            <div className="space-y-6 max-w-5xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <ThumbsUp size={18} className="text-amber-400" />
                    <span>Suggestion de l'utilisateur</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold">
                      {suggestions.length} suggestion{suggestions.length > 1 ? "s" : ""}
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Propositions et demandes de vidéos formulées par les membres de la communauté, avec leur nom, lien et nombre de votes reçus.
                  </p>
                </div>
              </div>

              {suggestions.length === 0 ? (
                <div className="text-center py-16 bg-zinc-900/40 border border-zinc-800 rounded-3xl p-8 space-y-3">
                  <Film size={36} className="text-zinc-600 mx-auto" />
                  <p className="text-sm font-semibold text-zinc-300">Aucune suggestion soumise par les utilisateurs pour le moment.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {suggestions.map((item) => (
                    <div
                      key={item.id}
                      className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-3xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
                    >
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-md bg-zinc-800 text-zinc-300 text-[10px] font-bold uppercase">
                            {item.category}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[11px] font-black flex items-center gap-1 border border-amber-500/30">
                            <Flame size={12} className="text-amber-400" />
                            {item.voteCount} vote{item.voteCount > 1 ? "s d'utilisateurs" : " d'utilisateur"}
                          </span>
                          {item.status === "published" && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                              ✓ Ajouté au catalogue
                            </span>
                          )}
                        </div>

                        <h4 className="font-bold text-white text-base">{item.title}</h4>

                        {item.note && (
                          <p className="text-xs text-zinc-300 italic bg-zinc-950 p-3 rounded-2xl border border-zinc-800/80">
                            « {item.note} »
                          </p>
                        )}

                        <div className="flex items-center gap-4 text-xs text-zinc-500 flex-wrap">
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-amber-400 hover:underline flex items-center gap-1 truncate max-w-sm"
                          >
                            <ExternalLink size={12} />
                            <span className="truncate">{item.url}</span>
                          </a>
                          <span>Soumis par <strong className="text-zinc-300">{item.submittedBy}</strong> ({item.submitterEmail || "Membre"})</span>
                        </div>
                      </div>

                      {/* Admin Actions on User Suggestion */}
                      <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-zinc-800 flex-wrap">
                        {/* Direct Play / Test button */}
                        <button
                          onClick={() => {
                            const parsed = extractVideoInfo(item.url);
                            setTestVideoItem({
                              id: `test-${item.id}`,
                              title: item.title,
                              description: item.note || "",
                              youtubeId: parsed.videoId,
                              videoUrl: parsed.videoUrl || item.url,
                              videoSourceType: parsed.type,
                              channel: "NARRO",
                              categories: [item.category ? (item.category as Category) : "Prophètes"],
                            });
                          }}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-emerald-400 text-xs font-semibold transition-colors"
                          title="Lire / Tester la vidéo de l'utilisateur"
                        >
                          <Play size={14} />
                          <span>Lire la vidéo</span>
                        </button>

                        <button
                          onClick={() => handleDirectAddSuggestion(item)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-all active:scale-95"
                          title="Ajouter directement au catalogue"
                        >
                          <Plus size={14} />
                          <span>Intégrer au Catalogue</span>
                        </button>

                        <button
                          onClick={() => handleImportSuggestionToAI(item)}
                          className="p-2 rounded-xl bg-zinc-800 hover:bg-blue-600 text-zinc-300 hover:text-white transition-colors"
                          title="Enrichir avec l'IA Studio"
                        >
                          <Wand2 size={15} />
                        </button>

                        <button
                          onClick={() => deleteSuggestion(item.id)}
                          className="p-2 rounded-xl bg-zinc-800 hover:bg-rose-500/30 text-zinc-400 hover:text-rose-400 transition-colors"
                          title="Supprimer la suggestion"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5b: MESSAGES REÇUS DU CRÉATEUR */}
          {activeTab === "messages" && (
            <div className="space-y-6 max-w-5xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Mail size={18} className="text-emerald-400" />
                    <span>Messages Reçus des Utilisateurs</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold">
                      {creatorMessages.length} message{creatorMessages.length > 1 ? "s" : ""}
                    </span>
                    {creatorUnreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-bold">
                        {creatorUnreadCount} non lu{creatorUnreadCount > 1 ? "s" : ""}
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Messages privés, invocations, suggestions directes et retours envoyés par les membres de la communauté.
                  </p>
                </div>
              </div>

              {creatorMessages.length === 0 ? (
                <div className="text-center py-16 bg-zinc-900/40 border border-zinc-800 rounded-3xl p-8 space-y-3">
                  <Inbox size={36} className="text-zinc-600 mx-auto" />
                  <p className="text-sm font-semibold text-zinc-300">Aucun message d'utilisateur reçu pour l'instant.</p>
                  <p className="text-xs text-zinc-500">
                    Les messages envoyés par les utilisateurs depuis le modal ou le lecteur s'afficheront ici.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {creatorMessages.map((msg) => {
                    const isUnread = msg.status === "unread";
                    const formattedDate = msg.createdAt ? new Date(msg.createdAt).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    }) : "";

                    const categoryBadgeMap: Record<string, { label: string; color: string }> = {
                      thanks: { label: "Remerciement / Duaa", color: "bg-rose-500/20 text-rose-300 border-rose-500/30" },
                      idea: { label: "Idée de contenu", color: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
                      question: { label: "Question", color: "bg-sky-500/20 text-sky-300 border-sky-500/30" },
                      technical: { label: "Signalement", color: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
                      general: { label: "Général", color: "bg-zinc-800 text-zinc-300 border-zinc-700" },
                    };
                    const badge = categoryBadgeMap[msg.category || "general"] || categoryBadgeMap.general;

                    return (
                      <div
                        key={msg.id}
                        className={`rounded-3xl p-5 border transition-all ${
                          isUnread
                            ? "bg-zinc-900/90 border-emerald-500/40 shadow-lg shadow-emerald-950/20"
                            : "bg-zinc-900/50 border-zinc-800/80 hover:border-zinc-700"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-white text-sm">
                                {msg.senderName}
                              </span>
                              {msg.senderEmail && (
                                <a
                                  href={`mailto:${msg.senderEmail}?subject=Re: ${encodeURIComponent(msg.subject)}`}
                                  className="text-xs text-zinc-400 hover:text-emerald-400 flex items-center gap-1 underline decoration-zinc-700"
                                  title="Envoyer un e-mail de réponse"
                                >
                                  <Mail size={12} />
                                  <span>{msg.senderEmail}</span>
                                </a>
                              )}
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.color}`}>
                                {badge.label}
                              </span>
                              {isUnread && (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-black text-[10px] font-extrabold">
                                  NOUVEAU
                                </span>
                              )}
                            </div>

                            {msg.videoContext && (
                              <p className="text-xs text-amber-400/90 flex items-center gap-1.5 font-medium">
                                <Film size={12} />
                                <span>Vidéo concernée : {msg.videoContext}</span>
                              </p>
                            )}

                            <h4 className="text-sm font-semibold text-white pt-1">
                              {msg.subject}
                            </h4>
                            <p className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed bg-zinc-950/60 p-3 rounded-2xl border border-zinc-800/60">
                              {msg.content}
                            </p>
                            <p className="text-[10px] text-zinc-500">
                              Reçu le {formattedDate}
                            </p>
                          </div>

                          <div className="flex sm:flex-col items-center gap-2 shrink-0 pt-2 sm:pt-0">
                            <button
                              onClick={() => markCreatorMsgAsRead(msg.id, isUnread ? "read" : "unread")}
                              className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                                isUnread
                                  ? "bg-emerald-600/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-600/30"
                                  : "bg-zinc-800/60 text-zinc-400 border-zinc-700/60 hover:text-zinc-200"
                              }`}
                              title={isUnread ? "Marquer comme lu" : "Marquer comme non-lu"}
                            >
                              {isUnread ? <Check size={14} /> : <MailOpen size={14} />}
                              <span className="hidden sm:inline text-[11px]">
                                {isUnread ? "Marquer lu" : "Non-lu"}
                              </span>
                            </button>

                            {msg.senderEmail && (
                              <a
                                href={`mailto:${msg.senderEmail}?subject=Re: ${encodeURIComponent(msg.subject)}`}
                                className="p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 border border-zinc-700 transition-all"
                                title="Répondre par email"
                              >
                                <Send size={13} />
                                <span className="hidden sm:inline text-[11px]">Répondre</span>
                              </a>
                            )}

                            <button
                              onClick={() => deleteCreatorMsg(msg.id)}
                              className="p-2 rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-rose-500/20 transition-all"
                              title="Supprimer ce message"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: FLASH INFO & ALERTES CRÉATEUR */}
          {activeTab === "announcements" && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="bg-zinc-900/80 p-6 rounded-3xl border border-zinc-800 space-y-5">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                      <Radio size={20} className="animate-pulse" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base">Alertes Créateur & Flash Info Global</h3>
                      <p className="text-xs text-zinc-400">
                        Diffusez en direct des bandeaux d'alertes, rappels et nouveautés en temps réel sur toute la plateforme.
                      </p>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer bg-zinc-950 px-3 py-1.5 rounded-xl border border-zinc-800">
                    <input
                      type="checkbox"
                      checked={annForm.enabled}
                      onChange={(e) => setAnnForm({ ...annForm, enabled: e.target.checked })}
                      className="rounded bg-zinc-950 border-zinc-700 text-emerald-500"
                    />
                    <span className="text-xs text-zinc-200 font-bold">
                      {annForm.enabled ? "Bannière Active" : "Bannière Inactive"}
                    </span>
                  </label>
                </div>

                {/* Badge text & Color */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-zinc-400">Badge de l'Alerte</label>
                    <input
                      type="text"
                      value={annForm.badge || ""}
                      onChange={(e) => setAnnForm({ ...annForm, badge: e.target.value.toUpperCase() })}
                      placeholder="Ex: FLASH INFO, DIRECT, NOUVEAUTÉ, JUMU'A..."
                      className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white uppercase font-bold focus:border-amber-500 outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-zinc-400">Couleur du Badge</label>
                    <select
                      value={annForm.badgeColor || "emerald"}
                      onChange={(e) => setAnnForm({ ...annForm, badgeColor: e.target.value as any })}
                      className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:border-amber-500 outline-none"
                    >
                      <option value="emerald">Émeraude (Vert)</option>
                      <option value="amber">Ambre (Or)</option>
                      <option value="red">Rouge Vif (Urgent)</option>
                      <option value="sky">Cyan (Bleu)</option>
                      <option value="rose">Rubis (Rose)</option>
                      <option value="purple">Pourpre (Violet)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-zinc-400">Texte principal de l'alerte</label>
                  <input
                    type="text"
                    value={annForm.text}
                    onChange={(e) => setAnnForm({ ...annForm, text: e.target.value })}
                    placeholder="Ex: ✨ Nouveau récit disponible sur la vie des Compagnons"
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs sm:text-sm text-white font-medium focus:border-amber-500 outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-zinc-400">Sous-texte explicatif</label>
                  <input
                    type="text"
                    value={annForm.subtext || ""}
                    onChange={(e) => setAnnForm({ ...annForm, subtext: e.target.value })}
                    placeholder="Ex: Profitez d'une diffusion 100% sans publicité et d'un audio remasterisé."
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:border-amber-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-zinc-400">Bouton d'action</label>
                    <input
                      type="text"
                      value={annForm.buttonText || ""}
                      onChange={(e) => setAnnForm({ ...annForm, buttonText: e.target.value })}
                      placeholder="Ex: Regarder, Découvrir..."
                      className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:border-amber-500 outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-zinc-400">Priorité</label>
                    <select
                      value={annForm.priority || "normal"}
                      onChange={(e) => setAnnForm({ ...annForm, priority: e.target.value as any })}
                      className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:border-amber-500 outline-none"
                    >
                      <option value="normal">Normale</option>
                      <option value="event">Événement spécial</option>
                      <option value="urgent">Urgente</option>
                    </select>
                  </div>
                </div>

                {/* Live Preview Inside Studio */}
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-2">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    Aperçu du bandeau en direct
                  </span>
                  <div
                    className={`p-2 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                      annForm.priority === "urgent" || annForm.badgeColor === "red"
                        ? "bg-red-950/40 border-red-500/30 text-red-200"
                        : "bg-zinc-900 border-zinc-800 text-zinc-200"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300">
                        {annForm.badge || "ANNONCE"}
                      </span>
                      <span className="font-semibold text-white truncate">{annForm.text || "Titre de l'alerte"}</span>
                    </div>
                    <span className="text-[10px] font-bold text-zinc-400 px-2 py-0.5 bg-white/10 rounded">
                      {annForm.buttonText || "Regarder"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    onClick={handleSaveAnnouncement}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg transition-all active:scale-95"
                  >
                    <Check size={16} />
                    <span>Sauvegarder & Diffuser en Ligne</span>
                  </button>
                </div>

                {annSavedAlert && (
                  <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                    <Check size={14} />
                    <span>Alerte enregistrée et synchronisée sur Firebase Firestore !</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 7: SPOTLIGHT */}
          {activeTab === "spotlight" && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="bg-zinc-900/80 p-6 rounded-3xl border border-zinc-800 space-y-4">
                <h3 className="font-bold text-white text-base">Vidéo Mise en Avant (Hero Banner)</h3>
                <p className="text-xs text-zinc-400">
                  Choisissez la vidéo qui apparaîtra en tête de l'application sur la page d'accueil pour tous les visiteurs.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto p-1">
                  {catalog.map((item) => {
                    const isSelected = spotlightId === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setSpotlightId(isSelected ? null : item.id)}
                        className={`p-3 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between gap-2 ${
                          isSelected
                            ? "bg-purple-950/40 border-purple-500 text-white shadow-lg"
                            : "bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700"
                        }`}
                      >
                        <img src={item.image} alt={item.title} className="w-full aspect-video object-cover rounded-xl" />
                        <h4 className="font-bold text-xs truncate">{item.title}</h4>
                        <div className="flex items-center justify-between text-[10px] text-zinc-500">
                          <span>{item.categories[0]}</span>
                          {isSelected && <span className="text-purple-400 font-bold">Sélectionné</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: BACKUP */}
          {activeTab === "cloud-sync" && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <div className="bg-zinc-900/80 p-6 rounded-3xl border border-zinc-800 space-y-4">
                <h3 className="font-bold text-white text-base">Sauvegarde & Export Global</h3>
                <p className="text-xs text-zinc-400">
                  Exportez l'ensemble du catalogue, des chaînes et des configurations sous format JSON.
                </p>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => {
                      const backup = exportBackup();
                      const blob = new Blob([backup], { type: "application/json" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `nextstream_backup_${Date.now()}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold border border-zinc-700 transition-all"
                  >
                    <DownloadCloud size={16} />
                    <span>Télécharger la Sauvegarde Complète (JSON)</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Dialog: Add or Edit Video */}
        {editingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <h3 className="text-base font-bold text-white">
                  {isNewItemMode ? "Ajouter une nouvelle vidéo" : "Modifier la vidéo"}
                </h3>
                <button
                  onClick={() => setEditingItem(null)}
                  className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-300"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="text-zinc-300 font-semibold">Titre de la vidéo *</label>
                  <input
                    type="text"
                    value={editingItem.title || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-300 font-semibold">
                    Lien Vidéo (YouTube, URL MP4 directe, Vimeo, Dailymotion) *
                  </label>
                  <input
                    type="text"
                    placeholder="https://www.youtube.com/watch?v=... ou https://.../video.mp4"
                    value={editingItem.videoUrl || editingItem.youtubeId || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      const parsed = extractVideoInfo(val);
                      setEditingItem({
                        ...editingItem,
                        youtubeId: parsed.videoId,
                        videoUrl: parsed.videoUrl || val,
                        videoSourceType: parsed.type,
                      });
                    }}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-300 font-semibold">Description</label>
                  <textarea
                    rows={3}
                    value={editingItem.description || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-zinc-300 font-semibold">Catégorie / Catalogue</label>
                    <select
                      value={editingItem.categories?.[0] || "Prophètes"}
                      onChange={(e) =>
                        setEditingItem({ ...editingItem, categories: [e.target.value as Category] })
                      }
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
                    >
                      {allActiveCategories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-zinc-300 font-semibold">Chaîne / Créateur</label>
                    <select
                      value={editingItem.channel || "NARRO"}
                      onChange={(e) => setEditingItem({ ...editingItem, channel: e.target.value as Channel })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
                    >
                      {allActiveChannels.map((ch) => (
                        <option key={ch} value={ch}>
                          {ch}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(editingItem.featured)}
                      onChange={(e) => setEditingItem({ ...editingItem, featured: e.target.checked })}
                      className="rounded bg-zinc-900 border-zinc-700 text-amber-500"
                    />
                    <span>À la une (Featured)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(editingItem.isNew)}
                      onChange={(e) => setEditingItem({ ...editingItem, isNew: e.target.checked })}
                      className="rounded bg-zinc-900 border-zinc-700 text-emerald-500"
                    />
                    <span>Nouveauté (Badge New)</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-3 border-t border-zinc-800">
                <div>
                  {!isNewItemMode && editingItem.id && (
                    <button
                      type="button"
                      onClick={() => {
                        const target = catalog.find((c) => c.id === editingItem.id) || (editingItem as ContentItem);
                        setEditingItem(null);
                        handleInitiateDelete(target);
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold border border-rose-500/20 transition-colors"
                    >
                      <Trash2 size={14} />
                      <span>Supprimer la vidéo</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setEditingItem(null)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold hover:bg-zinc-700 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSaveItem}
                    className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg transition-all"
                  >
                    Enregistrer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: View & Restore Deleted Videos */}
        {showDeletedModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto space-y-4 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <RotateCcw size={16} className="text-amber-400" />
                  <span>Vidéos Supprimées / Masquées du Catalogue</span>
                </h3>
                <button
                  onClick={() => {
                    setShowDeletedModal(false);
                    setConfirmResetAllDeleted(false);
                  }}
                  className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-300"
                >
                  <X size={16} />
                </button>
              </div>

              {deletedItemsList.length === 0 ? (
                <p className="text-xs text-zinc-400 py-6 text-center">Aucune vidéo supprimée pour le moment.</p>
              ) : (
                <div className="space-y-2">
                  {deletedItemsList.map((del) => (
                    <div
                      key={del.id}
                      className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs text-white truncate">{del.title}</h4>
                        <span className="text-[10px] text-zinc-500">{del.channel} · {del.categories[0]}</span>
                      </div>
                      <button
                        onClick={() => restoreDeletedVideo(del.id)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shrink-0 transition-all"
                      >
                        Restaurer
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {confirmResetAllDeleted ? (
                <div className="p-3 bg-rose-950/40 border border-rose-500/30 rounded-xl space-y-2">
                  <p className="text-xs text-rose-200">
                    Confirmez-vous la réactivation de <strong>toutes</strong> les vidéos masquées ?
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        resetDeletedVideos();
                        setConfirmResetAllDeleted(false);
                        setShowDeletedModal(false);
                      }}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold"
                    >
                      Oui, tout réactiver
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmResetAllDeleted(false)}
                      className="px-3 py-1.5 bg-zinc-800 text-zinc-300 rounded-lg text-xs font-semibold"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
                  {deletedItemsList.length > 0 && (
                    <button
                      onClick={() => setConfirmResetAllDeleted(true)}
                      className="text-xs text-rose-400 hover:underline"
                    >
                      Tout restaurer
                    </button>
                  )}
                  <button
                    onClick={() => setShowDeletedModal(false)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold ml-auto"
                  >
                    Fermer
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Dedicated In-App Video Deletion Confirmation Modal */}
        {videoToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-zinc-950 border border-rose-500/40 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl shadow-rose-950/50"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
                  <Trash2 size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Supprimer la vidéo du catalogue</h3>
                  <p className="text-xs text-zinc-400">Action Administrateur</p>
                </div>
              </div>

              <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-3 flex gap-3 items-center">
                <img
                  src={videoToDelete.image || `https://i.ytimg.com/vi/${videoToDelete.youtubeId}/hqdefault.jpg`}
                  alt={videoToDelete.title}
                  className="w-20 aspect-video rounded-lg object-cover bg-zinc-950 shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://i.ytimg.com/vi/${videoToDelete.youtubeId}/hqdefault.jpg`;
                  }}
                />
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-xs text-white truncate leading-snug">{videoToDelete.title}</h4>
                  <p className="text-[11px] text-zinc-400">{videoToDelete.channel} · {videoToDelete.duration}</p>
                  <span className="inline-block mt-1 px-1.5 py-0.2 rounded bg-zinc-800 text-[10px] text-zinc-300">
                    {videoToDelete.categories?.[0]}
                  </span>
                </div>
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed">
                Cette vidéo sera <strong>immédiatement retirée</strong> de la page d'accueil, du moteur de recherche et de l'ensemble des catégories pour tous les utilisateurs.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setVideoToDelete(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors"
                >
                  Annuler
                </button>

                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-950/60 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Suppression...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 size={14} />
                      <span>Supprimer définitivement</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Video Player Test Popup */}
        {testVideoItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg">
            <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-5 max-w-3xl w-full space-y-4 shadow-2xl">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <h3 className="text-sm font-bold text-white truncate pr-4">{testVideoItem.title}</h3>
                <button
                  onClick={() => setTestVideoItem(null)}
                  className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-300"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="rounded-2xl overflow-hidden aspect-video bg-black border border-zinc-800">
                {testVideoItem.videoSourceType === "direct" && testVideoItem.videoUrl ? (
                  <video src={testVideoItem.videoUrl} controls autoPlay className="w-full h-full object-contain" />
                ) : (
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${testVideoItem.youtubeId || "Xs26kdKEwlg"}?autoplay=1&rel=0`}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Catégorie : <strong className="text-amber-300">{testVideoItem.categories?.[0]}</strong></span>
                <button
                  onClick={() => {
                    handleDirectAddSuggestion({
                      id: testVideoItem.id!,
                      title: testVideoItem.title!,
                      url: testVideoItem.videoUrl || `https://www.youtube.com/watch?v=${testVideoItem.youtubeId}`,
                      category: testVideoItem.categories?.[0] || "Prophètes",
                      submittedBy: "Communauté",
                      voteCount: 1,
                      voters: [],
                      status: "pending",
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    });
                    setTestVideoItem(null);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all"
                >
                  Ajouter cette vidéo au catalogue
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
