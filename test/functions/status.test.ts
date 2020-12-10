// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { promisify } from "util";
const redis = require('redis-mock');
const status = require("../../src/functions/status/status");
jest.mock('redis', () => redis);

describe("Status function", () => {
  test("Exports an handler function", () => {
    expect(status).toHaveProperty('handler');
    expect(typeof status.handler).toBe("function");
  });

  describe("Event parameter: id missing", ()=> {
    const missingMessage = "Missing argument 'id'";
    test("Null event", async () => {
      await expect(status.handler).rejects.toThrow(missingMessage);
    });
    test("Empty event", async () => {
      await expect(status.handler({})).rejects.toThrow(missingMessage);
    });
    test("No arguments event", async () => {
      await expect(status.handler({test: 1})).rejects.toThrow(missingMessage);
    });
    test("Empty arguments", async () => {
      await expect(status.handler({arguments: {}})).rejects.toThrow(missingMessage);
    });
    test("No id in arguments", async () => {
      await expect(status.handler({arguments: {test: 1}})).rejects.toThrow(missingMessage);
    });
    test("Id passed ok", async () => {
      await expect(status.handler({arguments: {id: "test_id"}})).resolves.toMatchObject({id: "test_id"});
    });
  });
  
  describe("status check", () => {
    const testMember = "test_status";
    const client = redis.createClient();
    // Make sure key is not set
    const zadd = promisify(client.zadd).bind(client);
    test("status offline", async () => {
      await expect(status.handler({arguments: {id: testMember}}))
        .resolves.toMatchObject({id: testMember, status: "offline"});
    });
    test("set score", async () => {
      await expect(zadd("presence", 1234, testMember))
        .resolves.toBe(1);
    });
    test("status online", async () => {
      await expect(status.handler({arguments: {id: testMember}}))
        .resolves.toMatchObject({id: testMember, status: "online"});
    });
  });

});