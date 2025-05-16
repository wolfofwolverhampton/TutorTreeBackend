const express = require('express');
const axios = require('axios');
const app = express();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://tutortree-477a0-default-rtdb.asia-southeast1.firebasedatabase.app/"
});

const pidxMap = new Map()

app.use(express.json());

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = './uploads/profile_pictures';
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uid = req.body.uid || 'unknown';
    const ext = path.extname(file.originalname);
    cb(null, `${uid}${ext}`);
  }
});

const upload = multer({ storage: storage });

function sendNotificationToUser(token, title, message) {
  const payload = {
    notification: {
      title: title,
      body: message,
    },
    token: token,
  };

  admin.messaging().send(payload)
    .then(response => {
      console.log("Successfully sent:", response);
    })
    .catch(error => {
      console.error("Error sending message:", error);
    });
}

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.post('/khalti/initiate', async (req, res) => {
    const {
        amount,
        subscriptionId,
        orderName,
        teacherUid,
        studentUid,
        teacherName,
        teacherEmail,
        teacherPhone
    } = req.body;

    console.log(req.body);

    try {
        const khaltiResponse = await axios.post(
            'https://dev.khalti.com/api/v2/epayment/initiate/',
        {
                return_url: 'http://192.168.1.106:3000/payment-success',
                website_url: 'https://example.com',
                amount,
                purchase_order_id: subscriptionId,
                purchase_order_name: orderName,
                customer_info: {
                    name: teacherName || 'N/A',
                    email: teacherEmail || 'N/A',
                    phone: teacherPhone || 'N/A'
                }
            },
            {
                headers: {
                    Authorization: 'Key 7fba1a2e34324f9aa03d5e5710e01c1c',
                    'Content-Type': 'application/json'
                }
            }
        );

        const { pidx, payment_url } = khaltiResponse.data;

        pidxMap.set(pidx, { teacherUid, studentUid, amount, subscriptionId, orderName, teacherUid, studentUid, teacherPhone });

        res.json({ paymentUrl: payment_url });
    } catch (error) {
        console.error('Khalti Initiation Failed:', error.response?.data || error.message);
        res.status(500).json({ error: 'Payment initiation failed' });
    }
});

app.get('/payment-success', async (req, res) => {
    const pidx = req.query.pidx;

    try {
        const khaltiLookup = await axios.post(
            'https://dev.khalti.com/api/v2/epayment/lookup/',
            { pidx },
            {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: 'Key 7fba1a2e34324f9aa03d5e5710e01c1c'
                }
            }
        );

        const status = khaltiLookup.data.status;
        const transactionId = khaltiLookup.data.transaction_id;

        const data = pidxMap.get(pidx) || {};
        const teacherUid = data.teacherUid || '';
        const studentUid = data.studentUid || '';
        const subscriptionId = data.subscriptionId || '';
        const orderName = data.orderName || '';
        const amount = data.amount || 0;
        const mobile = data.teacherPhone || '';

        res.send(`
            <html>
              <body>
                <script>
                  window.location.href = "javainternal://success?status=${status}&transaction_id=${transactionId}&teacher_uid=${teacherUid}&student_uid=${studentUid}&amount=${amount}&subscription_id=${subscriptionId}&order_name=${orderName}&mobile=${mobile}";
                </script>
              </body>
            </html>
        `);
    } catch (error) {
        console.error('Lookup failed:', error.response?.data || error.message);
        res.send(`
            <html>
              <body>
                <script>
                  window.location.href = "javainternal://success?status=failure";
                </script>
              </body>
            </html>
        `);
    }
});

app.post('/send-notification', async (req, res) => {
  const { senderUid, receiverUid, message } = req.body;

  try {
    const snapshot = await admin.database().ref(`user_tokens/${receiverUid}`).once('value');
    const token = snapshot.val();

    if (!token) {
      return res.status(400).json({ error: 'Receiver does not have a valid FCM token' });
    }

    sendNotificationToUser(token, 'New Message', message);

    res.json({ success: true, message: 'Message sent and notification dispatched' });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message or notification' });
  }
});

app.post('/receive_token', (req, res) => {
  const { uid, token } = req.body;
  if (!uid || !token) {
    return res.status(400).json({ error: 'UID and token are required' });
  }

  admin.database().ref(`user_tokens/${uid}`).set(token)
    .then(() => {
      res.json({ success: true });
    })
    .catch((error) => {
      console.error("Error saving token:", error);
      res.status(500).json({ error: 'Failed to save token' });
    });
});

app.post('/upload-profile-picture', upload.single('profile'), (req, res) => {
  const { uid } = req.body;
  const { type } = req.query;

  if (!uid || !req.file) {
    return res.status(400).json({ error: 'UID and profile image are required' });
  }

  if (!type || (type !== 'students' && type !== 'teachers')) {
    return res.status(400).json({ error: 'User type must be "students" or "teachers"' });
  }

  const filePath = `/uploads/profile_pictures/${req.file.filename}`;

  admin.database().ref(`${type}/${uid}/profilePicture`).set(filePath)
    .then(() => {
      res.json({ success: true, message: 'Profile picture uploaded successfully', filePath });
    })
    .catch((error) => {
      console.error('Error saving profile picture path:', error);
      res.status(500).json({ error: 'Failed to save profile picture path' });
    });
});

app.listen(3000, "0.0.0.0", () => {
    console.log('Server running on port 3000');
});
