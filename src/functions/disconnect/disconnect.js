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