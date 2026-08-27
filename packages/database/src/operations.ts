import type { Prisma } from "@prisma/client";
import { prisma } from "./client";

export type OperationState = "REQUESTED" | "SUBMITTED" | "VERIFIED" | "FAILED";

const allowedTransitions: Readonly<Record<OperationState, readonly OperationState[]>> = {
  REQUESTED: ["SUBMITTED", "FAILED"],
  SUBMITTED: ["VERIFIED", "FAILED"],
  VERIFIED: [],
  FAILED: []
};

export class InvalidOperationTransitionError extends Error {
  constructor(
    readonly from: OperationState,
    readonly to: OperationState
  ) {
    super(`Invalid operation transition: ${from} -> ${to}`);
    this.name = "InvalidOperationTransitionError";
  }
}

export type CreateOperationInput = Readonly<{
  operationId: string;
  idempotencyKey: string;
  kind: string;
  request?: Prisma.InputJsonValue;
}>;

export async function createOperation(input: CreateOperationInput) {
  return prisma.metaApiOperation.create({
    data: {
      operationId: input.operationId,
      idempotencyKey: input.idempotencyKey,
      kind: input.kind,
      state: "REQUESTED",
      ...(input.request !== undefined ? { request: input.request } : {})
    }
  });
}

function isOperationState(value: string): value is OperationState {
  return value === "REQUESTED" || value === "SUBMITTED" || value === "VERIFIED" || value === "FAILED";
}

export async function transitionOperation(
  operationId: string,
  nextState: OperationState,
  response?: Prisma.InputJsonValue
) {
  const current = await prisma.metaApiOperation.findUnique({ where: { operationId } });
  if (current === null) {
    throw new Error(`Operation not found: ${operationId}`);
  }

  if (!isOperationState(current.state)) {
    throw new Error(`Unsupported operation state: ${current.state}`);
  }

  if (!allowedTransitions[current.state].includes(nextState)) {
    throw new InvalidOperationTransitionError(current.state, nextState);
  }

  const updated = await prisma.metaApiOperation.updateMany({
    where: {
      operationId,
      state: current.state
    },
    data: {
      state: nextState,
      ...(response !== undefined ? { response } : {})
    }
  });

  if (updated.count !== 1) {
    throw new InvalidOperationTransitionError(current.state, nextState);
  }

  const operation = await prisma.metaApiOperation.findUnique({ where: { operationId } });
  if (operation === null) {
    throw new Error(`Operation disappeared after transition: ${operationId}`);
  }

  return operation;
}
