import { useState } from "react";
import {
  X,
  Sparkles,
  Plus,
  ThumbsUp,
  ExternalLink,
  Film,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Search,
  Users,
  Video,
  Send,
  Loader2,
  Tv,
  MessageSquare,
  Mail,
  Heart,
  HelpCircle,
  Lightbulb,
  Wrench,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useVideoSuggestions, VideoSuggestion } from "@/hooks/useVideoSuggestions";
import { categories, Category } from "@/data/catalog";
import { useAuth } from "@/hooks/useAuth";
import { useCreatorMessages, MessageCategory } from "@/hooks/useCreatorMessages";

interface VideoSuggestionModalProps {
  onClose: () => void;
  onPlayVideo?: (id: string) => void;
  initialView?: "browse" | "suggest" | "message";
  initialVideoContext?: string;
}

export default function VideoSuggestionModal({
  onClose,
  onPlayVideo,
  initialView = "browse",
  initialVideoContext = "",
}: VideoSuggestionModalProps) {
  const { user } = useAuth();
  const { suggestions, submitSuggestion, toggleVote, voterId } = useVideoSuggestions();
  const { sendMessage } = useCreatorMessages();

  const [activeView, setActiveView] = useState<"suggest" | "browse" | "message">(initialView);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);

  // Suggest video form state
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Category>("Prophètes");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Message to creator form state
  const [msgName, setMsgName] = useState(user?.displayName || "");
  const [msgEmail, setMsgEmail] = useState(user?.email || "");
  const [msgCategory, setMsgCategory] = useState<MessageCategory>("general");
  const [msgSubject, setMsgSubject] = useState(initialVideoContext ? `Retour sur : ${initialVideoContext}` : "");
  const [msgContent, setMsgContent] = useState("");
  const [msgVideoContext, setMsgVideoContext] = useState(initialVideoContext || "");
  const [msgSubmitting, setMsgSubmitting] = useState(false);
  const [msgSuccess, setMsgSuccess] = useState(false);
  const [msgError, setMsgError] = useState<string | null>(null);

  // Auto-detect title or format from url
  const handleUrlChange = (val: string) => {
    setUrl(val);
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setFormError("Veuillez renseigner le lien de la vidéo.");
      return;
    }
    if (!title.trim()) {
      setFormError("Veuillez indiquer un titre ou sujet pour la vidéo.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    const res = await submitSuggestion({
      title: title.trim(),
      url: url.trim(),
      category,
      note: note.trim(),
      submitterName: user?.displayName || user?.email?.split("@")[0] || "Membre Communauté",
    });

    setSubmitting(false);

    if (res.success) {
      setSubmittedSuccess(true);
      setUrl("");
      setTitle("");
      setNote("");
      setTimeout(() => {
        setSubmittedSuccess(false);
        setActiveView("browse");
      }, 1800);
    } else {
      setFormError(res.error || "Impossible d'enregistrer la suggestion.");
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgSubject.trim()) {
      setMsgError("Veuillez indiquer le sujet de votre message.");
      return;
    }
    if (!msgContent.trim()) {
      setMsgError("Veuillez rédiger le contenu de votre message.");
      return;
    }

    setMsgSubmitting(true);
    setMsgError(null);

    const res = await sendMessage({
      senderName: msgName.trim() || user?.displayName || "Membre Communauté",
      senderEmail: msgEmail.trim() || user?.email || undefined,
      subject: msgSubject.trim(),
      content: msgContent.trim(),
      category: msgCategory,
      videoContext: msgVideoContext.trim() || undefined,
    });

    setMsgSubmitting(false);

    if (res.success) {
      setMsgSuccess(true);
      setMsgContent("");
      setMsgSubject("");
    } else {
      setMsgError(res.error || "Une erreur est survenue lors de l'envoi du message.");
    }
  };

  const filteredSuggestions = suggestions.filter((s) => {
    const matchSearch =
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.note?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategory = categoryFilter === "all" || s.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-hidden">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
      />

      {/* Modal Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-3xl max-h-[90vh] bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-white"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800/80 bg-zinc-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                Suggestion de l'utilisateur
              </h2>
              <p className="text-xs text-zinc-400">
                Proposez du contenu et rédigez un message directement au créateur.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center transition-colors"
            title="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 pt-4 pb-2 border-b border-zinc-800/60 bg-zinc-900/40 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800 overflow-x-auto">
            <button
              onClick={() => setActiveView("browse")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeView === "browse"
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <TrendingUp size={14} className="text-amber-400" />
              <span>Suggestions ({suggestions.length})</span>
            </button>
            <button
              onClick={() => setActiveView("suggest")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeView === "suggest"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Plus size={14} />
              <span>Proposer une Vidéo</span>
            </button>
            <button
              onClick={() => setActiveView("message")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeView === "message"
                  ? "bg-emerald-600 text-white shadow-sm font-bold"
                  : "text-zinc-400 hover:text-emerald-400"
              }`}
            >
              <MessageSquare size={14} className={activeView === "message" ? "text-white" : "text-emerald-400"} />
              <span>Message au Créateur</span>
            </button>
          </div>

          {activeView === "browse" && (
            <div className="text-xs text-zinc-400 hidden sm:flex items-center gap-1.5">
              <Users size={14} className="text-emerald-400" />
              <span>Classement par nombre de votes</span>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeView === "message" ? (
            /* SECTION: REDIGER UN MESSAGE AU CREATEUR */
            <form onSubmit={handleSendMessage} className="space-y-4 max-w-xl mx-auto">
              <div className="bg-emerald-950/40 border border-emerald-500/20 rounded-2xl p-4 text-xs text-zinc-300 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                  <Mail size={16} />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-white text-sm">Écrire directement au Créateur</p>
                  <p className="text-zinc-400 leading-relaxed">
                    Une question spirituelle, une idée de future série, un remerciement ou une remarque ?
                    Votre message sera transmis directement dans l'espace créateur.
                  </p>
                </div>
              </div>

              {msgSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 p-4 rounded-2xl flex flex-col gap-2 text-sm"
                >
                  <div className="flex items-center gap-2.5 font-bold text-emerald-300">
                    <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
                    <span>Votre message a bien été envoyé au créateur !</span>
                  </div>
                  <p className="text-xs text-emerald-300/80 pl-7">
                    Barak'Allahu fik pour votre retour et votre soutien.
                  </p>
                  <div className="pt-2 pl-7 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setMsgSuccess(false)}
                      className="px-3 py-1 bg-emerald-700/60 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold"
                    >
                      Écrire un autre message
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveView("browse")}
                      className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-semibold"
                    >
                      Voir les suggestions
                    </button>
                  </div>
                </motion.div>
              )}

              {msgError && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-3.5 rounded-2xl flex items-center gap-2 text-xs">
                  <AlertCircle size={16} className="text-red-400 shrink-0" />
                  <span>{msgError}</span>
                </div>
              )}

              {/* Sender info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-zinc-300">
                    Votre nom ou pseudo <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="ex: Tariq ou Sœur Anonyme"
                    value={msgName}
                    onChange={(e) => setMsgName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-zinc-300">
                    Email de contact <span className="text-zinc-500 text-[10px]">(facultatif, pour une réponse)</span>
                  </label>
                  <input
                    type="email"
                    placeholder="votre.email@domaine.com"
                    value={msgEmail}
                    onChange={(e) => setMsgEmail(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Category selector */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-300">Type de message</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(
                    [
                      { key: "general", label: "Message général", icon: MessageSquare },
                      { key: "thanks", label: "Remerciement / Duaa", icon: Heart },
                      { key: "idea", label: "Idée de série / contenu", icon: Lightbulb },
                      { key: "question", label: "Question / Thème", icon: HelpCircle },
                      { key: "technical", label: "Signalement / Retour", icon: Wrench },
                    ] as const
                  ).map((item) => {
                    const Icon = item.icon;
                    const isSelected = msgCategory === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setMsgCategory(item.key)}
                        className={`flex items-center gap-1.5 p-2 rounded-xl text-xs font-medium border text-left transition-all ${
                          isSelected
                            ? "bg-emerald-950/70 border-emerald-500 text-emerald-200 shadow-sm"
                            : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
                        }`}
                      >
                        <Icon size={14} className={isSelected ? "text-emerald-400 shrink-0" : "text-zinc-500 shrink-0"} />
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Subject */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-300">
                  Sujet du message <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="ex: Suggestion de documentaire sur Cordoue ou Question sur l'épisode 2"
                  value={msgSubject}
                  onChange={(e) => setMsgSubject(e.target.value)}
                  className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              {/* Video context (optional) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-400">
                  Vidéo concernée <span className="text-zinc-500 text-[10px]">(facultatif)</span>
                </label>
                <input
                  type="text"
                  placeholder="ex: Titre de la vidéo concernée"
                  value={msgVideoContext}
                  onChange={(e) => setMsgVideoContext(e.target.value)}
                  className="w-full px-4 py-2 bg-zinc-950/60 border border-zinc-800/80 rounded-xl text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Content / Message */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-zinc-300">
                    Votre message <span className="text-red-400">*</span>
                  </label>
                  <span className="text-[10px] text-zinc-500">{msgContent.length} caractères</span>
                </div>
                <textarea
                  rows={5}
                  placeholder="Rédigez votre message ici au créateur avec bienveillance et précision..."
                  value={msgContent}
                  onChange={(e) => setMsgContent(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 resize-none leading-relaxed"
                  required
                />
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={msgSubmitting || !msgContent.trim() || !msgSubject.trim()}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition-all active:scale-[0.99]"
              >
                {msgSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin text-white" />
                    <span>Transmission au créateur...</span>
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    <span>Envoyer le message au créateur</span>
                  </>
                )}
              </button>
            </form>
          ) : activeView === "suggest" ? (
            <form onSubmit={handleSubmit} className="space-y-4 max-w-xl mx-auto">
              <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-4 text-xs text-zinc-400 space-y-1">
                <p className="font-semibold text-zinc-200 flex items-center gap-1.5">
                  <Film size={14} className="text-amber-400" />
                  Sources compatibles :
                </p>
                <p>
                  YouTube, MP4/WebM direct, Vimeo, Dailymotion ou vidéos hébergées. Le créateur examinera et publiera la vidéo avec sous-titres et chapitrage.
                </p>
              </div>

              {submittedSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-4 rounded-2xl flex items-center gap-3 text-sm font-medium"
                >
                  <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
                  <span>Votre suggestion a été enregistrée avec succès ! Redirection vers la liste...</span>
                </motion.div>
              )}

              {formError && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-3.5 rounded-2xl flex items-center gap-2 text-xs">
                  <AlertCircle size={16} className="text-red-400 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-300">
                  Lien de la vidéo (URL) <span className="text-red-400">*</span>
                </label>
                <input
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=... ou https://.../video.mp4"
                  value={url}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-300">
                  Titre ou thème du contenu <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="ex: Le Récit de Sourate Al-Kahf ou L'Histoire de Bilal"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-zinc-300">Catégorie suggérée</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as Category)}
                    className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-zinc-300">Format détecté</label>
                  <div className="w-full px-4 py-3 bg-zinc-950/60 border border-zinc-800 rounded-xl text-xs text-zinc-400 flex items-center gap-2">
                    <Tv size={14} className="text-amber-400" />
                    <span>
                      {url.includes("vimeo")
                        ? "Vimeo Embed"
                        : url.includes("dailymotion") || url.includes("dai.ly")
                        ? "Dailymotion Embed"
                        : url.endsWith(".mp4") || url.endsWith(".webm")
                        ? "Fichier Direct (MP4/WebM)"
                        : "YouTube Standard"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-300">
                  Note ou justification spirituelle (optionnel)
                </label>
                <textarea
                  rows={3}
                  placeholder="Pourquoi cette vidéo devrait être ajoutée ? Moments forts, chapitres importants..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveView("browse")}
                  className="px-5 py-2.5 rounded-xl border border-zinc-800 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-xs font-bold shadow-lg shadow-amber-950/50 transition-all disabled:opacity-50"
                >
                  {submitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                  <span>Envoyer la suggestion</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Rechercher parmi les suggestions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="all">Toutes les catégories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Suggestions List */}
              {filteredSuggestions.length === 0 ? (
                <div className="text-center py-16 bg-zinc-950/40 border border-zinc-800/80 rounded-2xl p-8 space-y-3">
                  <Film size={36} className="text-zinc-600 mx-auto" />
                  <h3 className="text-sm font-semibold text-zinc-300">Aucune suggestion trouvée</h3>
                  <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                    Soyez le premier à proposer une vidéo pour cette catégorie !
                  </p>
                  <button
                    onClick={() => setActiveView("suggest")}
                    className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-semibold hover:bg-amber-500 transition-all"
                  >
                    <Plus size={14} />
                    <span>Proposer une vidéo</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredSuggestions.map((item) => {
                    const hasVoted = item.voters?.includes(voterId);
                    return (
                      <div
                        key={item.id}
                        className="bg-zinc-950/80 border border-zinc-800/90 hover:border-zinc-700/80 rounded-2xl p-4 sm:p-5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                      >
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                              {item.category}
                            </span>
                            {item.status === "published" && (
                              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                <CheckCircle2 size={11} />
                                Ajouté au Catalogue
                              </span>
                            )}
                            <span className="text-[11px] text-zinc-500">
                              Proposé par <span className="text-zinc-300 font-medium">{item.submittedBy}</span>
                            </span>
                          </div>

                          <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-amber-300 transition-colors">
                            {item.title}
                          </h3>

                          {item.note && (
                            <p className="text-xs text-zinc-400 line-clamp-2 italic bg-zinc-900/50 p-2 rounded-lg border border-zinc-800/50">
                              « {item.note} »
                            </p>
                          )}

                          <div className="pt-1 flex items-center gap-3 text-[11px] text-zinc-500">
                            <button
                              type="button"
                              onClick={() => setPreviewVideoUrl(item.url)}
                              className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20"
                            >
                              <Video size={11} />
                              <span>Tester la lecture</span>
                            </button>
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-amber-400/90 hover:text-amber-300 hover:underline flex items-center gap-1 truncate max-w-xs"
                            >
                              <ExternalLink size={11} />
                              <span className="truncate">{item.url}</span>
                            </a>
                          </div>
                        </div>

                        {/* Voting Action Section */}
                        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-800/80 shrink-0">
                          <div className="text-left sm:text-right">
                            <div className="flex items-center sm:justify-end gap-1.5 text-xs font-extrabold text-amber-400">
                              <Users size={13} />
                              <span>{item.voteCount || 1} {item.voteCount > 1 ? "personnes intéressées" : "personne intéressée"}</span>
                            </div>
                            <span className="text-[10px] text-zinc-500">
                              {hasVoted ? "Vous soutenez cette vidéo" : "Cliquez pour soutenir l'ajout"}
                            </span>
                          </div>

                          <button
                            onClick={() => toggleVote(item.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                              hasVoted
                                ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20"
                                : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white border border-zinc-700/60 active:scale-95"
                            }`}
                          >
                            <ThumbsUp size={14} className={hasVoted ? "fill-current" : ""} />
                            <span>{hasVoted ? "Soutenu (+1)" : "Soutenir (+1)"}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Video Preview Modal */}
        {previewVideoUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg">
            <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-5 max-w-3xl w-full space-y-4 shadow-2xl">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <h3 className="text-sm font-bold text-white truncate pr-4">Lecteur Aperçu Suggestion</h3>
                <button
                  onClick={() => setPreviewVideoUrl(null)}
                  className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-300"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="rounded-2xl overflow-hidden aspect-video bg-black border border-zinc-800">
                {previewVideoUrl.endsWith(".mp4") || previewVideoUrl.endsWith(".webm") ? (
                  <video src={previewVideoUrl} controls autoPlay className="w-full h-full object-contain" />
                ) : (
                  <iframe
                    src={
                      previewVideoUrl.includes("watch?v=")
                        ? `https://www.youtube-nocookie.com/embed/${previewVideoUrl.split("v=")[1]?.split("&")[0]}?autoplay=1&rel=0`
                        : previewVideoUrl.includes("youtu.be/")
                        ? `https://www.youtube-nocookie.com/embed/${previewVideoUrl.split("youtu.be/")[1]?.split("?")[0]}?autoplay=1&rel=0`
                        : previewVideoUrl
                    }
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
