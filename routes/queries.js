const express = require('express');
const Query = require('../models/query');
const Activity = require('../models/activity');
const { authenticateToken, checkPermission } = require('../middleware/auth');
const logger = require('../utils/logger');
const router = express.Router({ mergeParams: true });

router.post('/', authenticateToken, checkPermission('Queries', 'can_write'), async (req, res, next) => {
  try {
    const query = await Query.create({ user_id: req.user.user_id, query_text: req.body.query_text }, req.io);
    await Activity.log(req.user.user_id, 'RAISE_QUERY', `Query ${query.query_id} raised`);
    logger.info(`Query raised: ${query.query_id} by ${req.user.user_id}`);
    res.status(201).json(query);
  } catch (error) {
    next(error);
  }
});

router.put('/:id/respond', authenticateToken, checkPermission('Queries', 'can_write'), async (req, res, next) => {
  try {
    const updatedQuery = await Query.respond(req.params.id, req.user.user_id, req.body.response);
    await Activity.log(req.user.user_id, 'RESPOND_QUERY', `Response added to query ${req.params.id}`);
    logger.info(`Query responded: ${req.params.id} by ${req.user.user_id}`);
    res.json(updatedQuery);
  } catch (error) {
    next(error);
  }
});

router.get('/', authenticateToken, checkPermission('Queries', 'can_read'), async (req, res, next) => {
  const { limit = 10, offset = 0 } = req.query;
  try {
    const queries = await Query.getAll({ limit: parseInt(limit), offset: parseInt(offset) });
    res.json(queries);
  } catch (error) {
    next(error);
  }
});

module.exports = router;