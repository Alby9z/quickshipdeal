import { requireStaff, hasPermission } from "@/modules/auth/session";
import { AdminTitle } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/product-form";
import { productFormOptions } from "@/modules/admin/product-form-data";
import { integrationStatus } from "@/lib/env";

export const metadata = { title: "Nouveau produit" };

export default async function NewProduct() {
  const user = await requireStaff("product:write");
  const opts = await productFormOptions();
  return (
    <>
      <AdminTitle title="Nouveau produit" description="Renseignez uniquement des informations réelles et vérifiées (prix, délais, caractéristiques)." />
      <ProductForm initial={{ status: "DRAFT", trackInventory: true }} {...opts} storageReady={integrationStatus().storage} canEditPrices={hasPermission(user, "price:write")} />
    </>
  );
}
