const admin = require('../config/firebase');
const db = admin.database();

exports.uploadProfilePicture = async (req, res) => {
  const { uid } = req.body;
  const { type } = req.query;

  if (!uid || !req.file) {
    return res.status(400).json({ error: 'UID and profile image are required' });
  }

  if (!type || (type !== 'students' && type !== 'teachers')) {
    return res.status(400).json({ error: 'User type must be "students" or "teachers"' });
  }

  const filePath = `/uploads/profile_pictures/${req.file.filename}`;

  try {
    await db.ref(`${type}/${uid}/profilePicture`).set(filePath);
    res.json({ success: true, message: 'Profile picture uploaded successfully', filePath });
  } catch (error) {
    console.error('Error saving profile picture path:', error);
    res.status(500).json({ error: 'Failed to save profile picture path' });
  }
};