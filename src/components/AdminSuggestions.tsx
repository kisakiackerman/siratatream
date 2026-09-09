import { useEffect, useState } from "react";
import { ShieldCheck, Trash2, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

type AdminSuggestionsProps = {
  onClose: () => void;
};

type Suggestion = {
  id: string;
  user_email: string;
  youtube_url: string;
  title: string;
  note?: string;
  created_at: string;
};

export default function AdminSuggestions({ onClose }: AdminSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("video_suggestions")
        .select("*")
        .order("created_at", { ascending: false });
      setSuggestions((data as Suggestion[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  async function handleDelete(id: string) {
    await supabase.from("video_suggestions").delete().eq("id", id);
    setSuggestions((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-zinc-950 text-white">
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-screen-2xl items-center gap-4 px-6 py-4 lg:px-10">
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 hover:bg-zinc-700" aria-label="Fermer le panneau admin">
            <X size={17} />
          </button>
          <ShieldCheck className="text-emerald-400" size={20} />
          <h1 className="text-xl font-bold">Modération des suggestions de vidéos</h1>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {loading ? (
          <p className="text-zinc-400 text-center py-10">Chargement des suggestions...</p>
        ) : suggestions.length === 0 ? (
          <div className="text-center py-16 text-zinc-500">
            <p className="text-base">Aucune suggestion soumise pour le moment.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {suggestions.map((item) => (
              <div key={item.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="text-white font-bold text-base">{item.title || "Sans titre"}</h3>
                  <a
                    href={item.youtube_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-400 text-xs hover:underline block truncate mt-1"
                  >
                    {item.youtube_url}
                  </a>
                  {item.note && <p className="mt-2 text-xs text-zinc-400 bg-zinc-800/60 p-2.5 rounded-lg">{item.note}</p>}
                  <p className="mt-3 text-[11px] text-zinc-500">
                    Proposé par {item.user_email} le {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.created_at))}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-zinc-500 hover:text-red-400 p-2 rounded-lg hover:bg-zinc-800 transition-colors"
                  title="Supprimer"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
