const express = require('express');
const User = require('../models/user');
const Activity = require('../models/activity');
const redis = require('../config/redis');
const { authenticateToken, checkPermission } = require('../middleware/auth');
const logger = require('../utils/logger');
const router = express.Router();

router.get('/', authenticateToken, checkPermission('Customers', 'can_read'), async (req, res, next) => {
  const { limit = 10, offset = 0 } = req.query;
  try {
    const cacheKey = `customers_${limit}_${offset}`;
    const cached = await redis.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const customers = await User.getCustomers({ limit: parseInt(limit), offset: parseInt(offset) });
    await redis.setEx(cacheKey, 3600, JSON.stringify(customers));
    res.json(customers);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', authenticateToken, checkPermission('Customers', 'can_write'), async (req, res, next) => {
  try {
    const customer = await User.update(req.params.id, req.body);
    await Activity.log(req.user.user_id, 'UPDATE_CUSTOMER', `Customer ${req.params.id} updated`);
    await redis.del('customers_*');
    logger.info(`Customer updated: ${req.params.id} by ${req.user.user_id}`);
    res.json(customer);
  } catch (error) {
    next(error);
  }
});

module.exports = router;