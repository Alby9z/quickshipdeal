"use client";

import { startTransition, type FormEvent } from "react";

/**
 * Soumet un formulaire vers une Server Action SANS la réinitialisation automatique de React 19
 * (sinon, en cas d'erreur, l'utilisateur perd sa saisie).
 */
export function submitWithoutReset(formAction: (f: FormData) => void, guard?: (e: FormEvent<HTMLFormElement>) => boolean) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (guard && !guard(e)) return;
    const data = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
    startTransition(() => formAction(data));
  };
}
