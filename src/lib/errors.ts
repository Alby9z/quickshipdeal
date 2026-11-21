export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string = "APP_ERROR",
    public readonly status = 400,
  ) {
    super(message);
  }
}
export class NotFoundError extends AppError {
  constructor(message = "Introuvable") {
    super(message, "NOT_FOUND", 404);
  }
}
export class ForbiddenError extends AppError {
  constructor(message = "Accès refusé") {
    super(message, "FORBIDDEN", 403);
  }
}
export class NotConfiguredError extends AppError {
  constructor(service: string) {
    super(`${service} n'est pas configuré`, "NOT_CONFIGURED", 503);
  }
}

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export function toActionError(e: unknown): { ok: false; error: string } {
  if (e instanceof AppError) return { ok: false, error: e.message };
  if (e && typeof e === "object" && "issues" in e) {
    const issues = (e as { issues: { path: (string | number)[]; message: string }[] }).issues;
    const first = issues[0];
    return { ok: false, error: first ? `Données invalides${first.path.length ? ` (${first.path.join(".")})` : ""} : ${first.message}` : "Données invalides" };
  }
  console.error(e);
  return { ok: false, error: "Une erreur inattendue est survenue." };
}
