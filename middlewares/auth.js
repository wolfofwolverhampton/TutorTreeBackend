const jwt = require('jsonwebtoken');
const admin = require('../config/firebase');
const JWT_SECRET = process.env.JWT_SECRET || "fallback_jwt_secret";

const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const adminSnap = await admin.database().ref(`admins/${decoded.id}`).once("value");
    if (!adminSnap.exists()) return res.status(401).json({ error: "Unauthorized" });

    req.admin = { id: decoded.id, phoneNumber: decoded.phoneNumber };
    next();
  } catch (err) {
    console.error("Auth error:", err);
    return res.status(401).json({ error: "Unauthorized" });
  }
};

module.exports = authMiddleware;
