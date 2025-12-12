import { createUser, createWalk, cleanDb } from "./dbHelpers.ts";

describe("Test the setup", () => {
  test("should connect to test db", async () => {
    const { user, token, rawPassword } = await createUser();
    expect(user).toBeDefined();
    expect(token).toBeDefined();
    expect(rawPassword).toBeDefined();

    await cleanDb();
  });
});
