const axios = require('axios');
const admin = require('../config/firebase');
const { KHALTI_API_KEY, BASE_URL } = require('../config/khalti');

const db = admin.database();

exports.initiatePayment = async (req, res) => {
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

  if (!amount || !subscriptionId || !orderName) {
    return res.status(400).json({ error: "Missing required payment fields" });
  }

  let newAmount = parseInt(amount) * 100;
  newAmount = newAmount + "";

  try {
    const khaltiResponse = await axios.post(
      'https://dev.khalti.com/api/v2/epayment/initiate/',
      {
        return_url: `${BASE_URL}/payment/payment-success`,
        website_url: BASE_URL,
        amount: newAmount,
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
          Authorization: `Key ${KHALTI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );    

    const { pidx, payment_url } = khaltiResponse.data;    

    const paymentData = {
      teacherUid, studentUid, amount, subscriptionId, orderName, teacherPhone,
      createdAt: Date.now()
    };
    await db.ref(`payments/${pidx}`).set(paymentData);

    res.json({ paymentUrl: payment_url });
  } catch (error) {
    console.error('Khalti Initiation Failed:', error.response?.data || error.message);
    res.status(500).json({ error: 'Payment initiation failed' });
  }
};

exports.paymentSuccess = async (req, res) => {
  const pidx = req.query.pidx;

  if (!pidx) {
    return res.status(400).send("Missing payment identifier");
  }

  try {
    const khaltiLookup = await axios.post(
      'https://dev.khalti.com/api/v2/epayment/lookup/',
      { pidx },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Key ${KHALTI_API_KEY}`
        }
      }
    );

    const status = khaltiLookup.data.status;
    const transactionId = khaltiLookup.data.transaction_id;

    const dataSnap = await db.ref(`payments/${pidx}`).once('value');
    const data = dataSnap.val() || {};    

    res.send(`
      <html>
        <body>
          <script>
            window.location.href = "javainternal://success?status=${status}&transaction_id=${transactionId}&teacher_uid=${data.teacherUid || ''}&student_uid=${data.studentUid || ''}&amount=${data.amount || 0}&subscription_id=${data.subscriptionId || ''}&order_name=${data.orderName || ''}&mobile=${data.teacherPhone || ''}&pidx=${pidx}";
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
};
