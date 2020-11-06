const AWS = require('aws-sdk');
const redis = require('redis');
const { promisify } = require('util');
const timeout = parseInt(process.env.TIMEOUT);
const eventBus = process.env.EVENT_BUS;
const redisEndpoint = process.env.REDIS_HOST;
const redisPort = process.env.REDIS_PORT;
const presence = redis.createClient(redisPort, redisEndpoint);
const eventBridge = new AWS.EventBridge();

exports.handler =  async function() {
  const timestamp = Date.now() - timeout;
  const transaction = presence.multi();
  transaction.zrangebyscore("presence", "-inf", timestamp);
  transaction.zremrangebyscore("presence", "-inf", timestamp);
  const execute = promisify(transaction.exec).bind(transaction);
  try {
    const [ids] = await execute();
    if (!ids.length) return { expired: 0 };
    // putEvents: limited to 10 events per call...
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
    const results = await Promise.all(promises);
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