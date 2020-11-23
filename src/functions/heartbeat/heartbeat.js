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