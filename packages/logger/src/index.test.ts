import { describe, expect, it } from "vitest";
import { createLogger } from "./index";

describe("createLogger", () => {
  it("redacts Meta secrets and nested token fields", () => {
    let output = "";
    const stream = {
      write(message: string) {
        output += message;
      }
    };

    const logger = createLogger({ stream });
    logger.info(
      {
        META_SYSTEM_USER_TOKEN: "super-secret-token",
        META_APP_SECRET: "super-secret-app",
        nested: { token: "nested-secret-token" }
      },
      "redaction-test"
    );

    expect(output).not.toContain("super-secret-token");
    expect(output).not.toContain("super-secret-app");
    expect(output).not.toContain("nested-secret-token");
    expect(output).toContain("[REDACTED]");
  });
});
