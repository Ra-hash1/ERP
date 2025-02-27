const express = require('express');
const http = require('http');
const helmet = require('helmet');
const cors = require('cors');
const initSocket = require('./config/socket');
const authRoutes = require('./routes/auth');
const customersRoutes = require('./routes/customers');
const ordersRoutes = require('./routes/orders');
const inventoryRoutes = require('./routes/inventory');
const queriesRoutes = require('./routes/queries');
const reportsRoutes = require('./routes/reports');
const limiter = require('./middleware/rateLimit');
const errorHandler = require('./middleware/error');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = initSocket(server);

// Test DB and Redis connections synchronously
(async () => {
  try {
    const pool = require('./config/db');
    const dbResult = await pool.query('SELECT NOW()');
    console.log('DB Test Success:', dbResult.rows[0]);

    const redis = require('./config/redis');
    await redis.set('test', 'Redis works!');
    const redisReply = await redis.get('test');
    console.log('Redis Test Success:', redisReply);
  } catch (err) {
    console.error('Startup Test Error:', err.stack);
  }
})();

// Log raw request body before parsing
app.use((req, res, next) => {
  let data = '';
  req.on('data', (chunk) => {
    data += chunk;
  });
  req.on('end', () => {
    console.log('Raw Request Body:', data);
    req.rawBody = data;
  });
  next();
});

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(limiter);

app.use((req, res, next) => {
  req.io = io;
  next();
});

// Add root route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the ERP Backend API' });
});

app.use('/auth', authRoutes);
app.use('/customers', customersRoutes);
app.use('/orders', ordersRoutes);
app.use('/inventory', inventoryRoutes);
app.use('/queries', queriesRoutes);
app.use('/reports', reportsRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});