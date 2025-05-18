const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { loginLimiter } = require('../config/rateLimiter');
const authMiddleware = require('../middlewares/auth');

router.post('/login', loginLimiter, adminController.login);

router.get('/login', adminController.renderLoginPage);
router.get('/dashboard', authMiddleware, adminController.renderDashboard);
router.get('/students', authMiddleware, adminController.renderStudents);
router.get('/teachers', authMiddleware, adminController.renderTeachers);
router.get('/payments', authMiddleware, adminController.renderPayments);
router.get('/feedbacks', authMiddleware, adminController.renderFeedbacks);
router.get('/subscriptions', authMiddleware, adminController.renderSubscriptions);

module.exports = router;