import Link from "next/link";
import { Compass } from "lucide-react";
import { Logo } from "@/components/layout/logo";

export default function NotFound() {
  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden bg-night-900 px-4 text-center text-white">
      <div className="bg-grid absolute inset-0" aria-hidden />
      <div className="relative">
        <div className="mb-10 flex justify-center"><Logo dark /></div>
        <p className="font-display text-[7rem] font-extrabold leading-none text-transparent [-webkit-text-stroke:2px_#FF7A1A]">404</p>
        <h1 className="mt-4 text-2xl font-extrabold text-white">Ce colis s&apos;est égaré</h1>
        <p className="mt-2 text-white/70">La page demandée n&apos;existe pas ou a été déplacée.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white hover:bg-orange-600">Retour à l&apos;accueil</Link>
          <Link href="/boutique" className="flex items-center gap-2 rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold"><Compass className="size-4" aria-hidden /> Explorer la boutique</Link>
        </div>
      </div>
    </div>
  );
}
