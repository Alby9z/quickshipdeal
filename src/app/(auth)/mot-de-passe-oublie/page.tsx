import { ForgotForm } from "@/components/auth/forms";
export const metadata = { title: "Mot de passe oublié", robots: { index: false } };
export default function Page() {
  return (<><h1 className="text-3xl font-extrabold">Mot de passe oublié</h1><p className="mb-6 mt-2 text-sm text-muted">Recevez un lien pour choisir un nouveau mot de passe.</p><ForgotForm /></>);
}
