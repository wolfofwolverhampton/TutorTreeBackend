const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const admin = require("../config/firebase");
const { fetchPaginatedData } = require("../utils/paginationUtils");

const JWT_SECRET = process.env.JWT_SECRET || "fallback_jwt_secret";
const db = admin.database();
const PAGE_SIZE = 10;

exports.login = async (req, res) => {
  const { phoneNumber, password } = req.body;

  if (!phoneNumber || !password) {
    return res
      .status(400)
      .render("login", { error: "Phone number and password are required" });
  }

  try {
    const snapshot = await db
      .ref("admins")
      .orderByChild("phoneNumber")
      .equalTo(phoneNumber)
      .once("value");
    if (!snapshot.exists())
      return res.status(401).render("login", { error: "Invalid credentials" });

    let adminData;
    snapshot.forEach((child) => {
      adminData = child.val();
      adminData.id = child.key;
    });

    if (password !== adminData.password) {
      return res.status(401).render("login", { error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: adminData.id, phoneNumber: adminData.phoneNumber },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.cookie("adminToken", token, {
      httpOnly: true,
      maxAge: 8 * 60 * 60 * 1000,
      secure: false,
    });

    return res.redirect("/admin/dashboard");
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).render("login", { error: "Internal server error" });
  }
};

exports.logout = (req, res) => {
  res.clearCookie("adminToken");
  return res.redirect("/admin/login");
};

exports.renderLoginPage = (req, res) => {
  res.render("login");
};

exports.renderDashboard = async (req, res) => {
  const getCount = async (path) => {
    const snap = await db.ref(path).once("value");
    return snap.exists() ? Object.keys(snap.val()).length : 0;
  };

  const [
    studentCount,
    teacherCount,
    feedbackCount,
    subscriptionCount,
    paymentCount,
  ] = await Promise.all([
    getCount("students"),
    getCount("teachers"),
    getCount("system_feedbacks"),
    getCount("subscriptions"),
    getCount("khalti_payments"),
  ]);

  const paymentsSnap = await db.ref("khalti_payments").once("value");
  const payments = paymentsSnap.exists() ? paymentsSnap.val() : {};

  const paymentTotalsByMonth = {};
  const now = new Date();

  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), (now.getMonth() + 1) - i, 1);
    const key = d.toISOString().slice(0, 7);
    paymentTotalsByMonth[key] = 0;    
  }  

  for (const paymentId in payments) {
    const payment = payments[paymentId];    
    if (!payment.timestamp || !payment.amount) continue;

    const paymentDate = new Date(payment.timestamp);    
    const dateKey = paymentDate.toISOString().slice(0, 7);    
    
    if (paymentTotalsByMonth.hasOwnProperty(dateKey)) {
      paymentTotalsByMonth[dateKey] += Number(payment.amount);
    }
  }  

  // Sort labels in ascending order (oldest first)
  const chartLabels = Object.keys(paymentTotalsByMonth).sort();
  // Map to totals
  const chartData = chartLabels.map((label) => paymentTotalsByMonth[label]);

  res.render("dashboard", {
    studentCount,
    teacherCount,
    feedbackCount,
    subscriptionCount,
    paymentCount,
    chartLabels,
    chartData,
  });
};

exports.renderStudents = async (req, res) => {
  let page = parseInt(req.query.page) || 1;
  if (page < 1) page = 1;

  if (!req.session.studentPageKeys) req.session.studentPageKeys = [];

  let startAfterKey = null;
  if (page > 1 && req.session.studentPageKeys[page - 2]) {
    startAfterKey = req.session.studentPageKeys[page - 2];
  }

  const { items: students, nextKey } = await getPaginatedStudents(
    PAGE_SIZE,
    startAfterKey
  );

  req.session.studentPageKeys[page - 1] = nextKey || null;

  res.render("students", {
    students,
    page,
    hasPrev: page > 1,
    hasNext: !!nextKey,
  });
};

exports.renderTeachers = async (req, res) => {
  let page = parseInt(req.query.page) || 1;
  if (page < 1) page = 1;

  if (!req.session.teacherPageKeys) req.session.teacherPageKeys = [];

  let startAfterKey = null;
  if (page > 1 && req.session.teacherPageKeys[page - 2]) {
    startAfterKey = req.session.teacherPageKeys[page - 2];
  }

  const { items: teachers, nextKey } = await getPaginatedTeachers(
    PAGE_SIZE,
    startAfterKey
  );

  req.session.teacherPageKeys[page - 1] = nextKey || null;

  res.render("teachers", {
    teachers,
    page,
    hasPrev: page > 1,
    hasNext: !!nextKey,
  });
};

exports.renderFeedbacks = async (req, res) => {
  let page = parseInt(req.query.page) || 1;
  if (page < 1) page = 1;

  if (!req.session.feedbackPageKeys) req.session.feedbackPageKeys = [];

  let startAfterKey = null;
  if (page > 1 && req.session.feedbackPageKeys[page - 2]) {
    startAfterKey = req.session.feedbackPageKeys[page - 2];
  }

  const { items: feedbacks, nextKey } = await getPaginatedFeedbacks(
    PAGE_SIZE,
    startAfterKey
  );

  req.session.feedbackPageKeys[page - 1] = nextKey || null;

  res.render("feedbacks", {
    feedbacks,
    page,
    hasPrev: page > 1,
    hasNext: !!nextKey,
  });
};

exports.renderSubscriptions = async (req, res) => {
  let page = parseInt(req.query.page) || 1;
  if (page < 1) page = 1;

  if (!req.session.subscriptionPageKeys) req.session.subscriptionPageKeys = [];

  let startAfterKey = null;
  if (page > 1 && req.session.subscriptionPageKeys[page - 2]) {
    startAfterKey = req.session.subscriptionPageKeys[page - 2];
  }

  const { items: subscriptions, nextKey } = await getPaginatedSubscriptions(
    PAGE_SIZE,
    startAfterKey
  );

  req.session.subscriptionPageKeys[page - 1] = nextKey || null;

  res.render("subscriptions", {
    subscriptions,
    page,
    hasPrev: page > 1,
    hasNext: !!nextKey,
  });
};

exports.renderPayments = async (req, res) => {
  let page = parseInt(req.query.page) || 1;
  if (page < 1) page = 1;

  if (!req.session.paymentPageKeys) req.session.paymentPageKeys = [];

  let startAfterKey = null;
  if (page > 1 && req.session.paymentPageKeys[page - 2]) {
    startAfterKey = req.session.paymentPageKeys[page - 2];
  }

  const { items: payments, nextKey } = await getPaginatedPayments(
    PAGE_SIZE,
    startAfterKey
  );

  const enriched = await Promise.all(
    payments.map(async (payment) => {
      payment.studentName = await fetchNameByUid(
        "students",
        payment.studentUid
      );
      payment.teacherName = await fetchNameByUid(
        "teachers",
        payment.teacherUid
      );
      return payment;
    })
  );

  req.session.paymentPageKeys[page - 1] = nextKey || null;

  res.render("payments", {
    payments: enriched,
    page,
    hasPrev: page > 1,
    hasNext: !!nextKey,
  });
};

const getPaginatedStudents = async (pageSize, startAfterKey = null) => {
  return fetchPaginatedData("students", pageSize, startAfterKey);
};

const getPaginatedTeachers = async (pageSize, startAfterKey = null) => {
  return fetchPaginatedData("teachers", pageSize, startAfterKey);
};

const getPaginatedFeedbacks = async (pageSize, startAfterKey = null) => {
  const { items, nextKey } = await fetchPaginatedData(
    "system_feedbacks",
    pageSize,
    startAfterKey
  );

  const enriched = await Promise.all(
    items.map(async (feedback) => {
      const node = feedback.userType === "teacher" ? "teachers" : "students";
      feedback.userName = await fetchNameByUid(node, feedback.userId);
      return feedback;
    })
  );

  return { items: enriched, nextKey };
};

const getPaginatedSubscriptions = async (pageSize, startAfterKey = null) => {
  const { items, nextKey } = await fetchPaginatedData(
    "subscriptions",
    pageSize,
    startAfterKey
  );

  const enriched = await Promise.all(
    items.map(async (sub) => {
      sub.studentName = await fetchNameByUid("students", sub.studentUid);
      sub.teacherName = await fetchNameByUid("teachers", sub.teacherUid);
      return sub;
    })
  );

  return { items: enriched, nextKey };
};

const getPaginatedPayments = async (pageSize, startAfterKey = null) => {
  return fetchPaginatedData("khalti_payments", pageSize, startAfterKey);
};

const fetchNameByUid = async (path, uid) => {
  if (!uid) return null;
  const snap = await db.ref(`${path}/${uid}/name`).once("value");
  return snap.exists() ? snap.val() : null;
};

const fetchNameByUidFlexible = async (uid, path = null) => {
  if (!uid) return null;

  if (path) {
    return await fetchNameByUid(path, uid);
  }

  let snap = await db.ref(`students/${uid}/name`).once("value");
  if (snap.exists()) return snap.val();

  snap = await db.ref(`teachers/${uid}/name`).once("value");
  if (snap.exists()) return snap.val();

  return null;
};


// Students
exports.createStudent = async (req, res) => {
  const {
    name,
    phoneNumber,
    category,
    gmail,
    guardianName,
    guardianGmail,
    password,
    confirmPassword,
  } = req.body;

  const uid = phoneNumber;

  if (
    !name ||
    !phoneNumber ||
    !category ||
    !gmail ||
    !guardianName ||
    !guardianGmail ||
    !password
  ) {
    return res.status(400).send("All fields are required.");
  }

  if (password !== confirmPassword) {
    return res.status(400).send("Passwords do not match");
  }

  try {
    // const hashedPassword = await bcrypt.hash(password, 10);

    const studentData = {
      uid,
      name,
      phoneNumber,
      category,
      gmail,
      guardianName,
      guardianGmail,
      password,
      profilePicture: req.file
        ? `/uploads/profile_pictures/${req.file.filename}`
        : null,
    };

    await db.ref(`students/${uid}`).set(studentData);

    res.redirect("/admin/students");
  } catch (err) {
    console.error("Error creating student:", err);
    res.status(500).send("Failed to create student.");
  }
};

exports.editStudent = async (req, res) => {
  const { id } = req.params;
  const { name, phoneNumber, category, gmail, guardianName, guardianGmail } =
    req.body;

  try {
    const updateData = {
      name,
      phoneNumber,
      category,
      gmail,
      guardianName,
      guardianGmail,
    };

    if (req.file) {
      updateData.profilePicture = `/uploads/profile_pictures/${req.file.filename}`;
    }

    await db.ref(`students/${id}`).update(updateData);

    res.redirect("/admin/students");
  } catch (err) {
    console.error("Edit student error:", err);
    res.status(500).send("Failed to update student");
  }
};

exports.deleteStudent = async (req, res) => {
  const { id } = req.params;
  try {
    await db.ref(`students/${id}`).remove();
    res.redirect("/admin/students");
  } catch (err) {
    console.error("Delete student error:", err);
    res.status(500).send("Failed to delete student");
  }
};

// Teachers
exports.createTeacher = async (req, res) => {
  const { name, gmail, phoneNumber, category, password, confirmPassword } =
    req.body;

  if (password !== confirmPassword) {
    return res.status(400).send("Passwords do not match");
  }

  let profilePicture = "";
  if (req.file) {
    profilePicture = `/uploads/profile_pictures/${req.file.filename}`;
  }

  const uid = phoneNumber;

  try {
    await db.ref(`teachers/${uid}`).set({
      uid,
      phoneNumber,
      name,
      gmail,
      phoneNumber,
      category,
      password,
      profilePicture,
    });
    res.redirect("/admin/teachers");
  } catch (err) {
    console.error("Create teacher error:", err);
    res.status(500).send("Failed to create teacher");
  }
};

exports.editTeacher = async (req, res) => {
  const { id } = req.params;
  const { name, gmail, phoneNumber, category } = req.body;

  let updates = { name, gmail, phoneNumber, category };

  if (req.file) {
    updates.profilePicture = `/uploads/profile_pictures/${req.file.filename}`;
  }

  try {
    await db.ref(`teachers/${id}`).update(updates);
    res.redirect("/admin/teachers");
  } catch (err) {
    console.error("Edit teacher error:", err);
    res.status(500).send("Failed to update teacher");
  }
};

exports.deleteTeacher = async (req, res) => {
  const { id } = req.params;
  try {
    await db.ref(`teachers/${id}`).remove();
    res.redirect("/admin/teachers");
  } catch (err) {
    console.error("Delete teacher error:", err);
    res.status(500).send("Failed to delete teacher");
  }
};

// System Feedbacks
exports.updateFeedback = async (req, res) => {
  const feedbackId = req.params.id;
  const { message } = req.body;

  try {
    await db.ref(`system_feedbacks/${feedbackId}`).update({ message });
    res.redirect("/admin/feedbacks");
  } catch (error) {
    console.error("Error updating feedback:", error);
    res.status(500).send("Failed to update feedback.");
  }
};

exports.deleteFeedback = async (req, res) => {
  const feedbackId = req.params.id;

  try {
    await db.ref(`system_feedbacks/${feedbackId}`).remove();
    res.redirect("/admin/feedbacks");
  } catch (error) {
    console.error("Error deleting feedback:", error);
    res.status(500).send("Failed to delete feedback.");
  }
};

// Subscriptions
exports.editSubscription = async (req, res) => {
  const { id } = req.params;
  const { status, packageTitle, packageDuration, packagePrice } = req.body;

  try {
    await db.ref(`subscriptions/${id}`).update({
      status,
      packageTitle,
      packageDuration: parseInt(packageDuration),
      packagePrice: parseFloat(packagePrice),
    });

    res.redirect("/admin/subscriptions");
  } catch (error) {
    console.error("Failed to update subscription:", error);
    res.status(500).send("Error updating subscription.");
  }
};

exports.deleteSubscription = async (req, res) => {
  const { id } = req.params;

  try {
    await db.ref(`subscriptions/${id}`).remove();
    res.redirect("/admin/subscriptions");
  } catch (error) {
    console.error("Failed to delete subscription:", error);
    res.status(500).send("Error deleting subscription.");
  }
};


// Chats
exports.renderChatOverview = async (req, res) => {
  const chatSnap = await db.ref("findChats").once("value");
  const chatData = chatSnap.exists() ? chatSnap.val() : {};

  const seenRooms = new Set();
  const conversations = [];

  for (const roomKey in chatData) {
    const messagesObj = chatData[roomKey].messages || {};
    const messages = Object.entries(messagesObj).map(([id, data]) => ({
      id,
      ...data,
    }));

    if (messages.length === 0) continue;

    // Get the latest message
    const latestMessage = messages.sort((a, b) => b.timestamp - a.timestamp)[0];
    const senderId = latestMessage.senderId;
    const receiverId = roomKey.replace(senderId, '');

    // Canonicalize roomId to avoid duplicates
    const canonicalRoomId = [senderId, receiverId].sort().join('');
    if (seenRooms.has(canonicalRoomId)) continue;
    seenRooms.add(canonicalRoomId);

    conversations.push({
      roomId: canonicalRoomId,
      senderId,
      receiverId,
      senderName: await fetchNameByUidFlexible(senderId),
      receiverName: await fetchNameByUidFlexible(receiverId),
      message: latestMessage.message,
      timestamp: latestMessage.timestamp,
    });
  }

  conversations.sort((a, b) => b.timestamp - a.timestamp);

  res.render("chats", { conversations });
};

exports.renderChatDetail = async (req, res) => {
  const { roomId } = req.params;
  const messagesSnap = await db.ref(`findChats/${roomId}/messages`).once("value");
  const messages = messagesSnap.exists()
    ? Object.entries(messagesSnap.val()).map(([id, msg]) => ({ id, ...msg }))
    : [];

  messages.sort((a, b) => a.timestamp - b.timestamp);

  res.render("chat-detail", { roomId, messages });
};