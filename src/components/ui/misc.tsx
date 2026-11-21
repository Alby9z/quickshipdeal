import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({ className, tone = "neutral", ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: "neutral" | "orange" | "electric" | "green" | "red" | "amber" | "night" }) {
  const tones = {
    neutral: "bg-surface text-muted ring-line",
    orange: "bg-orange-100 text-orange-600 ring-orange-500/20",
    electric: "bg-electric-100 text-electric-500 ring-electric-500/20",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    red: "bg-red-50 text-red-700 ring-red-600/20",
    amber: "bg-amber-50 text-amber-800 ring-amber-600/20",
    night: "bg-night-900 text-white ring-night-900",
  };
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset", tones[tone], className)} {...props} />;
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl border border-line bg-white shadow-card", className)} {...props} />;
}

export function Alert({ tone = "info", title, children, className }: { tone?: "info" | "warning" | "error" | "success"; title?: string; children?: React.ReactNode; className?: string }) {
  const tones = {
    info: "border-electric-500/30 bg-electric-100/60 text-night-900",
    warning: "border-amber-500/40 bg-amber-50 text-amber-900",
    error: "border-red-500/40 bg-red-50 text-red-900",
    success: "border-emerald-500/40 bg-emerald-50 text-emerald-900",
  };
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("rounded-xl border px-4 py-3 text-sm", tones[tone], className)}>
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={title ? "mt-1" : ""}>{children}</div>}
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, children }: { eyebrow?: string; title: string; description?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden bg-night-900 text-white">
      <div className="bg-grid absolute inset-0" aria-hidden />
      <div className="absolute -right-24 -top-24 size-72 rounded-full bg-electric-500/30 blur-3xl" aria-hidden />
      <div className="container-page relative py-12 sm:py-16">
        {eyebrow && <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-orange-500">{eyebrow}</p>}
        <h1 className="max-w-3xl text-3xl font-extrabold text-white sm:text-4xl">{title}</h1>
        {description && <div className="mt-3 max-w-2xl text-white/75">{description}</div>}
        {children}
      </div>
      <div className="route-line h-1" aria-hidden />
    </div>
  );
}

export function EmptyState({ icon, title, children, action }: { icon?: React.ReactNode; title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-surface/60 px-6 py-14 text-center">
      {icon && <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-white text-orange-500 shadow-card">{icon}</div>}
      <h2 className="text-lg font-bold">{title}</h2>
      {children && <div className="mt-2 max-w-md text-sm text-muted">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
