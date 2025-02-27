const express = require('express');
const User = require('../models/user');
const { validateUser } = require('../middleware/validate');
const logger = require('../utils/logger');
const router = express.Router();

router.post('/signup', validateUser, async (req, res, next) => {
  try {
    const { token } = await User.create(req.body);
    logger.info(`User signed up: ${req.body.email}`);
    res.status(201).json({ token });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  const { email, password } = req.body;
  try {
    const user = await User.findByEmail(email);
    if (!user || !(await require('bcryptjs').compare(password, user.password_hash))) {
      throw Object.assign(new Error('Invalid credentials'), { status: 401, code: 'AUTH_INVALID_CREDENTIALS' });
    }
    const token = require('jsonwebtoken').sign(
      { user_id: user.user_id, role_id: user.role_id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    logger.info(`User logged in: ${email}`);
    res.json({ token });
  } catch (error) {
    next(error);
  }
});

module.exports = router;