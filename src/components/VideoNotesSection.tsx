import { useState, useCallback } from "react";
import {
  BookOpen,
  Plus,
  Trash2,
  Edit3,
  Check,
  Copy,
  Clock,
  Cloud,
  X,
  Bookmark,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Loader2,
  FileText,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useVideoNotes } from "@/hooks/useVideoNotes";
import { type UserSpiritualNote } from "@/hooks/useAuth";

interface VideoNotesSectionProps {
  contentId: string;
  contentTitle: string;
}

export default function VideoNotesSection({
  contentId,
  contentTitle,
}: VideoNotesSectionProps) {
  const {
    notes,
    saveNote,
    deleteNote,
    syncState,
    errorMessage,
    isAuthenticated,
  } = useVideoNotes(contentId, contentTitle);

  // UI state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  // Form fields (Strictly empty by default, no mock data)
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [showVerseField, setShowVerseField] = useState(false);
  const [verseReference, setVerseReference] = useState("");
  const [verseText, setVerseText] = useState("");
  const [timestamp, setTimestamp] = useState("");

  // Feedback states
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setTitle("");
    setContent("");
    setVerseReference("");
    setVerseText("");
    setTimestamp("");
    setShowVerseField(false);
    setEditingNoteId(null);
    setIsFormOpen(false);
  }, []);

  const handleStartEdit = useCallback((note: UserSpiritualNote) => {
    setEditingNoteId(note.id);
    setTitle(note.title || "");
    setContent(note.content || "");
    setVerseReference(note.verseReference || "");
    setVerseText(note.verseText || "");
    setTimestamp(note.timestamp || "");
    setShowVerseField(Boolean(note.verseReference || note.verseText));
    setIsFormOpen(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && !content.trim()) return;

    const res = await saveNote({
      id: editingNoteId || undefined,
      title: title.trim() || "Réflexion personnelle",
      content: content.trim(),
      verseReference: verseReference.trim() || undefined,
      verseText: verseText.trim() || undefined,
      timestamp: timestamp.trim() || undefined,
    });

    if (res.success) {
      resetForm();
    }
  };

  const handleCopyNote = useCallback(async (note: UserSpiritualNote) => {
    let textToCopy = `📝 ${note.title}\n`;
    if (note.timestamp) textToCopy += `⏱️ Moment : ${note.timestamp}\n`;
    if (note.verseReference) textToCopy += `📖 Verset : ${note.verseReference}\n`;
    if (note.verseText) textToCopy += `« ${note.verseText} »\n`;
    textToCopy += `\n${note.content}\n\n— Tiré de la vidéo : ${contentTitle}`;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedId(note.id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      // ignore
    }
  }, [contentTitle]);

  return (
    <section
      id="video-notes-section"
      className="mb-8 liquid-glass p-4 sm:p-5 rounded-2xl border border-white/15 text-left transition-all"
    >
      {/* Section Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
            <BookOpen size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-white font-bold text-sm sm:text-base">
                Mes Notes &amp; Réflexions
              </h3>
              <span className="text-[11px] px-2 py-0.5 rounded-full font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                {notes.length}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5 hidden sm:block">
              Enregistrez vos méditations, rappels et versets marquants pour cette vidéo.
            </p>
          </div>
        </div>

        {/* Sync Status Badge & Action Button */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Cloud Sync Status */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium border ${
              isAuthenticated
                ? "bg-emerald-500/10 text-emerald-300 border-emerald-400/30"
                : "bg-amber-500/10 text-amber-300 border-amber-400/30"
            }`}
            title={
              isAuthenticated
                ? "Vos notes sont sauvegardées en temps réel dans votre base Cloud Firestore."
                : "Vos notes sont sauvegardées sur cet appareil. Connectez-vous avec Google ou Apple pour synchroniser sur le Cloud."
            }
          >
            {syncState === "saving" ? (
              <>
                <Loader2 size={11} className="animate-spin text-emerald-400" />
                <span>Synchronisation...</span>
              </>
            ) : syncState === "synced" ? (
              <>
                <Check size={11} className="text-emerald-400" />
                <span>Enregistré Firestore</span>
              </>
            ) : (
              <>
                <Cloud size={11} />
                <span>{isAuthenticated ? "Cloud Firestore" : "Local"}</span>
              </>
            )}
          </div>

          {/* New Note Button */}
          {!isFormOpen && (
            <button
              type="button"
              id="add-video-note-btn"
              onClick={() => {
                resetForm();
                setIsFormOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full liquid-glass-emerald text-emerald-100 hover:text-white text-xs font-bold border border-emerald-400/40 hover:scale-105 active:scale-95 transition-all shadow-sm"
            >
              <Plus size={13} />
              <span>Ajouter une note</span>
            </button>
          )}
        </div>
      </div>

      {/* Error Notice */}
      {errorMessage && (
        <div className="mt-3 p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle size={14} className="flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Note Creation / Edit Form */}
      <AnimatePresence>
        {isFormOpen && (
          <motion.form
            id="video-note-form"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSubmit}
            className="mt-4 p-4 rounded-2xl bg-zinc-950/70 border border-emerald-400/30 space-y-3 overflow-hidden"
          >
            <div className="flex items-center justify-between pb-1">
              <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                <FileText size={13} />
                <span>{editingNoteId ? "Modifier la note" : "Nouvelle note ou verset marqué"}</span>
              </h4>
              <button
                type="button"
                onClick={resetForm}
                className="p-1 text-zinc-400 hover:text-white rounded-lg transition-colors"
                title="Fermer"
              >
                <X size={14} />
              </button>
            </div>

            {/* Note Title Input */}
            <div>
              <label htmlFor="note-title-input" className="block text-[11px] font-medium text-zinc-300 mb-1">
                Titre ou thème de la réflexion
              </label>
              <input
                id="note-title-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Méditation sur la confiance en Allah, Leçon sur la patience..."
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-emerald-400/60 transition-colors"
              />
            </div>

            {/* Note Content Textarea */}
            <div>
              <label htmlFor="note-content-input" className="block text-[11px] font-medium text-zinc-300 mb-1">
                Vos notes personnelles, enseignements ou dou'as
              </label>
              <textarea
                id="note-content-input"
                rows={3}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Rédigez ce qui vous a marqué dans ce rappel, les points clés à appliquer..."
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-emerald-400/60 transition-colors resize-y min-h-[75px]"
                required
              />
            </div>

            {/* Optional Quranic Verse Collapsible Accordion */}
            <div className="pt-1">
              <button
                type="button"
                id="toggle-verse-field-btn"
                onClick={() => setShowVerseField(!showVerseField)}
                className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-semibold transition-colors"
              >
                <Bookmark size={13} />
                <span>
                  {showVerseField ? "Masquer le verset marqué" : "+ Marquer un verset du Coran / Hadith (Optionnel)"}
                </span>
                {showVerseField ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>

              {showVerseField && (
                <div className="mt-2.5 p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/25 space-y-2.5">
                  <div>
                    <label htmlFor="note-verse-ref-input" className="block text-[10px] font-medium text-emerald-300 mb-1">
                      Référence du Verset (Sourate et Numéro)
                    </label>
                    <input
                      id="note-verse-ref-input"
                      type="text"
                      value={verseReference}
                      onChange={(e) => setVerseReference(e.target.value)}
                      placeholder="Ex: Sourate Al-Kahf (18:10), Sourate Al-Baqarah (2:286)..."
                      className="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-emerald-400/30 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div>
                    <label htmlFor="note-verse-text-input" className="block text-[10px] font-medium text-emerald-300 mb-1">
                      Extrait, Traduction ou Texte du verset
                    </label>
                    <textarea
                      id="note-verse-text-input"
                      rows={2}
                      value={verseText}
                      onChange={(e) => setVerseText(e.target.value)}
                      placeholder="« Seigneur, accorde-nous de Ta part une miséricorde et assure-nous la droiture dans tout ce qui nous concerne. »"
                      className="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-emerald-400/30 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-emerald-400 resize-y"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Optional Video Timestamp */}
            <div className="flex items-center gap-2 pt-1">
              <label htmlFor="note-timestamp-input" className="flex items-center gap-1 text-[11px] text-zinc-400 flex-shrink-0">
                <Clock size={12} />
                <span>Repère temporel :</span>
              </label>
              <input
                id="note-timestamp-input"
                type="text"
                value={timestamp}
                onChange={(e) => setTimestamp(e.target.value)}
                placeholder="Ex: 03:45"
                className="w-24 px-2.5 py-1 rounded-lg bg-white/5 border border-white/15 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-emerald-400 font-mono"
              />
            </div>

            {/* Form Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                id="cancel-note-btn"
                onClick={resetForm}
                className="px-3.5 py-1.5 rounded-full text-xs font-medium text-zinc-400 hover:text-white transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                id="save-note-submit-btn"
                disabled={syncState === "saving"}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full liquid-glass-emerald text-emerald-100 font-bold text-xs border border-emerald-400/40 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
              >
                {syncState === "saving" ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Sauvegarde...</span>
                  </>
                ) : (
                  <>
                    <Check size={13} />
                    <span>{editingNoteId ? "Mettre à jour" : "Enregistrer dans Firestore"}</span>
                  </>
                )}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Notes List Display */}
      <div className="mt-4 space-y-3">
        {notes.length === 0 && !isFormOpen ? (
          <div
            id="notes-empty-state"
            className="py-6 px-4 rounded-xl bg-white/[0.02] border border-dashed border-white/15 text-center space-y-2"
          >
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-400/20 text-emerald-400 flex items-center justify-center mx-auto">
              <BookOpen size={18} />
            </div>
            <p className="text-xs font-medium text-zinc-300">
              Aucune note enregistrée pour cette vidéo.
            </p>
            <p className="text-[11px] text-zinc-500 max-w-sm mx-auto">
              Rédigez vos méditations personnelles, enseignements spirituels ou versets marquants pour y revenir à tout moment.
            </p>
            <button
              type="button"
              id="empty-state-add-note-btn"
              onClick={() => {
                resetForm();
                setIsFormOpen(true);
              }}
              className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 text-xs font-bold border border-emerald-400/30 transition-all active:scale-95"
            >
              <Plus size={13} />
              <span>Rédiger ma première note</span>
            </button>
          </div>
        ) : (
          notes.map((note) => {
            const isDeleting = deletingId === note.id;

            return (
              <div
                key={note.id}
                id={`note-card-${note.id}`}
                className="group relative p-3.5 sm:p-4 rounded-xl bg-zinc-900/60 hover:bg-zinc-900/90 border border-white/10 hover:border-emerald-400/30 transition-all space-y-2 text-left"
              >
                {/* Note Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-white leading-snug">
                      {note.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-400 flex-wrap">
                      <span>{note.date}</span>
                      {note.timestamp && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/10 text-emerald-300 font-mono">
                          <Clock size={10} />
                          {note.timestamp}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Toolbar */}
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    {/* Copy button */}
                    <button
                      type="button"
                      onClick={() => handleCopyNote(note)}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors relative"
                      title="Copier la note"
                    >
                      {copiedId === note.id ? (
                        <Check size={13} className="text-emerald-400" />
                      ) : (
                        <Copy size={13} />
                      )}
                      {copiedId === note.id && (
                        <span className="absolute -top-6 -right-1 text-[9px] bg-emerald-950 text-emerald-200 px-1.5 py-0.5 rounded border border-emerald-400/40 whitespace-nowrap shadow">
                          Copié !
                        </span>
                      )}
                    </button>

                    {/* Edit button */}
                    <button
                      type="button"
                      onClick={() => handleStartEdit(note)}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-emerald-300 transition-colors"
                      title="Modifier"
                    >
                      <Edit3 size={13} />
                    </button>

                    {/* Delete button */}
                    {isDeleting ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            deleteNote(note.id);
                            setDeletingId(null);
                          }}
                          className="px-2 py-0.5 rounded bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-bold"
                          title="Confirmer la suppression"
                        >
                          Oui
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingId(null)}
                          className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[10px]"
                          title="Annuler"
                        >
                          Non
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeletingId(note.id)}
                        className="p-1.5 rounded-lg hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 transition-colors"
                        title="Supprimer la note"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Marked Quranic Verse (if present) */}
                {note.verseReference && (
                  <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/25 space-y-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-300">
                      <Bookmark size={12} className="fill-emerald-400 text-emerald-400" />
                      <span>{note.verseReference}</span>
                    </div>
                    {note.verseText && (
                      <p className="text-[11px] text-emerald-100/90 italic leading-relaxed pl-4 border-l-2 border-emerald-400/40">
                        « {note.verseText} »
                      </p>
                    )}
                  </div>
                )}

                {/* Note Content Text */}
                {note.content && (
                  <p className="text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap">
                    {note.content}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
