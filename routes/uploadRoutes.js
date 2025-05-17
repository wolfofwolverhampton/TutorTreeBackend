const express = require('express');
const router = express.Router();
const upload = require('../middlewares/multer');
const uploadController = require('../controllers/uploadController');

router.post('/upload-profile-picture', upload.single('profile'), uploadController.uploadProfilePicture);

module.exports = router;