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

 const { promisify } = require('util');

const AWS = require('aws-sdk');
const eventBridge = new AWS.EventBridge();

const redis = require('redis');
const eventBus = process.env.EVENT_BUS;
const redisEndpoint = process.env.REDIS_HOST;
const redisPort = process.env.REDIS_PORT;
const presence = redis.createClient(redisPort, redisEndpoint);
const zrem = promisify(presence.zrem).bind(presence);

/**
 * Disconnect event handler
 * 
 * 1 - Check the `arguments.id` from the event
 * 2 - Calls `zrem` to remove the timestamp from the database
 * 3 - Send an event if the id was still online
 * 
 * @param {*} event 
 */
exports.handler =  async function(event) {
  const id = event && event.arguments && event.arguments.id;
  if (undefined === id || null === id) throw new Error("Missing argument 'id'");
  try {
    const removals = await zrem("presence", id);
    if (removals != 1) // Id was already removed: bypass event
      return {id, status: "offline"};
    // Notify EventBridge
    const Entries = [
      {
        Detail: JSON.stringify({id}),
        DetailType: "presence.disconnected",
        Source: "api.presence",
        EventBusName: eventBus,
        Time: Date.now()
      }
    ];
    await eventBridge.putEvents({ Entries }).promise();
    return {id, status: "offline"};
  } catch (error) {
    return error;
  }
}