import { useState, useRef, useEffect, useCallback } from "react";
import {
  Sparkles,
  X,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Play,
  RotateCcw,
  Compass,
  Clock3,
  Calculator,
  BookOpen,
  HelpCircle,
  Film,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Bot,
  User,
  Flame,
  ArrowRight,
  Bookmark,
  Share2,
} from "lucide-react";
import {
  sendAIMessage,
  type ChatMessage,
  type ParsedAction,
  type ParsedQuiz,
} from "@/lib/aiService";
import { catalog, type ContentItem } from "@/data/catalog";

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectContent: (id: string) => void;
  onOpenIslamicHubTab?: (tab: "calendar" | "prayer" | "qibla" | "duas" | "tasbih" | "zakat") => void;
  onOpenMyList?: () => void;
  onOpenOffline?: () => void;
  onOpenCatalog?: () => void;
}

const QUICK_PROMPTS = [
  { icon: Film, label: "Raconte l'histoire du Prophète Moussa", cat: "story" },
  { icon: HelpCircle, label: "Lance un quiz sur les Compagnons", cat: "quiz" },
  { icon: BookOpen, label: "Doua contre l'angoisse et les soucis", cat: "dua" },
  { icon: Calculator, label: "Comment calculer ma Zakat al-Maal ?", cat: "zakat" },
  { icon: Compass, label: "Comment s'orienter vers la Qibla ?", cat: "qibla" },
  { icon: Clock3, label: "Quels sont les bienfaits de la prière de nuit (Tahajjoud) ?", cat: "prayer" },
];

export default function AIAssistantModal({
  isOpen,
  onClose,
  onSelectContent,
  onOpenIslamicHubTab,
  onOpenMyList,
  onOpenOffline,
  onOpenCatalog,
}: AIAssistantModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: "welcome-1",
      role: "assistant",
      content: `**Assalamu 'alaykum ! Je suis Noor IA 🌟**\n\nVotre érudit et assistant spirituel sur **SiratStream**. Je réponds à toutes vos questions sur la **religion musulmane**, même au-delà des contenus de l'application :\n\n- 📖 **Exégèse & Coran** : Explication de versets, sourates, contextes de révélation\n- 📜 **Sîra & Histoire** : Vie des Prophètes, des Compagnons (*Sahaba*) et savants\n- 🕌 **Pratique religieuse & Fiqh** : Prière (*Salat*), jeûne, ablutions, Zakat, Hajj, éthique (*Adab*)\n- 🤲 **Invocations authentiques** : Douas en arabe, phonétique et français avec leurs mérites\n- 🎬 **Catalogue & Outils** : Recommandation de vidéos, Qibla, Horaires de prière, Chapelet Tasbih\n- 🎯 **Quiz & Méditation** : Testez vos connaissances et purifiez votre cœur.\n\n*(Note : Conformément à ma vocation, mes réponses sont strictement consacrées au cadre religieux et spirituel musulman).*`,
      timestamp: Date.now(),
    },
  ]);

  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages]);

  // Handle Speech Recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = "fr-FR";
        recognition.interimResults = false;

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          if (transcript) {
            setInputValue(transcript);
            handleSend(transcript);
          }
          setIsListening(false);
        };

        recognition.onerror = () => {
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleSpeechRecognition = () => {
    if (!recognitionRef.current) {
      alert("La reconnaissance vocale n'est pas supportée par votre navigateur.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch {
        setIsListening(false);
      }
    }
  };

  // Text-To-Speech
  const handleSpeakText = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    // Clean markdown characters for voice reading
    const cleanVoiceText = text
      .replace(/[*#`_~]/g, "")
      .replace(/\[ACTION:[^\]]+\]/g, "")
      .replace(/\n+/g, ". ");

    const utterance = new SpeechSynthesisUtterance(cleanVoiceText);
    utterance.lang = "fr-FR";
    utterance.rate = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  // Copy Message to clipboard
  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSend = async (customText?: string) => {
    const textToSend = customText || inputValue;
    if (!textToSend.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: textToSend.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      // Build conversation history for API
      const history = [...messages, userMessage].map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      const res = await sendAIMessage(history);

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: res.text,
        timestamp: Date.now(),
        parsedAction: res.action,
        parsedQuiz: res.quiz,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: "Désolé, une erreur est survenue lors de l'échange. Vous pouvez réessayer votre question.",
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteAction = (action: ParsedAction) => {
    if (action.type === "open_tool" && action.tool) {
      onClose();
      if (action.tool === "qibla" && onOpenIslamicHubTab) onOpenIslamicHubTab("qibla");
      else if (action.tool === "prayer" && onOpenIslamicHubTab) onOpenIslamicHubTab("prayer");
      else if (action.tool === "zakat" && onOpenIslamicHubTab) onOpenIslamicHubTab("zakat");
      else if (action.tool === "duas" && onOpenIslamicHubTab) onOpenIslamicHubTab("duas");
      else if (action.tool === "tasbih" && onOpenIslamicHubTab) onOpenIslamicHubTab("tasbih");
      else if (action.tool === "mylist" && onOpenMyList) onOpenMyList();
      else if (action.tool === "offline" && onOpenOffline) onOpenOffline();
      else if (action.tool === "catalog" && onOpenCatalog) onOpenCatalog();
      else if (onOpenIslamicHubTab) onOpenIslamicHubTab("calendar");
    } else if (action.videoItem) {
      onClose();
      onSelectContent(action.videoItem.id);
    } else if (action.searchQuery) {
      const match = catalog.find(
        (c) =>
          c.title.toLowerCase().includes(action.searchQuery!.toLowerCase()) ||
          c.description.toLowerCase().includes(action.searchQuery!.toLowerCase())
      );
      if (match) {
        onClose();
        onSelectContent(match.id);
      }
    }
  };

  const handleSelectQuizOption = (messageId: string, optionIndex: number) => {
    setQuizAnswers((prev) => ({ ...prev, [messageId]: optionIndex }));
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: "assistant",
        content: `Conversation réinitialisée. Je suis prêt pour votre prochaine question ou demande ! ✨`,
        timestamp: Date.now(),
      },
    ]);
    setQuizAnswers({});
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-4xl h-[92vh] max-h-[850px] liquid-glass-modal rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-white/20">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-28 bg-emerald-500/15 blur-3xl pointer-events-none rounded-full" />

        {/* Modal Header */}
        <div className="relative z-10 flex items-center justify-between px-4 sm:px-7 py-3 sm:py-4 border-b border-white/10 bg-white/5 backdrop-blur-xl">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 mr-2">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl liquid-glass-emerald flex items-center justify-center text-emerald-300 shadow-lg border border-emerald-300/40 flex-shrink-0">
              <Sparkles size={18} className="animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                  Noor IA <span className="text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 rounded-full liquid-glass-emerald text-emerald-300 border border-emerald-400/40 font-medium">Universel</span>
                </h2>
              </div>
              <p className="text-[11px] sm:text-xs text-zinc-300 truncate">Assistant intelligent streaming & spiritualité</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <button
              onClick={handleClearHistory}
              title="Réinitialiser la conversation"
              className="p-2 rounded-full liquid-glass text-zinc-300 hover:text-white hover:bg-white/15 border border-white/15 transition-colors"
            >
              <RotateCcw size={16} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full liquid-glass text-zinc-300 hover:text-white hover:bg-white/15 border border-white/15 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6">
          {messages.map((msg) => {
            const isUser = msg.role === "user";
            return (
              <div
                key={msg.id}
                className={`flex gap-3.5 ${isUser ? "justify-end" : "justify-start"}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-full liquid-glass-emerald flex items-center justify-center text-emerald-300 flex-shrink-0 mt-1 shadow-sm border border-emerald-400/30">
                    <Bot size={18} />
                  </div>
                )}

                <div className={`max-w-[88%] sm:max-w-[80%] space-y-3`}>
                  {/* Message Bubble */}
                  <div
                    className={`px-4 sm:px-5 py-3.5 rounded-2xl text-sm leading-relaxed ${
                      isUser
                        ? "liquid-glass-emerald text-white rounded-br-none border border-emerald-400/40 shadow-lg"
                        : "liquid-glass text-zinc-100 border border-white/15 rounded-bl-none shadow-lg"
                    }`}
                  >
                    <div className="whitespace-pre-wrap select-text space-y-2">
                      {msg.content.split("\n\n").map((para, pIdx) => {
                        // Formatting helpers for bold and lists
                        return (
                          <p key={pIdx} className="leading-relaxed">
                            {para.split("**").map((chunk, cIdx) =>
                              cIdx % 2 === 1 ? (
                                <strong key={cIdx} className="font-semibold text-white">
                                  {chunk}
                                </strong>
                              ) : (
                                chunk
                              )
                            )}
                          </p>
                        );
                      })}
                    </div>

                    {/* Bottom actions for assistant message */}
                    {!isUser && (
                      <div className="flex items-center gap-3 pt-3 mt-3 border-t border-white/10 text-xs text-zinc-300">
                        <button
                          onClick={() => handleSpeakText(msg.content)}
                          className="flex items-center gap-1 hover:text-emerald-300 transition-colors"
                          title="Écouter la réponse"
                        >
                          {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
                          <span>{isSpeaking ? "Arrêter" : "Écouter"}</span>
                        </button>

                        <button
                          onClick={() => handleCopyMessage(msg.id, msg.content)}
                          className="flex items-center gap-1 hover:text-white transition-colors ml-auto"
                          title="Copier le texte"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check size={13} className="text-emerald-400" />
                              <span className="text-emerald-400">Copié</span>
                            </>
                          ) : (
                            <>
                              <Copy size={13} />
                              <span>Copier</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Render Action Card if present and strictly valid */}
                  {msg.parsedAction &&
                    ((msg.parsedAction.type === "video_recommendation" && !!msg.parsedAction.videoItem) ||
                      (msg.parsedAction.type === "open_tool" && !!msg.parsedAction.tool)) && (
                      <div className="p-4 rounded-2xl liquid-glass-emerald border border-emerald-400/30 shadow-xl space-y-3 animate-in fade-in duration-300">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                            <Flame size={14} />
                            {msg.parsedAction.type === "video_recommendation" ? "Vidéo en rapport avec la question" : "Outil Recommandé"}
                          </span>
                          {msg.parsedAction.type === "video_recommendation" && (
                            <span className="text-[11px] px-2.5 py-0.5 rounded-full liquid-glass text-emerald-200 border border-emerald-400/30 font-medium">
                              Streaming Immédiat
                            </span>
                          )}
                        </div>

                        {msg.parsedAction.type === "video_recommendation" && msg.parsedAction.videoItem ? (
                          <div className="flex flex-col sm:flex-row gap-3.5 items-start sm:items-center liquid-glass p-3 rounded-xl border border-white/15">
                            <img
                              src={msg.parsedAction.videoItem.thumbnail}
                              alt={msg.parsedAction.videoItem.title}
                              className="w-full sm:w-28 h-20 sm:h-16 object-cover rounded-lg flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-bold text-white line-clamp-1">
                                {msg.parsedAction.videoItem.title}
                              </h4>
                              <p className="text-xs text-zinc-300 line-clamp-1 mt-0.5">
                                {msg.parsedAction.videoItem.channel} • {msg.parsedAction.videoItem.categories[0]}
                              </p>
                              {msg.parsedAction.reason && (
                                <p className="text-[11px] text-emerald-300 italic mt-1 line-clamp-1">
                                  « {msg.parsedAction.reason} »
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => handleExecuteAction(msg.parsedAction!)}
                              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 liquid-glass-emerald text-emerald-100 font-semibold text-xs rounded-full border border-emerald-300/40 transition-all shadow-md active:scale-95 flex-shrink-0"
                            >
                              <Play size={14} fill="currentColor" />
                              Regarder
                            </button>
                          </div>
                        ) : msg.parsedAction.type === "open_tool" ? (
                          <div className="flex items-center justify-between gap-4">
                            <p className="text-xs text-zinc-200">
                              Accédez directement à l'outil dans l'application :
                            </p>
                            <button
                              onClick={() => handleExecuteAction(msg.parsedAction!)}
                              className="flex items-center gap-2 px-4 py-2 liquid-glass-emerald text-emerald-100 font-semibold text-xs rounded-full border border-emerald-300/40 transition-all shadow-md active:scale-95 flex-shrink-0"
                            >
                              <span>Ouvrir l'outil</span>
                              <ArrowRight size={14} />
                            </button>
                          </div>
                        ) : null}
                      </div>
                    )}

                  {/* Render Quiz Card if present */}
                  {msg.parsedQuiz && (
                    <div className="p-4 sm:p-5 rounded-2xl liquid-glass border border-white/20 shadow-xl space-y-4 animate-in fade-in duration-300">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                          <HelpCircle size={15} />
                          Quiz Interactif
                        </span>
                      </div>

                      <h4 className="text-sm sm:text-base font-bold text-white leading-snug">
                        {msg.parsedQuiz.question}
                      </h4>

                      <div className="grid grid-cols-1 gap-2">
                        {msg.parsedQuiz.options.map((option, optIdx) => {
                          const selected = quizAnswers[msg.id] !== undefined;
                          const isUserChoice = quizAnswers[msg.id] === optIdx;
                          const isCorrect = msg.parsedQuiz!.correctIndex === optIdx;

                          let btnClasses = "liquid-glass text-zinc-200 border border-white/15 hover:bg-white/15";
                          if (selected) {
                            if (isCorrect) {
                              btnClasses = "liquid-glass-emerald text-emerald-200 border border-emerald-400";
                            } else if (isUserChoice) {
                              btnClasses = "bg-rose-500/20 text-rose-200 border border-rose-400/40 backdrop-blur-xl";
                            } else {
                              btnClasses = "liquid-glass text-zinc-400 border border-white/10 opacity-50";
                            }
                          }

                          return (
                            <button
                              key={optIdx}
                              disabled={selected}
                              onClick={() => handleSelectQuizOption(msg.id, optIdx)}
                              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all text-left ${btnClasses}`}
                            >
                              <span>{option}</span>
                              {selected && isCorrect && (
                                <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                              )}
                              {selected && isUserChoice && !isCorrect && (
                                <XCircle size={16} className="text-rose-400 flex-shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {quizAnswers[msg.id] !== undefined && (
                        <div className="p-3 rounded-xl liquid-glass-emerald border border-emerald-400/30 text-xs text-emerald-200 leading-relaxed animate-in fade-in duration-200">
                          <strong>Explication :</strong> {msg.parsedQuiz.explanation}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-full liquid-glass border border-white/20 flex items-center justify-center text-zinc-200 flex-shrink-0 mt-1 shadow-sm">
                    <User size={18} />
                  </div>
                )}
              </div>
            );
          })}

          {isLoading && (
            <div className="flex gap-3.5 justify-start">
              <div className="w-8 h-8 rounded-full liquid-glass-emerald border border-emerald-400/30 flex items-center justify-center text-emerald-300 flex-shrink-0 mt-1">
                <Bot size={18} />
              </div>
              <div className="px-5 py-3.5 rounded-2xl liquid-glass text-zinc-300 text-sm flex items-center gap-2 border border-white/15">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <span className="text-xs">Noor IA réfléchit et prépare votre réponse...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestions Chips */}
        <div className="px-4 sm:px-6 py-2.5 bg-black/20 border-t border-white/10 overflow-x-auto flex items-center gap-2 no-scrollbar backdrop-blur-md">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex-shrink-0 flex items-center gap-1">
            <Sparkles size={12} className="text-emerald-400" /> Suggéré :
          </span>
          {QUICK_PROMPTS.map((p, idx) => {
            const Icon = p.icon;
            return (
              <button
                key={idx}
                onClick={() => handleSend(p.label)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full liquid-glass hover:bg-white/15 text-zinc-200 hover:text-white border border-white/15 hover:border-emerald-400/40 text-xs whitespace-nowrap transition-all flex-shrink-0 shadow-sm active:scale-95"
              >
                <Icon size={12} className="text-emerald-400" />
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-5 bg-black/40 border-t border-white/10 backdrop-blur-xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2 sm:gap-3 liquid-glass border border-white/20 focus-within:border-emerald-400/60 rounded-2xl p-1.5 sm:p-2 transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]"
          >
            <button
              type="button"
              onClick={toggleSpeechRecognition}
              title={isListening ? "Arrêter la dictée" : "Parler à l'IA"}
              className={`p-2.5 rounded-xl transition-all ${
                isListening
                  ? "bg-rose-600 text-white animate-pulse shadow-lg shadow-rose-900/40"
                  : "text-zinc-400 hover:text-white hover:bg-white/10"
              }`}
            >
              {isListening ? <MicOff size={18} /> : <Mic size={18} />}
            </button>

            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Posez une question, cherchez un récit ou commandez l'application..."
              className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-400 outline-none px-2"
              disabled={isLoading}
            />

            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="p-2.5 rounded-xl liquid-glass-emerald hover:scale-105 disabled:opacity-40 disabled:hover:scale-100 text-emerald-100 border border-emerald-400/40 transition-all shadow-md shadow-emerald-950/50 active:scale-95"
            >
              <Send size={16} />
            </button>
          </form>
          <p className="text-[10px] text-center text-zinc-400 mt-2">
            Noor IA est propulsé par Gemini pour SiratStream • Récits vérifiés, Sîra & Outils spirituels.
          </p>
        </div>
      </div>
    </div>
  );
}
