import { MetaClient } from "./client";

export type MetaConnectionIdentity = Readonly<{
  id: string;
  name?: string;
}>;

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function verifyMetaConnection(client: MetaClient): Promise<MetaConnectionIdentity> {
  const payload = await client.request<unknown>("me", {
    method: "GET",
    query: { fields: "id,name" }
  });

  if (!isRecord(payload) || typeof payload.id !== "string" || payload.id.trim().length === 0) {
    throw new Error("Meta connection identity id is required");
  }

  const id = payload.id.trim();

  if (payload.name === undefined || payload.name === null) {
    return { id };
  }

  if (typeof payload.name !== "string") {
    throw new Error("Meta connection identity name must be a string");
  }

  return { id, name: payload.name };
}
