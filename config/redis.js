const redis = require('redis');
require('dotenv').config();

const client = redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
});

client.on('connect', () => console.log('Connected to Redis'));
client.on('error', (err) => console.error('Redis Error:', err));

// Connect immediately
(async () => {
  try {
    await client.connect();
  } catch (err) {
    console.error('Redis Connect Error:', err);
  }
})();

module.exports = client;