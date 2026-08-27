export type GraphCollection<T> = Readonly<{
  items: T[];
  next?: URL;
}>;

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseGraphNext(value: unknown): URL | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") throw new Error("Meta Graph paging.next must be a string");

  let next: URL;
  try {
    next = new URL(value);
  } catch {
    throw new Error("Meta Graph paging.next must be a valid URL");
  }

  if (next.protocol !== "https:" || next.hostname !== "graph.facebook.com") {
    throw new Error("Meta Graph paging.next must use https://graph.facebook.com");
  }

  return next;
}

export function parseGraphCollection<T>(
  input: unknown,
  itemParser: (input: unknown) => T
): GraphCollection<T> {
  if (!isRecord(input)) throw new Error("Meta Graph collection must be an object");
  if (!Array.isArray(input.data)) throw new Error("Meta Graph collection data must be an array");

  const items = input.data.map((item) => itemParser(item));
  let next: URL | undefined;

  if (input.paging !== undefined && input.paging !== null) {
    if (!isRecord(input.paging)) throw new Error("Meta Graph paging must be an object");
    next = parseGraphNext(input.paging.next);
  }

  return next === undefined ? { items } : { items, next };
}

export function assertPageAllowed(
  next: URL,
  seen: ReadonlySet<string>,
  nextPageNumber: number,
  maxPages: number
): void {
  if (nextPageNumber > maxPages) {
    throw new Error(`Meta Graph page limit exceeded (${maxPages})`);
  }

  if (seen.has(next.toString())) {
    throw new Error("Meta Graph pagination repeated next URL");
  }
}
