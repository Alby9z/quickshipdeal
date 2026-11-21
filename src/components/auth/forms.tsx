"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { afterSignInAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input } from "@/components/ui/form";
import { Alert } from "@/components/ui/misc";

function safeNext(n: string | null) {
  return n && n.startsWith("/") && !n.startsWith("//") ? n : null;
}

export function SignInForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [needsVerify, setNeedsVerify] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setLoading(true);
        setError(null);
        const email = String(fd.get("email"));
        const { error } = await authClient.signIn.email({ email, password: String(fd.get("password")), rememberMe: fd.get("remember") === "on" });
        if (error) {
          setLoading(false);
          if (error.status === 403) setNeedsVerify(email);
          else setError(error.status === 429 ? "Trop de tentatives. Patientez une minute." : "E-mail ou mot de passe incorrect.");
          return;
        }
        const r = await afterSignInAction();
        router.push(safeNext(sp.get("next")) ?? (r.isStaff ? "/admin" : "/compte"));
        router.refresh();
      }}
    >
      <Field label="E-mail" htmlFor="email"><Input id="email" name="email" type="email" autoComplete="email" required /></Field>
      <Field label="Mot de passe" htmlFor="password"><Input id="password" name="password" type="password" autoComplete="current-password" required /></Field>
      <div className="flex items-center justify-between">
        <Checkbox name="remember" defaultChecked label="Rester connecté" />
        <Link href="/mot-de-passe-oublie" className="text-sm font-medium text-electric-500">Mot de passe oublié ?</Link>
      </div>
      {error && <Alert tone="error">{error}</Alert>}
      {needsVerify && (
        <Alert tone="warning" title="Adresse e-mail non vérifiée">
          Un e-mail de vérification vient d&apos;être renvoyé à {needsVerify}. Cliquez sur le lien reçu puis reconnectez-vous.
        </Alert>
      )}
      <Button type="submit" className="w-full" disabled={loading}>{loading && <Loader2 className="animate-spin" />}Se connecter</Button>
      <p className="text-center text-sm text-muted">Pas encore de compte ? <Link href="/inscription" className="font-semibold text-electric-500">Créer un compte</Link></p>
    </form>
  );
}

export function SignUpForm() {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  if (done) return <Alert tone="success" title="Vérifiez votre boîte mail">Un lien de confirmation a été envoyé à {done}. Il est valable 24 heures.</Alert>;
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const password = String(fd.get("password"));
        if (password !== String(fd.get("confirm"))) return setError("Les mots de passe ne correspondent pas.");
        if (fd.get("terms") !== "on") return setError("Vous devez accepter les CGV et la politique de confidentialité.");
        setLoading(true);
        setError(null);
        const email = String(fd.get("email"));
        const { error } = await authClient.signUp.email({ name: String(fd.get("name")), email, password, callbackURL: "/compte" });
        setLoading(false);
        if (error) setError(error.status === 422 || error.code === "USER_ALREADY_EXISTS" ? "Un compte existe déjà avec cette adresse." : error.message ?? "Inscription impossible.");
        else setDone(email);
      }}
    >
      <Field label="Nom complet" htmlFor="name"><Input id="name" name="name" autoComplete="name" required minLength={2} /></Field>
      <Field label="E-mail" htmlFor="email"><Input id="email" name="email" type="email" autoComplete="email" required /></Field>
      <Field label="Mot de passe" htmlFor="password" hint="10 caractères minimum."><Input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} /></Field>
      <Field label="Confirmer le mot de passe" htmlFor="confirm"><Input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={10} /></Field>
      <Checkbox name="terms" label={<>J&apos;accepte les <Link href="/cgv" className="text-electric-500 underline">CGV</Link> et la <Link href="/confidentialite" className="text-electric-500 underline">politique de confidentialité</Link>.</>} />
      {error && <Alert tone="error">{error}</Alert>}
      <Button type="submit" className="w-full" disabled={loading}>{loading && <Loader2 className="animate-spin" />}Créer mon compte</Button>
      <p className="text-center text-sm text-muted">Déjà inscrit ? <Link href="/connexion" className="font-semibold text-electric-500">Se connecter</Link></p>
    </form>
  );
}

export function ForgotForm() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  if (sent) return <Alert tone="success" title="Demande envoyée">Si un compte existe avec cette adresse, un lien de réinitialisation valable 1 heure vient d&apos;être envoyé.</Alert>;
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        await authClient.requestPasswordReset({ email: String(new FormData(e.currentTarget).get("email")), redirectTo: "/reinitialiser-mot-de-passe" });
        setLoading(false);
        setSent(true); // même réponse que le compte existe ou non (pas d'énumération)
      }}
    >
      <Field label="E-mail" htmlFor="email"><Input id="email" name="email" type="email" autoComplete="email" required /></Field>
      <Button type="submit" className="w-full" disabled={loading}>Envoyer le lien</Button>
    </form>
  );
}

export function ResetForm() {
  const sp = useSearchParams();
  const router = useRouter();
  const token = sp.get("token");
  const [error, setError] = useState<string | null>(sp.get("error") ? "Lien invalide ou expiré." : null);
  if (!token) return <Alert tone="error">Lien invalide ou expiré. <Link href="/mot-de-passe-oublie" className="underline">Refaire une demande</Link></Alert>;
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        if (fd.get("password") !== fd.get("confirm")) return setError("Les mots de passe ne correspondent pas.");
        const { error } = await authClient.resetPassword({ newPassword: String(fd.get("password")), token });
        if (error) setError("Lien invalide ou expiré.");
        else router.push("/connexion?reinitialise=1");
      }}
    >
      <Field label="Nouveau mot de passe" htmlFor="password" hint="10 caractères minimum."><Input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} /></Field>
      <Field label="Confirmer" htmlFor="confirm"><Input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={10} /></Field>
      {error && <Alert tone="error">{error}</Alert>}
      <Button type="submit" className="w-full">Enregistrer</Button>
    </form>
  );
}
