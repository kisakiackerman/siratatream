const GENERIC_DISPLAY_NAMES = new Set([
  "mode d'invitation",
  "compte google",
  "compte email",
  "compte apple",
  "utilisateur",
  "utilisateur apple",
  "croyant(e)",
  "invité",
  "invite",
]);

type AccountLike = {
  displayName?: string | null;
  email?: string | null;
} | null | undefined;

export function getAccountStartingName(
  primaryAccount?: AccountLike,
  secondaryAccount?: AccountLike,
  maxLength = 32
): string {
  const candidates = [
    primaryAccount?.displayName,
    secondaryAccount?.displayName,
  ];

  for (const raw of candidates) {
    const cleaned = (raw || "").trim();
    if (!cleaned) continue;
    if (GENERIC_DISPLAY_NAMES.has(cleaned.toLowerCase())) continue;
    const firstPart = cleaned.split(/\s+/)[0]?.trim();
    if (firstPart) {
      return firstPart.slice(0, maxLength);
    }
  }

  const emailCandidates = [primaryAccount?.email, secondaryAccount?.email];
  for (const rawEmail of emailCandidates) {
    const email = (rawEmail || "").trim();
    if (!email || !email.includes("@")) continue;
    const prefix = email.split("@")[0]?.trim();
    if (prefix) {
      return prefix.slice(0, maxLength);
    }
  }

  return "";
}
