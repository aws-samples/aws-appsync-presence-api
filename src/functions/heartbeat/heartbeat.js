/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this
 * software and associated documentation files (the "Software"), to deal in the Software
 * without restriction, including without limitation the rights to use, copy, modify,
 * merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

const AWS = require('aws-sdk');
const redis = require('redis');
const { promisify } = require('util');
const redisEndpoint = process.env.REDIS_HOST;
const redisPort = process.env.REDIS_PORT;
const presence = redis.createClient(redisPort, redisEndpoint);
const zadd = promisify(presence.zadd).bind(presence);
const eventBridge = new AWS.EventBridge();
const eventBus = process.env.EVENT_BUS;

/**
 * Heartbeat handler:
 * 
 * 1 - Check `arguments.id` from the event
 * 2 - Use zadd to add or update the timestamp
 * 3 - If the timestamp was added, send a connection event
 * 
 * @param {object} event 
 */
exports.handler =  async function(event) {
  const id = event && event.arguments && event.arguments.id;
  if (undefined === id || null === id) throw new Error("Missing argument 'id'");
  const timestamp = Date.now();
  try {
    const result = await zadd("presence", timestamp, id);
    if (result === 1 ) // New connection
    {
      await eventBridge.putEvents({
        Entries: [{
          Detail: JSON.stringify({id}),
          DetailType: "presence.connected",
          Source: "api.presence",
          EventBusName: eventBus,
          Time: Date.now()
        }]
      }).promise();
    }
  } catch (error) {
    return error;
  }
  return { id: id, status: "online" };
}