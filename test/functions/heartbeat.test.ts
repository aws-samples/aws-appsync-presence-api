// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { promisify } from "util";
import * as AWS from "../mocks/aws-sdk";
const redis = require("redis-mock");
const heartbeat = require("../../src/functions/heartbeat/heartbeat");
jest.mock('redis', () => redis);
jest.mock('aws-sdk', () => AWS);

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
    const events = new AWS.EventBridge();
    // Make sure key is not set
    const zscore = promisify(client.zscore).bind(client);
    test("ZSCORE not set", async () => {
      await expect(zscore("presence", testMember)).resolves.toBe(null);
    });
    test("Heartbeat return", async () => {
      events.putEvents.mockClear();
      await expect(heartbeat.handler({arguments: {id: testMember}}))
        .resolves.toMatchObject({id: testMember, status: "online"});
    });
    test("Check EventBridge call", () => {
      expect(events.putEvents).toHaveBeenCalledTimes(1);
      expect(events.putEvents).toHaveBeenCalledWith({
        "Entries": [expect.objectContaining({
          "DetailType":"presence.connected",
          "Detail": JSON.stringify({id: testMember})
        })]
      });
    });
    let stamp: number;
    test("ZSCORE set", async () => {
      const result = await zscore("presence", testMember);
      expect(typeof result).toBe('string');
      expect(parseInt(result)).not.toBeNaN();
      stamp = parseInt(result);
    });
    test("Heartbeat still online", async () => {
      events.putEvents.mockClear();
      await expect(heartbeat.handler({arguments: {id: testMember}}))
        .resolves.toMatchObject({id: testMember, status: "online"});
    });
    test("Heartbeat update: no events sent", () => {
      expect(events.putEvents).not.toHaveBeenCalled();
    });
    test("ZSCORE updated", async () => {
      const result = await zscore("presence", testMember);
      expect(typeof result).toBe('string');
      expect(parseInt(result)).not.toBeNaN();
      expect(parseInt(result)).toBeGreaterThan(stamp);
    });
  });

});