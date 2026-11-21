import pino from "pino";

/** Journal structuré. Les champs sensibles sont masqués automatiquement. */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: {
    paths: [
      "password",
      "*.password",
      "token",
      "*.token",
      "authorization",
      "*.authorization",
      "headers.cookie",
      "card",
      "*.card",
      "secret",
      "*.secret",
    ],
    censor: "[masqué]",
  },
  base: { app: "quickshipdeals" },
});
