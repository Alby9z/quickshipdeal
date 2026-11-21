import Link from "next/link";
import { cn } from "@/lib/utils";

export function AdminTitle({ title, description, actions }: { title: string; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div><h1 className="text-2xl font-extrabold">{title}</h1>{description && <p className="mt-1 text-sm text-muted">{description}</p>}</div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, children, className, actions }: { title?: string; children: React.ReactNode; className?: string; actions?: React.ReactNode }) {
  return (
    <section className={cn("rounded-2xl border border-line bg-white p-5 shadow-card", className)}>
      {(title || actions) && <div className="mb-4 flex items-center justify-between gap-2">{title && <h2 className="text-base font-bold">{title}</h2>}{actions}</div>}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: React.ReactNode; hint?: string; tone?: "orange" | "electric" | "green" | "red" }) {
  const bar = { orange: "bg-orange-500", electric: "bg-electric-500", green: "bg-emerald-500", red: "bg-red-500" }[tone ?? "electric"];
  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-white p-5 shadow-card">
      <span className={cn("absolute inset-x-0 top-0 h-1", bar)} aria-hidden />
      <p className="text-xs font-medium uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-2 text-2xl font-extrabold text-night-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Table({ head, children, empty }: { head: React.ReactNode[]; children: React.ReactNode; empty?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-white">
      <table className="w-full text-sm">
        <thead className="bg-surface text-left text-xs uppercase tracking-wider text-muted"><tr>{head.map((h, i) => <th key={i} className="whitespace-nowrap px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
      {empty && <p className="p-8 text-center text-sm text-muted">Aucun élément.</p>}
    </div>
  );
}
export const Td = ({ children, className }: { children?: React.ReactNode; className?: string }) => <td className={cn("px-4 py-3 align-middle", className)}>{children}</td>;

export function Pager({ page, pages, base }: { page: number; pages: number; base: string }) {
  if (pages <= 1) return null;
  const sep = base.includes("?") ? "&" : "?";
  return (
    <nav className="mt-4 flex items-center justify-end gap-2 text-sm" aria-label="Pagination">
      {page > 1 && <Link href={`${base}${sep}page=${page - 1}`} className="rounded-lg border border-line bg-white px-3 py-1.5">Précédent</Link>}
      <span className="text-muted">{page} / {pages}</span>
      {page < pages && <Link href={`${base}${sep}page=${page + 1}`} className="rounded-lg border border-line bg-white px-3 py-1.5">Suivant</Link>}
    </nav>
  );
}

export function SearchBar({ placeholder, defaultValue, extra }: { placeholder: string; defaultValue?: string; extra?: React.ReactNode }) {
  return (
    <form className="mb-4 flex flex-wrap gap-2">
      <input name="q" defaultValue={defaultValue} placeholder={placeholder} className="h-10 min-w-56 flex-1 rounded-xl border border-line bg-white px-3 text-sm" aria-label="Rechercher" />
      {extra}
      <button className="h-10 rounded-xl bg-night-900 px-4 text-sm font-semibold text-white">Filtrer</button>
    </form>
  );
}
