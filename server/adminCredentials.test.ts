import { describe, expect, it } from "vitest";
import { readAdminCredentials } from "./adminCredentials";

describe("administrator credential configuration", () => {
  it("loads the protected administrator identity and a salted password verifier", () => {
    const credentials = readAdminCredentials();

    expect(credentials.email).toBe("visioncare@beetlewebs.com");
    expect(credentials.passwordHash).toMatch(/^scrypt\.[a-f0-9]{32}\.[a-f0-9]{128}$/);
  });
});
