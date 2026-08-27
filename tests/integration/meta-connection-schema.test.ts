import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "../../packages/database/src/client";

describe("MetaConnection health schema", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("provides the non-secret health metadata columns required by P1", async () => {
    const rows = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'MetaConnection'
    `;

    const columns = new Set(rows.map((row) => row.column_name));
    expect(columns).toContain("providerIdentityId");
    expect(columns).toContain("providerIdentityName");
    expect(columns).toContain("lastVerifiedAt");
    expect(columns).toContain("lastErrorCode");
  });
});
