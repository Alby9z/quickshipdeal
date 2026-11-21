"use client";
import { deleteAddressAction } from "@/actions/customer";
export function DeleteAddress({ id }: { id: string }) {
  return <button type="button" className="text-xs font-semibold text-red-600" onClick={() => deleteAddressAction(id)}>Supprimer cette adresse</button>;
}
