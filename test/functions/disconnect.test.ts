// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { promisify } from "util";
import * as AWS from "../mocks/aws-sdk";
const redis = require('redis-mock');
const disconnect = require("../../src/functions/disconnect/disconnect");
jest.mock('redis', () => redis);
jest.mock('aws-sdk', () => AWS);

describe("Disconnect function", () => {
  test("Exports an handler function", () => {
    expect(disconnect).toHaveProperty('handler');
    expect(typeof disconnect.handler).toBe("function");
  });

  describe("Event parameter: id missing", ()=> {
    const missingMessage = "Missing argument 'id'";
    test("Null event", async () => {
      await expect(disconnect.handler).rejects.toThrow(missingMessage);
    });
    test("Empty event", async () => {
      await expect(disconnect.handler({})).rejects.toThrow(missingMessage);
    });
    test("No arguments event", async () => {
      await expect(disconnect.handler({test: 1})).rejects.toThrow(missingMessage);
    });
    test("Empty arguments", async () => {
      await expect(disconnect.handler({arguments: {}})).rejects.toThrow(missingMessage);
    });
    test("No id in arguments", async () => {
      await expect(disconnect.handler({arguments: {test: 1}})).rejects.toThrow(missingMessage);
    });
    test("Id passed ok", async () => {
      await expect(disconnect.handler({arguments: {id: "test_id"}})).resolves.toMatchObject({id: "test_id"});
    });
  });
  
  describe("Disconnected saved", () => {
    const testMember = "test_disconnect";
    const client = redis.createClient();
    const events = new AWS.EventBridge();
    // Make sure key is not set
    const zscore = promisify(client.zscore).bind(client);
    const zadd = promisify(client.zadd).bind(client);
    test("ZSCORE not set", async () => {
      await expect(zscore("presence", testMember)).resolves.toBeNull();
    });
    test("Disconnnect already offline", async () => {
      await expect(disconnect.handler({arguments: {id: testMember}}))
        .resolves.toMatchObject({id: testMember, status: "offline"});
      expect(events.putEvents).not.toHaveBeenCalled();
    });
    test("Set score", async () => {
      await expect(zadd("presence", 1234, testMember)).resolves.toBe(1);
    });
    test("Disconnnect returns offline", async () => {
      await expect(disconnect.handler({arguments: {id: testMember}}))
        .resolves.toMatchObject({id: testMember, status: "offline"});
    });
    test("Disconnected event sent", () => {
      expect(events.putEvents).toHaveBeenCalledTimes(1);
      expect(events.putEvents).toHaveBeenCalledWith({
        "Entries": [expect.objectContaining({
          "DetailType":"presence.disconnected",
          "Detail": JSON.stringify({id: testMember})
        })]
      });
    });
    test("ZSCORE removed", async () => {
      await expect(zscore("presence", testMember)).resolves.toBeNull();
    });
  });

});