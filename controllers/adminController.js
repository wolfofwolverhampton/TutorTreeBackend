const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const admin = require('../config/firebase');

const JWT_SECRET = process.env.JWT_SECRET || "fallback_jwt_secret";
const db = admin.database();

exports.login = async (req, res) => {
  const { phoneNumber, password } = req.body;

  if (!phoneNumber || !password) {
    return res.status(400).json({ error: "Phone number and password are required" });
  }

  try {
    const snapshot = await db.ref("admins").orderByChild("phoneNumber").equalTo(phoneNumber).once("value");
    if (!snapshot.exists()) return res.status(401).json({ error: "Unauthorized" });

    let adminData;
    snapshot.forEach(child => {
      adminData = child.val();
      adminData.id = child.key;
    });

    const validPassword = await bcrypt.compare(password, adminData.password);
    if (!validPassword) return res.status(401).json({ error: "Unauthorized" });

    const token = jwt.sign({ id: adminData.id, phoneNumber: adminData.phoneNumber }, JWT_SECRET, { expiresIn: "8h" });
    return res.json({ token });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

exports.renderLoginPage = (req, res) => {
  res.render('login');
};

exports.renderDashboard = async (req, res) => {
  const students = await getStudents();
  res.render('dashboard', { students });
};
