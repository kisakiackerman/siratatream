import { useMemo, useState } from "react";
import { Calculator, X } from "lucide-react";

type ZakatCalculatorProps = {
  onClose: () => void;
};

const DEFAULT_NISAB_GOLD = 5800; // Estimation valeur seuil Nisab en € (85g or)

export default function ZakatCalculator({ onClose }: ZakatCalculatorProps) {
  const [cash, setCash] = useState<number>(0);
  const [goldSilver, setGoldSilver] = useState<number>(0);
  const [investments, setInvestments] = useState<number>(0);
  const [debts, setDebts] = useState<number>(0);
  const [nisab, setNisab] = useState<number>(DEFAULT_NISAB_GOLD);

  const totalAssets = useMemo(() => Math.max(0, cash + goldSilver + investments - debts), [cash, debts, goldSilver, investments]);
  const isEligible = totalAssets >= nisab;
  const zakatDue = useMemo(() => (isEligible ? totalAssets * 0.025 : 0), [isEligible, totalAssets]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-zinc-950 text-white">
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-screen-2xl items-center gap-4 px-6 py-4 lg:px-10">
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 hover:bg-zinc-700" aria-label="Fermer le calculateur">
            <X size={17} />
          </button>
          <Calculator className="text-emerald-400" size={20} />
          <h1 className="text-xl font-bold">Calculateur de Zakat al-Maal (2,5%)</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-8">
        <section className="mb-6 rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-6 text-center shadow-xl">
          <p className="text-xs uppercase tracking-widest text-emerald-400 font-semibold">Montant estimé de Zakat à verser</p>
          <p className="mt-2 text-4xl sm:text-5xl font-black text-white tabular-nums">
            {zakatDue.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </p>
          <p className="mt-2 text-xs text-zinc-400">
            {isEligible
              ? "Votre épargne dépasse le seuil du Nisab (1 an lunaire révolu)."
              : `Épargne inférieure au seuil du Nisab (${nisab} €). Aucune Zakat obligatoire.`}
          </p>
        </section>

        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
              Épargne & Liquidités bancaires (€)
            </label>
            <input
              type="number"
              min={0}
              value={cash || ""}
              onChange={(e) => setCash(Number(e.target.value))}
              placeholder="0"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-white outline-none focus:border-emerald-500"
            />
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
              Or, Argent & Bijoux de thésaurisation (€)
            </label>
            <input
              type="number"
              min={0}
              value={goldSilver || ""}
              onChange={(e) => setGoldSilver(Number(e.target.value))}
              placeholder="0"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-white outline-none focus:border-emerald-500"
            />
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
              Actions, Investissements & Marchandises (€)
            </label>
            <input
              type="number"
              min={0}
              value={investments || ""}
              onChange={(e) => setInvestments(Number(e.target.value))}
              placeholder="0"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-white outline-none focus:border-emerald-500"
            />
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
              Dettes exigibles à déduire (€)
            </label>
            <input
              type="number"
              min={0}
              value={debts || ""}
              onChange={(e) => setDebts(Number(e.target.value))}
              placeholder="0"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-white outline-none focus:border-emerald-500"
            />
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
              Seuil du Nisab configurable (€)
            </label>
            <input
              type="number"
              min={0}
              value={nisab || ""}
              onChange={(e) => setNisab(Number(e.target.value))}
              placeholder="5800"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-white outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      </main>
    </div>
  );
}
