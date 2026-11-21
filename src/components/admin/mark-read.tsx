"use client";
import { markNotificationsReadAction } from "@/actions/admin-misc";
export function MarkNotificationsRead() {
  return <button type="button" onClick={() => markNotificationsReadAction()} className="text-xs font-semibold text-electric-500">Tout marquer comme lu</button>;
}
