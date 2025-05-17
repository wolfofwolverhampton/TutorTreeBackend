const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { loginLimiter } = require('../config/rateLimiter');

router.post('/login', loginLimiter, adminController.login);

module.exports = router;