import { promisify } from "util";
const redis = require('redis-mock');
const heartbeat = require("../../src/functions/heartbeat/heartbeat");
jest.mock('redis', () => redis);

describe("Heartbeat function", () => {
  test("Exports an handler function", () => {
    expect(heartbeat).toHaveProperty('handler');
    expect(typeof heartbeat.handler).toBe("function");
  });

  describe("Event parameter: id missing", ()=> {
    const missingMessage = "Missing argument 'id'";
    test("Null event", async () => {
      await expect(heartbeat.handler).rejects.toThrow(missingMessage);
    });
    test("Empty event", async () => {
      await expect(heartbeat.handler({})).rejects.toThrow(missingMessage);
    });
    test("No arguments event", async () => {
      await expect(heartbeat.handler({test: 1})).rejects.toThrow(missingMessage);
    });
    test("Empty arguments", async () => {
      await expect(heartbeat.handler({arguments: {}})).rejects.toThrow(missingMessage);
    });
    test("No id in arguments", async () => {
      await expect(heartbeat.handler({arguments: {test: 1}})).rejects.toThrow(missingMessage);
    });
    test("Id passed ok", async () => {
      await expect(heartbeat.handler({arguments: {id: "test_id"}})).resolves.toMatchObject({id: "test_id"});
    });
  });
  
  describe("Heartbeat saved", () => {
    const testMember = "test_heartbeat";
    const client = redis.createClient();
    // Make sure key is not set
    const zscore = promisify(client.zscore).bind(client);
    test("ZSCORE not set", async () => {
      await expect(zscore("presence", testMember)).resolves.toBe(null);
    });
    test("Heartbeat return", async () => {
      await expect(heartbeat.handler({arguments: {id: testMember}}))
        .resolves.toMatchObject({id: testMember, status: "online"});
    });
    let stamp: number;
    test("ZSCORE set", async () => {
      const result = await zscore("presence", testMember);
      expect(typeof result).toBe('string');
      expect(parseInt(result)).not.toBeNaN();
      stamp = parseInt(result);
    });
    test("Heartbeat still online", async () => {
      await expect(heartbeat.handler({arguments: {id: testMember}}))
        .resolves.toMatchObject({id: testMember, status: "online"});
    });
    test("ZSCORE updated", async () => {
      const result = await zscore("presence", testMember);
      expect(typeof result).toBe('string');
      expect(parseInt(result)).not.toBeNaN();
      expect(parseInt(result)).toBeGreaterThan(stamp);
    });
  });

});