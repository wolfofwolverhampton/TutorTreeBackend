const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const admin = require('../config/firebase');

const JWT_SECRET = process.env.JWT_SECRET || "fallback_jwt_secret";
const db = admin.database();

exports.login = async (req, res) => {
  const { phoneNumber, password } = req.body;

  if (!phoneNumber || !password) {
    return res.status(400).render('login', { error: "Phone number and password are required" });
  }

  try {
    const snapshot = await db.ref("admins").orderByChild("phoneNumber").equalTo(phoneNumber).once("value");
    if (!snapshot.exists()) return res.status(401).render('login', { error: "Invalid credentials" });

    let adminData;
    snapshot.forEach(child => {
      adminData = child.val();
      adminData.id = child.key;
    });

    if (password !== adminData.password) {
      return res.status(401).render('login', { error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: adminData.id, phoneNumber: adminData.phoneNumber },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.cookie('adminToken', token, {
      httpOnly: true,      
      maxAge: 8 * 60 * 60 * 1000,
      secure: false
    });

    return res.redirect('/admin/dashboard');
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).render('login', { error: "Internal server error" });
  }
};

exports.renderLoginPage = (req, res) => {
  res.render('login');
};

exports.renderDashboard = async (req, res) => {
  res.render('dashboard');
};

exports.renderStudents = async (req, res) => {
  const students = await getStudents();
  res.render('students', {students});
}

exports.renderTeachers = async (req, res) => {
  const teachers = await getTeachers();
  res.render('teachers', { teachers });
};

exports.renderPayments = async (req, res) => {
  const payments = await getPayments();
  res.render('payments', { payments });
};

exports.renderFeedbacks = async (req, res) => {
  const feedbacks = await getFeedbacks();
  res.render('feedbacks', { feedbacks });
};

exports.renderSubscriptions = async (req, res) => {
  const subscriptions = await getSubscriptions();
  res.render('subscriptions', { subscriptions });
};

const getStudents = async () => {
  try {
    const snapshot = await db.ref("students").once("value");
    if (!snapshot.exists()) return [];

    const students = [];
    snapshot.forEach(child => {
      const student = child.val();
      student.id = child.key;
      students.push(student);
    });
    return students;
  } catch (err) {
    console.error("Error fetching students:", err);
    return [];
  }
};

const getTeachers = async () => {
  try {
    const snapshot = await db.ref("teachers").once("value");
    if (!snapshot.exists()) return [];

    const teachers = [];
    snapshot.forEach(child => {
      const teacher = child.val();
      teacher.id = child.key;
      teachers.push(teacher);
    });
    return teachers;
  } catch (err) {
    console.error("Error fetching teachers:", err);
    return [];
  }
};

const getPayments = async () => {
  try {
    const snapshot = await db.ref("payments").once("value");
    if (!snapshot.exists()) return [];

    const payments = [];
    snapshot.forEach(child => {
      const payment = child.val();
      payment.id = child.key;
      payments.push(payment);
    });
    return payments;
  } catch (err) {
    console.error("Error fetching payments:", err);
    return [];
  }
};

const getFeedbacks = async () => {
  try {
    const snapshot = await db.ref("feedbacks").once("value");
    if (!snapshot.exists()) return [];

    const feedbacks = [];
    snapshot.forEach(child => {
      const feedback = child.val();
      feedback.id = child.key;
      feedbacks.push(feedback);
    });
    return feedbacks;
  } catch (err) {
    console.error("Error fetching feedbacks:", err);
    return [];
  }
};

const getSubscriptions = async () => {
  try {
    const snapshot = await db.ref("subscriptions").once("value");
    if (!snapshot.exists()) return [];

    const subscriptions = [];
    snapshot.forEach(child => {
      const subscription = child.val();
      subscription.id = child.key;
      subscriptions.push(subscription);
    });
    return subscriptions;
  } catch (err) {
    console.error("Error fetching subscriptions:", err);
    return [];
  }
};