import type { MetaConnectionIdentity } from "../../../../../../packages/meta/src/connection";
import { MetaClientError } from "../../../../../../packages/meta/src/errors";

export type MetaVerifier = () => Promise<MetaConnectionIdentity>;

export function createMetaHealthHandler(verifier: MetaVerifier) {
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
