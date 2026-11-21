import { requireUser } from "@/modules/auth/session";
import { db } from "@/lib/db";
import { ActionForm } from "@/components/account/forms";
import { changePasswordAction, deleteAccountAction, updateProfileAction } from "@/actions/customer";
import { Checkbox, Field, Input } from "@/components/ui/form";

export const metadata = { title: "Profil et données", robots: { index: false } };

export default async function Page() {
  const user = await requireUser();
  const profile = await db.customerProfile.findUnique({ where: { userId: user.id } });
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-extrabold">Profil et données personnelles</h1>
      <section className="rounded-2xl border border-line bg-white p-6">
        <h2 className="mb-4 text-lg font-bold">Coordonnées et préférences</h2>
        <ActionForm action={updateProfileAction} submit="Enregistrer">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nom" htmlFor="p-name"><Input id="p-name" name="name" defaultValue={user.name} required /></Field>
            <Field label="E-mail" htmlFor="p-email" hint="Pour modifier votre e-mail, contactez le support."><Input id="p-email" value={user.email} disabled readOnly /></Field>
            <Field label="Téléphone" htmlFor="p-phone"><Input id="p-phone" name="phone" defaultValue={profile?.phone ?? ""} /></Field>
          </div>
          <Checkbox name="marketing" defaultChecked={profile?.marketingOptIn} label="J'accepte de recevoir des offres commerciales par e-mail (retirable à tout moment)." />
        </ActionForm>
      </section>
      <section className="rounded-2xl border border-line bg-white p-6">
        <h2 className="mb-4 text-lg font-bold">Mot de passe</h2>
        <ActionForm action={changePasswordAction} submit="Changer le mot de passe" variant="night">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Mot de passe actuel" htmlFor="cur"><Input id="cur" name="current" type="password" autoComplete="current-password" required /></Field>
            <Field label="Nouveau mot de passe" htmlFor="nxt" hint="10 caractères minimum."><Input id="nxt" name="next" type="password" autoComplete="new-password" required minLength={10} /></Field>
          </div>
        </ActionForm>
      </section>
      <section className="rounded-2xl border border-line bg-white p-6">
        <h2 className="text-lg font-bold">Mes données (RGPD)</h2>
        <p className="mt-2 text-sm text-muted">Téléchargez l&apos;ensemble des données personnelles associées à votre compte (format JSON).</p>
        <a href="/api/compte/export" className="mt-4 inline-flex h-11 items-center rounded-xl border border-line px-5 text-sm font-semibold hover:bg-surface">Exporter mes données</a>
      </section>
      <section className="rounded-2xl border border-red-200 bg-red-50/40 p-6">
        <h2 className="text-lg font-bold text-red-700">Supprimer mon compte</h2>
        <p className="mt-2 text-sm text-muted">Vos données personnelles seront anonymisées. Les factures sont conservées 10 ans (obligation légale) sans être rattachées à un compte.</p>
        <ActionForm action={deleteAccountAction} submit="Supprimer définitivement" variant="danger" className="mt-4 space-y-3">
          <Field label="Tapez SUPPRIMER pour confirmer" htmlFor="del"><Input id="del" name="confirm" autoComplete="off" /></Field>
        </ActionForm>
      </section>
    </div>
  );
}
