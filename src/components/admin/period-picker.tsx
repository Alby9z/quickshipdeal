import Link from "next/link";
import { cn } from "@/lib/utils";

const P = [["today", "Aujourd'hui"], ["7d", "7 jours"], ["30d", "30 jours"], ["12m", "12 mois"]] as const;

export function PeriodPicker({ base, current, from, to }: { base: string; current?: string; from?: string; to?: string }) {
  const cur = current ?? "30d";
  return (
    <div className="flex flex-wrap items-center gap-2">
      {P.map(([k, l]) => <Link key={k} href={`${base}?p=${k}`} className={cn("rounded-lg px-3 py-1.5 text-sm font-medium", cur === k ? "bg-night-900 text-white" : "border border-line bg-white")}>{l}</Link>)}
      <form className="flex items-center gap-1">
        <input type="hidden" name="p" value="custom" />
        <input type="date" name="from" defaultValue={from} className="h-9 rounded-lg border border-line bg-white px-2 text-sm" aria-label="Du" />
        <input type="date" name="to" defaultValue={to} className="h-9 rounded-lg border border-line bg-white px-2 text-sm" aria-label="Au" />
        <button className={cn("h-9 rounded-lg px-3 text-sm font-medium", cur === "custom" ? "bg-night-900 text-white" : "border border-line bg-white")}>Personnalisée</button>
      </form>
    </div>
  );
}
