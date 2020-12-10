// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { promisify } from "util";
import * as AWS from "../mocks/aws-sdk";
const redis = require('redis-mock');

// Set timeout as 120s for tests
process.env.TIMEOUT = "120000";
const expire = 240000;
const timeout = require("../../src/functions/timeout/timeout");
jest.mock('redis', () => redis);
jest.mock('aws-sdk', () => AWS);

describe("Timeout function", () => {
  test("Exports an handler function", () => {
    expect(timeout).toHaveProperty('handler');
    expect(typeof timeout.handler).toBe('function');
  });

  // helpers
  const client = redis.createClient();
  const zadd = promisify(client.zadd).bind(client);
  const events = new AWS.EventBridge();
  test("No disconnection (empty db)", async() => {
    await expect(timeout.handler()).resolves.toMatchObject({expired:0});
  });

  test("No disconnection (with data)", async() => {
    const now = Date.now();
    await expect(zadd("presence", [now, "online1", now, "online2", now, "online3"])).resolves.toBe(3);
    await expect(timeout.handler()).resolves.toMatchObject({expired:0});
  });

  test("Disconnections (<10)", async() => {
    const past = Date.now() - expire;
    await expect(zadd("presence", [past, "offline1", past, "offline2", past, "offline3"])).resolves.toBe(3);
    await expect(timeout.handler()).resolves.toMatchObject({expired:3, failed:0});
  });

  test("Disconnection removed elements", async() => {
    await expect(timeout.handler()).resolves.toMatchObject({expired:0});
  });

  const eventTest = (id : String) => expect.objectContaining({
    "DetailType":"presence.disconnected",
    "Detail": JSON.stringify({id: id})
  });
  test("Events sent (<10)", async() => {
    expect(events.putEvents).toHaveBeenCalledTimes(1);
    expect(events.putEvents).toHaveBeenCalledWith({
      "Entries": expect.arrayContaining([
        eventTest("offline2"),
        eventTest("offline1"),
        eventTest("offline3")
      ])
    });
  });

  test("Disconnections (>10)", async() => {
    events.putEvents.mockClear();
    const past = Date.now() - expire;
    const members = [];
    for (let i=1; i < 16; i++) {
      members.push(past, `offline${i}`);
    }
    await expect(zadd("presence", members)).resolves.toBe(15);
    await expect(timeout.handler()).resolves.toMatchObject({expired:15, failed:0});
  });

  test("Events sent (>10)", async() => {
    expect(events.putEvents).toHaveBeenCalledTimes(2);
    const calls = events.putEvents.mock.calls;
    expect(calls[0][0]).toHaveProperty("Entries");
    expect(calls[0][0].Entries).toHaveLength(10);
    expect(calls[1][0].Entries).toHaveLength(5);
  });
});