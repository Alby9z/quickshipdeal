import { Logo } from "@/components/layout/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-night-900 p-12 text-white lg:flex lg:flex-col">
        <div className="bg-grid absolute inset-0" aria-hidden />
        <div className="absolute -bottom-32 -left-32 size-96 rounded-full bg-electric-500/30 blur-3xl" aria-hidden />
        <div className="relative"><Logo dark /></div>
        <div className="relative mt-auto max-w-md">
          <p className="text-3xl font-extrabold leading-tight text-white">Vos commandes, vos suivis de colis et vos factures, au même endroit.</p>
          <div className="route-line mt-6 h-1 w-24 rounded-full" />
        </div>
      </div>
      <main id="contenu" className="flex flex-col justify-center px-4 py-12 sm:px-12">
        <div className="mb-8 lg:hidden"><Logo /></div>
        <div className="mx-auto w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
