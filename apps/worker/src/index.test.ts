import { describe, expect, it } from "vitest";
import { workerHealth } from "./index";

describe("workerHealth", () => {
  it("returns ok", () => {
    expect(workerHealth()).toEqual({ status: "ok" });
  });
});
