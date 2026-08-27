import { parseServerEnv } from "../../../../../../packages/config/src/server";
import { MetaClient } from "../../../../../../packages/meta/src/client";
import {
  verifyMetaConnection,
  type MetaConnectionIdentity
} from "../../../../../../packages/meta/src/connection";
import { createMetaHealthHandler } from "./handler";

async function verifyLiveMetaConnection(): Promise<MetaConnectionIdentity> {
  const env = parseServerEnv(process.env);
  const client = new MetaClient({
    graphVersion: env.META_GRAPH_VERSION,
    accessToken: env.META_SYSTEM_USER_TOKEN
  });
  return verifyMetaConnection(client);
}

export const GET = createMetaHealthHandler(verifyLiveMetaConnection);
