const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { loginLimiter } = require('../config/rateLimiter');
const authMiddleware = require('../middlewares/auth');
const upload = require('../middlewares/multer');


router.post('/login', loginLimiter, adminController.login);

router.get('/login', adminController.renderLoginPage);
router.get("/logout", adminController.logout);

router.get('/dashboard', authMiddleware, adminController.renderDashboard);
router.get('/students', authMiddleware, adminController.renderStudents);
router.get('/teachers', authMiddleware, adminController.renderTeachers);
router.get('/payments', authMiddleware, adminController.renderPayments);
router.get('/feedbacks', authMiddleware, adminController.renderFeedbacks);
router.get('/subscriptions', authMiddleware, adminController.renderSubscriptions);

// Students
router.post('/students/create', upload.single('profilePicture'), adminController.createStudent);
router.post('/students/edit/:id', upload.single('profilePicture'), adminController.editStudent);
router.post('/students/delete/:id', adminController.deleteStudent);

// Teachers
router.post('/teachers/create', upload.single('profilePicture'), adminController.createTeacher);
router.post('/teachers/edit/:id', upload.single('profilePicture'), adminController.editTeacher);
router.post('/teachers/delete/:id', adminController.deleteTeacher);

// System Feedbacks
router.post("/feedbacks/edit/:id", adminController.updateFeedback);
router.post("/feedbacks/delete/:id", adminController.deleteFeedback);

// Subscriptions
router.post("/subscriptions/edit/:id", adminController.editSubscription);
router.post("/subscriptions/delete/:id", adminController.deleteSubscription);

module.exports = router;