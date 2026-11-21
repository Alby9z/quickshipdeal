"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const eur = (v: number) => v.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

export function RevenueChart({ data }: { data: { label: string; revenue: number; orders: number }[] }) {
  if (data.every((d) => d.revenue === 0 && d.orders === 0)) return <p className="grid h-64 place-items-center text-sm text-muted">Aucune vente sur la période.</p>;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="h-64" role="img" aria-label="Chiffre d'affaires par période">
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
            <defs><linearGradient id="rev" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FF7A1A" stopOpacity={0.35} /><stop offset="1" stopColor="#FF7A1A" stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid stroke="#E3E8F0" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#5B6B82" }} tickLine={false} axisLine={false} minTickGap={16} />
            <YAxis tickFormatter={eur} tick={{ fontSize: 11, fill: "#5B6B82" }} tickLine={false} axisLine={false} width={70} />
            <Tooltip formatter={(v) => [eur(Number(v)), "CA"]} />
            <Area type="monotone" dataKey="revenue" stroke="#FF7A1A" strokeWidth={2} fill="url(#rev)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="h-64" role="img" aria-label="Commandes payées par période">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
            <CartesianGrid stroke="#E3E8F0" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#5B6B82" }} tickLine={false} axisLine={false} minTickGap={16} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#5B6B82" }} tickLine={false} axisLine={false} width={40} />
            <Tooltip formatter={(v) => [v, "Commandes"]} />
            <Bar dataKey="orders" fill="#1F6BFF" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
