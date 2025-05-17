const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { paymentLimiter } = require('../config/rateLimiter');

router.post('/khalti/initiate', paymentLimiter, paymentController.initiatePayment);
router.get('/payment-success', paymentController.paymentSuccess);

module.exports = router;