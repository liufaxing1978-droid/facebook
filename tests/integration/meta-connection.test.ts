import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../packages/database/src/client";
import { recordMetaConnectionHealth } from "../../packages/database/src/meta-connections";

const ids: string[] = [];

function nextConnectionId(): string {
  const id = `meta-${crypto.randomUUID()}`;
  ids.push(id);
  return id;
}

describe("recordMetaConnectionHealth", () => {
  beforeEach(async () => {
    if (ids.length > 0) {
      await prisma.metaConnection.deleteMany({ where: { id: { in: ids } } });
      ids.length = 0;
    }
  });

  afterAll(async () => {
    if (ids.length > 0) {
      await prisma.metaConnection.deleteMany({ where: { id: { in: ids } } });
    }
    await prisma.$disconnect();
  });

  it("upserts connected identity metadata by connection id without returning secret fields", async () => {
    const connectionId = nextConnectionId();
    const verifiedAt = new Date("2026-08-27T15:00:00.000Z");

    const result = await recordMetaConnectionHealth({
      connectionId,
      name: "Primary Meta",
      status: "CONNECTED",
      identity: { id: "provider-user-1", name: "XST Meta" },
      verifiedAt
    });

    expect(result).toMatchObject({
      id: connectionId,
      name: "Primary Meta",
      status: "CONNECTED",
      providerIdentityId: "provider-user-1",
      providerIdentityName: "XST Meta",
      lastVerifiedAt: verifiedAt,
      lastErrorCode: null
    });
    expect(Object.keys(result)).not.toContain("encryptedToken");

    const stored = await prisma.metaConnection.findUniqueOrThrow({ where: { id: connectionId } });
    expect(stored.providerIdentityId).toBe("provider-user-1");
    expect(stored.providerIdentityName).toBe("XST Meta");
    expect(stored.lastVerifiedAt).toEqual(verifiedAt);
    expect(stored.lastErrorCode).toBeNull();
    expect(stored.encryptedToken).toBeNull();
  });

  it("records a stable error code while preserving the last successful verification", async () => {
    const connectionId = nextConnectionId();
    const verifiedAt = new Date("2026-08-27T15:00:00.000Z");

    await recordMetaConnectionHealth({
      connectionId,
      name: "Primary Meta",
      status: "CONNECTED",
      identity: { id: "provider-user-1", name: "XST Meta" },
      verifiedAt
    });

    const failed = await recordMetaConnectionHealth({
      connectionId,
      name: "Primary Meta",
      status: "ERROR",
      errorCode: "META_AUTH_ERROR"
    });

    expect(failed.status).toBe("ERROR");
    expect(failed.lastErrorCode).toBe("META_AUTH_ERROR");
    expect(failed.lastVerifiedAt).toEqual(verifiedAt);
    expect(failed.providerIdentityId).toBe("provider-user-1");
    expect(Object.keys(failed)).not.toContain("encryptedToken");
  });

  it("clears a prior error when the connection verifies successfully again", async () => {
    const connectionId = nextConnectionId();

    await recordMetaConnectionHealth({
      connectionId,
      name: "Primary Meta",
      status: "ERROR",
      errorCode: "META_PERMISSION_ERROR"
    });

    const verifiedAt = new Date("2026-08-27T16:00:00.000Z");
    const recovered = await recordMetaConnectionHealth({
      connectionId,
      name: "Primary Meta",
      status: "CONNECTED",
      identity: { id: "provider-user-2" },
      verifiedAt
    });

    expect(recovered.status).toBe("CONNECTED");
    expect(recovered.lastErrorCode).toBeNull();
    expect(recovered.providerIdentityId).toBe("provider-user-2");
    expect(recovered.providerIdentityName).toBeNull();
    expect(recovered.lastVerifiedAt).toEqual(verifiedAt);
  });
});
