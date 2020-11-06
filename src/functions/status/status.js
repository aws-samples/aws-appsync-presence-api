const redis = require('redis');
const { promisify } = require('util');
const redisEndpoint = process.env.REDIS_HOST;
const redisPort = process.env.REDIS_PORT;
const presence = redis.createClient(redisPort, redisEndpoint);
const zscore = promisify(presence.zscore).bind(presence);

exports.handler =  async function(event) {
  const id = event && event.arguments && event.arguments.id;
  if (undefined === id || null === id) throw new Error("Missing argument 'id'");
  try {
    const result = await zscore("presence", id);
    return { id, status: result ? "online" : "offline" };
  } catch (error) {
    return error;
  }
}