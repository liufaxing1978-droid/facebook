import { parseServerEnv } from "../../../../../../packages/config/src/server";
import { MetaClient } from "../../../../../../packages/meta/src/client";
import {
  verifyMetaConnection,
  type MetaConnectionIdentity
} from "../../../../../../packages/meta/src/connection";
import { MetaClientError } from "../../../../../../packages/meta/src/errors";

type MetaVerifier = () => Promise<MetaConnectionIdentity>;

async function verifyLiveMetaConnection(): Promise<MetaConnectionIdentity> {
  const env = parseServerEnv(process.env);
  const client = new MetaClient({
    graphVersion: env.META_GRAPH_VERSION,
    accessToken: env.META_SYSTEM_USER_TOKEN
  });
  return verifyMetaConnection(client);
}

export function createMetaHealthHandler(verifier: MetaVerifier = verifyLiveMetaConnection) {
  return async function metaHealth(): Promise<Response> {
    try {
      const identity = await verifier();
      return Response.json({ status: "connected", identity }, { status: 200 });
    } catch (error: unknown) {
      const code = error instanceof MetaClientError ? error.code : "META_API_ERROR";
      return Response.json({ status: "error", code }, { status: 503 });
    }
  };
}

export const GET = createMetaHealthHandler();
