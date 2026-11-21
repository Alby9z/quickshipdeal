import { Suspense } from "react";
import { SignInForm } from "@/components/auth/forms";
import { Alert } from "@/components/ui/misc";

export const metadata = { title: "Connexion", robots: { index: false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ reinitialise?: string }> }) {
  const sp = await searchParams;
  return (
    <>
      <h1 className="text-3xl font-extrabold">Connexion</h1>
      <p className="mb-6 mt-2 text-sm text-muted">Accédez à vos commandes, adresses et favoris.</p>
      {sp.reinitialise && <Alert tone="success" className="mb-4">Mot de passe modifié. Vous pouvez vous connecter.</Alert>}
      <Suspense><SignInForm /></Suspense>
    </>
  );
}
