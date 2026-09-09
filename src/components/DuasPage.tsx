import { useState } from "react";
import { BookOpen, X } from "lucide-react";
import { DUA_THEMES, duas, type DuaTheme } from "@/data/duas";

type DuasPageProps = {
  onClose: () => void;
};

export default function DuasPage({ onClose }: DuasPageProps) {
  const [theme, setTheme] = useState<DuaTheme>(DUA_THEMES[0]);
  const visibleDuas = duas.filter((dua) => dua.theme === theme);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-zinc-950 text-white">
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-screen-2xl items-center gap-4 px-6 py-4 lg:px-10">
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 text-white transition-colors hover:bg-zinc-700"
            aria-label="Fermer les douas"
          >
            <X size={17} />
          </button>
          <BookOpen className="text-amber-400" size={20} />
          <h1 className="text-xl font-bold">Invocations & Douas authentiques</h1>
        </div>
      </header>

      <main className="mx-auto max-w-screen-2xl px-6 py-8 lg:px-10">
        <div className="mb-8 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {DUA_THEMES.map((item) => (
            <button
              key={item}
              onClick={() => setTheme(item)}
              className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                theme === item
                  ? "bg-emerald-600 text-white shadow-lg"
                  : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {visibleDuas.map((dua) => (
            <article key={dua.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 flex flex-col justify-between shadow-xl">
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className="inline-flex items-center rounded-md bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-400 border border-amber-500/20">
                    {dua.theme}
                  </span>
                  <span className="text-xs text-zinc-400 font-medium">{dua.reference}</span>
                </div>
                <p dir="rtl" lang="ar" className="mb-5 text-right text-2xl sm:text-3xl leading-loose font-serif text-amber-100">
                  {dua.arabic}
                </p>
                <p className="mb-3 text-xs sm:text-sm italic leading-relaxed text-zinc-400">
                  « {dua.transliteration} »
                </p>
                <p className="mb-4 text-sm leading-relaxed text-zinc-200">
                  {dua.translation}
                </p>
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400 pt-3 border-t border-zinc-800/80">
                Source : {dua.reference}
              </p>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
