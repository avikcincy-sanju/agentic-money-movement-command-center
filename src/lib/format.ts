export function money(
  value: number | null | undefined,
  currency = "USD",
): string {
  if (value === null || value === undefined) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(value);
}

export function time(
  timestamp: number | null,
): string {
  if (!timestamp) {
    return "—";
  }

  return new Date(timestamp).toLocaleTimeString(
    "en-US",
    {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    },
  );
}

export function dateTime(
  timestamp: number | null,
): string {
  if (!timestamp) {
    return "—";
  }

  return new Date(timestamp).toLocaleString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    },
  );
}

export function label(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(
      /\b\w/g,
      (character) => character.toUpperCase(),
    );
}
