const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { loginLimiter } = require('../config/rateLimiter');
const authMiddleware = require('../middlewares/auth');

router.post('/login', loginLimiter, adminController.login);
router.get('/login', adminController.renderLoginPage);
router.get('/dashboard', authMiddleware, adminController.renderDashboard);

module.exports = router;