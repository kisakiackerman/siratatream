import { useState } from "react";
import { RotateCcw, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useViewerProfile } from "@/hooks/useViewerProfile";

type TasbihCounterProps = {
  onClose: () => void;
};

const DHIKRS = [
  "SubhanAllah (Gloire à Allah)",
  "Alhamdulillah (Louange à Allah)",
  "Allahu Akbar (Allah est le Plus Grand)",
  "Astaghfirullah (Je demande pardon à Allah)",
  "La ilaha illallah (Nulle divinité sauf Allah)",
  "SubhanAllahi wa bihamdihi",
  "La hawla wa la quwwata illa billah",
] as const;

const GOALS = [33, 99, 100, 0] as const;

export default function TasbihCounter({ onClose }: TasbihCounterProps) {
  const { activeProfile } = useViewerProfile();
  const [dhikr, setDhikr] = useState<(typeof DHIKRS)[number]>(DHIKRS[0]);
  const [goal, setGoal] = useState<number>(33);
  const [count, setCount] = useState(0);
  const [saving, setSaving] = useState(false);

  async function saveLog() {
    if (!activeProfile || count === 0 || saving) return;
    setSaving(true);
    await supabase.from("dhikr_logs").insert({
      viewer_profile_id: activeProfile.id,
      dhikr_type: dhikr,
      count,
    });
    setSaving(false);
  }

  async function reset() {
    await saveLog();
    setCount(0);
  }

  async function close() {
    await saveLog();
    onClose();
  }

  const reachedGoal = goal > 0 && count >= goal;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
      <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-white shadow-2xl">
        <button
          onClick={close}
          className="absolute right-4 top-4 text-zinc-400 transition-colors hover:text-white"
          aria-label="Fermer le compteur de dhikr"
        >
          <X size={20} />
        </button>
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
          Tasbih numérique
        </p>
        <h2 className="mb-6 text-2xl font-bold">Compteur de dhikr</h2>

        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Formule d'évocation (Dhikr)
        </label>
        <select
          value={dhikr}
          onChange={(event) => setDhikr(event.target.value as (typeof DHIKRS)[number])}
          className="mb-5 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-3 text-white text-sm outline-none focus:border-emerald-500"
        >
          {DHIKRS.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>

        <div className="mb-6 flex flex-wrap gap-2">
          {GOALS.map((value) => (
            <button
              key={value}
              onClick={() => setGoal(value)}
              className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                goal === value
                  ? "border-amber-400 bg-amber-400/15 text-amber-300 font-semibold"
                  : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white"
              }`}
            >
              {value === 0 ? "Illimité" : `Objectif : ${value}`}
            </button>
          ))}
        </div>

        <button
          onClick={() => setCount((current) => current + 1)}
          className={`mx-auto mb-5 flex aspect-square w-52 sm:w-56 flex-col items-center justify-center rounded-full border-8 transition-all active:scale-95 shadow-2xl cursor-pointer ${
            reachedGoal
              ? "border-emerald-400 bg-emerald-900/30 text-emerald-300"
              : "border-amber-400/70 bg-zinc-900 hover:bg-zinc-850 text-white"
          }`}
          aria-label="Incrémenter le compteur"
        >
          <span className="text-5xl sm:text-6xl font-black tabular-nums">{count}</span>
          <span className="mt-2 text-xs sm:text-sm text-zinc-400">
            {goal === 0 ? "sans objectif" : `sur ${goal}`}
          </span>
        </button>

        <div className="flex items-center justify-between pt-2">
          <span className={reachedGoal ? "text-emerald-400 text-xs sm:text-sm font-medium" : "text-zinc-400 text-xs"}>
            {reachedGoal ? "🎉 Objectif atteint !" : dhikr.split(" ")[0]}
          </span>
          <button
            onClick={reset}
            disabled={count === 0 || saving}
            className="flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-xs sm:text-sm text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white disabled:opacity-40"
          >
            <RotateCcw size={14} />
            Réinitialiser
          </button>
        </div>
      </div>
    </div>
  );
}
