import { Suspense } from "react";
import { ResetForm } from "@/components/auth/forms";
export const metadata = { title: "Nouveau mot de passe", robots: { index: false } };
export default function Page() {
  return (<><h1 className="mb-6 text-3xl font-extrabold">Nouveau mot de passe</h1><Suspense><ResetForm /></Suspense></>);
}
