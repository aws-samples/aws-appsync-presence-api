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
const timeout = parseInt(process.env.TIMEOUT);
const eventBus = process.env.EVENT_BUS;
const redisEndpoint = process.env.REDIS_HOST;
const redisPort = process.env.REDIS_PORT;
const presence = redis.createClient(redisPort, redisEndpoint);
const eventBridge = new AWS.EventBridge();

/**
 * Timeout event handler
 * 
 * 1 - Use `multi` to chain Redis commands
 * 2 - Commands are zrangebyscore to retrieve expired id, zremrangebyscore to remove them
 * 3 - Send events for each ids
 * 
 */
exports.handler =  async function() {
  const timestamp = Date.now() - timeout;
  const commands = presence.multi();
  commands.zrangebyscore("presence", "-inf", timestamp);
  commands.zremrangebyscore("presence", "-inf", timestamp);
  const execute = promisify(commands.exec).bind(commands);
  try {
    // Multiple commands results are returned as an array of result, one entry per command
    // ids list is the result of the first command
    const [ids] = await execute();
    if (!ids.length) return { expired: 0 };
    // putEvents is limited to 10 events per call
    // Create a promise for each batch of ten events ...
    let promises = [];
    while ( ids.length ) {
      const Entries = ids.splice(0, 10).map( (id) => {
        return {
          Detail: JSON.stringify({id}),
          DetailType: "presence.disconnected",
          Source: "api.presence",
          EventBusName: eventBus,
          Time: Date.now()
        }
      });
      promises.push(eventBridge.putEvents({ Entries }).promise());
    }
    // ... and await for all promises to return
    const results = await Promise.all(promises);
    // Sum results for all promises and return
    const failed = results.reduce(
      (sum, result) => sum + result.FailedEntryCount,
      0
    );
    const expired = results.reduce(
      (sum, result) => sum + (result.Entries.length - result.FailedEntryCount),
      0
    );
    return { expired, failed };
  } catch (error) {
    return error;
  }
}