"use client";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button type="button" onClick={async () => { await authClient.signOut(); router.push("/"); router.refresh(); }} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-muted hover:bg-surface hover:text-night-900">
      <LogOut className="size-4" aria-hidden /> Se déconnecter
    </button>
  );
}
