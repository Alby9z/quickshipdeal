import { SignUpForm } from "@/components/auth/forms";
export const metadata = { title: "Créer un compte", robots: { index: false } };
export default function Page() {
  return (<><h1 className="text-3xl font-extrabold">Créer un compte</h1><p className="mb-6 mt-2 text-sm text-muted">Une adresse e-mail valide est requise : un lien de confirmation vous sera envoyé.</p><SignUpForm /></>);
}
