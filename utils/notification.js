const admin = require('../config/firebase');

async function sendNotificationToUser(token, title, message) {
  const payload = {
    notification: {
      title: title,
      body: message,
    },
    token: token,
  };

  try {
    const response = await admin.messaging().send(payload);
    console.log("Successfully sent notification:", response);
  } catch (error) {
    console.error("Error sending notification:", error);
  }
}

module.exports = {
  sendNotificationToUser
};
