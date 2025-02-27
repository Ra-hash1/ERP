const express = require('express');
const Order = require('../models/order');
const Activity = require('../models/activity');
const redis = require('../config/redis');
const { authenticateToken, checkPermission } = require('../middleware/auth');
const logger = require('../utils/logger');
const router = express.Router({ mergeParams: true });

router.post('/', authenticateToken, checkPermission('Orders', 'can_write'), async (req, res, next) => {
  try {
    const order = await Order.create(req.user.user_id, req.body, req.io);
    await Activity.log(req.user.user_id, 'CREATE_ORDER', `Order ${order.order_id} created`);
    await redis.del('inventory_*');
    logger.info(`Order created: ${order.order_id} by ${req.user.user_id}`);
    res.status(201).json(order);
  } catch (error) {
    next(error);
  }
});

router.get('/', authenticateToken, checkPermission('Orders', 'can_read'), async (req, res, next) => {
  const { limit = 10, offset = 0, user_id } = req.query;
  try {
    const cacheKey = `orders_${limit}_${offset}_${user_id || 'all'}`;
    const cached = await redis.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const orders = await Order.getAll({
      limit: parseInt(limit),
      offset: parseInt(offset),
      user_id: user_id ? parseInt(user_id) : undefined,
    });
    await redis.setEx(cacheKey, 3600, JSON.stringify(orders));
    res.json(orders);
  } catch (error) {
    next(error);
  }
});

module.exports = router;