const jwt = require('jsonwebtoken');
const admin = require('../config/firebase');
const JWT_SECRET = process.env.JWT_SECRET || "fallback_jwt_secret";

const authMiddleware = async (req, res, next) => {
  const token = req.cookies?.adminToken;

  if (!token) {
    return res.redirect('/admin/login');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const adminSnap = await admin.database().ref(`admins/${decoded.id}`).once("value");
    if (!adminSnap.exists()) {
      return res.redirect('/admin/login');
    }

    req.admin = {
      id: decoded.id,
      phoneNumber: decoded.phoneNumber
    };
    next();
  } catch (err) {
    console.error("Auth error:", err.message);
    return res.redirect('/admin/login');
  }
};

module.exports = authMiddleware;