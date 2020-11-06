const AppSync = require("../mocks/aws-appsync");
const on_disconnect = require("../../src/functions/on_disconnect/on_disconnect");
jest.mock('../../src/functions/on_disconnect/node_modules/aws-appsync', () => AppSync);

describe("On disconnect function", () => {
  test("Exports an handler function", () => {
    expect(on_disconnect).toHaveProperty('handler');
    expect(typeof on_disconnect.handler).toBe("function");
  });

  describe("Event parameter: id missing", ()=> {
    const missingMessage = "Missing argument 'id'";
    test("Null event", async () => {
      await expect(on_disconnect.handler).rejects.toThrow(missingMessage);
    });
    test("Empty event", async () => {
      await expect(on_disconnect.handler({})).rejects.toThrow(missingMessage);
    });
    test("No detail event", async () => {
      await expect(on_disconnect.handler({test: 1})).rejects.toThrow(missingMessage);
    });
    test("Empty detail", async () => {
      await expect(on_disconnect.handler({detail: {}})).rejects.toThrow(missingMessage);
    });
    test("No id in detail", async () => {
      await expect(on_disconnect.handler({detail: {test: 1}})).rejects.toThrow(missingMessage);
    });
  });

  describe("Test with id", () => {
    const AppSyncClient = AppSync.AppSyncClient;
    const client = new AppSyncClient();
    test("Returned value", async () => {
      await expect(on_disconnect.handler({detail: {id: "test_id"}}))
        .resolves.toMatchObject({id: "test_id", status:"offline"});
      console.log(client.mutate.mock.calls);
    });
    test("AppSync called", () => {
      console.log(client.mutate.mock.calls);
      expect(client.mutate).toHaveBeenCalledTimes(1);
    });
  });
});