import { prisma } from "./client";

export type MetaConnectionHealth = Readonly<{
  id: string;
  name: string;
  status: string;
  providerIdentityId: string | null;
  providerIdentityName: string | null;
  lastVerifiedAt: Date | null;
  lastErrorCode: string | null;
  updatedAt: Date;
}>;

type ConnectedInput = Readonly<{
  connectionId: string;
  name: string;
  status: "CONNECTED";
  identity: Readonly<{
    id: string;
    name?: string;
  }>;
  verifiedAt: Date;
}>;

type ErrorInput = Readonly<{
  connectionId: string;
  name: string;
  status: "ERROR";
  errorCode: string;
}>;

export type RecordMetaConnectionHealthInput = ConnectedInput | ErrorInput;

const healthSelect = {
  id: true,
  name: true,
  status: true,
  providerIdentityId: true,
  providerIdentityName: true,
  lastVerifiedAt: true,
  lastErrorCode: true,
  updatedAt: true
} as const;

export async function recordMetaConnectionHealth(
  input: RecordMetaConnectionHealthInput
): Promise<MetaConnectionHealth> {
  if (input.status === "CONNECTED") {
    return prisma.metaConnection.upsert({
      where: { id: input.connectionId },
      create: {
        id: input.connectionId,
        name: input.name,
        status: "CONNECTED",
        providerIdentityId: input.identity.id,
        providerIdentityName: input.identity.name ?? null,
        lastVerifiedAt: input.verifiedAt,
        lastErrorCode: null
      },
      update: {
        name: input.name,
        status: "CONNECTED",
        providerIdentityId: input.identity.id,
        providerIdentityName: input.identity.name ?? null,
        lastVerifiedAt: input.verifiedAt,
        lastErrorCode: null
      },
      select: healthSelect
    });
  }

  return prisma.metaConnection.upsert({
    where: { id: input.connectionId },
    create: {
      id: input.connectionId,
      name: input.name,
      status: "ERROR",
      lastErrorCode: input.errorCode
    },
    update: {
      name: input.name,
      status: "ERROR",
      lastErrorCode: input.errorCode
    },
    select: healthSelect
  });
}
