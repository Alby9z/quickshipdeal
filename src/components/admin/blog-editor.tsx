"use client";

import { submitWithoutReset } from "@/lib/form-submit";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveBlogPostAction } from "@/actions/admin-content";
import { Alert } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";

export function BlogEditor({ isNew, children }: { isNew: boolean; children: React.ReactNode }) {
  const [state, action, pending] = useActionState(saveBlogPostAction, null);
  const router = useRouter();
  useEffect(() => { if (isNew && state?.ok && state.data) router.replace(`/admin/blog/${state.data.id}`); }, [isNew, state, router]);
  return (
    <form onSubmit={submitWithoutReset(action)} className="space-y-4 rounded-2xl border border-line bg-white p-5">
      {children}
      {state && <Alert tone={state.ok ? "success" : "error"}>{state.ok ? state.message : state.error}</Alert>}
      <Button type="submit" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer"}</Button>
    </form>
  );
}
