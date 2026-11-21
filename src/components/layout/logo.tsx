import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ dark = false, className }: { dark?: boolean; className?: string }) {
  return (
    <Link href="/" className={cn("flex min-w-0 shrink items-center gap-2", className)} aria-label="QuickShipDeals — accueil">
      <Image src="/logo.png" alt="" width={44} height={44} className="size-9 shrink-0 rounded-xl bg-white object-contain p-0.5 sm:size-11" priority />
      <span className={cn("truncate font-display text-lg font-extrabold tracking-tight max-[399px]:hidden sm:text-xl", dark ? "text-white" : "text-night-900")}>
        Quick<span className="text-orange-500">Ship</span>Deals
      </span>
    </Link>
  );
}
