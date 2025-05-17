const admin = require('../config/firebase');
const { sendNotificationToUser } = require('../utils/notification');

const db = admin.database();

exports.sendNotification = async (req, res) => {
  const { senderUid, receiverUid, message } = req.body;

  if (!senderUid || !receiverUid || !message) {
    return res.status(400).json({ error: "senderUid, receiverUid and message are required" });
  }

  try {
    const snapshot = await db.ref(`user_tokens/${receiverUid}`).once('value');
    const token = snapshot.val();

    if (!token) {
      return res.status(400).json({ error: 'Receiver does not have a valid FCM token' });
    }

    await sendNotificationToUser(token, 'New Message', message);

    res.json({ success: true, message: 'Message sent and notification dispatched' });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message or notification' });
  }
};