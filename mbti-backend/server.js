require("dotenv").config();
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const path = require("path");
const { readDb, writeDb } = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_iltimos_ozgartiring";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 kun

const BOT_ENABLED = process.env.TELEGRAM_ENABLED === "true";
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

app.disable("x-powered-by");
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// ---------- Yordamchi funksiyalar ----------

function publicUser(rec) {
  return { username: rec.username, results: rec.results, theme: rec.theme || "light" };
}

function signToken(username) {
  return jwt.sign({ username }, JWT_SECRET, { expiresIn: "30d" });
}

function authMiddleware(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: "Tizimga kirilmagan." });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.username = payload.username;
    next();
  } catch (e) {
    res.clearCookie("token");
    return res.status(401).json({ error: "Sessiya muddati tugagan, qayta kiring." });
  }
}

// Telegram-ga xabar yuborish — token faqat serverda, brauzerga hech qachon chiqmaydi
async function notifyAdmin(username, typeCode) {
  if (!BOT_ENABLED || !BOT_TOKEN || !CHAT_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: `Yangi faoliyat\nFoydalanuvchi: ${username}\nTuri: ${typeCode}`,
      }),
    });
  } catch (e) {
    console.warn("Telegram xabari yuborilmadi:", e.message);
  }
}

// ---------- API ----------

app.post("/api/register", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: "Ma'lumotlar to'liq emas." });
  }
  const uname = String(username).trim();
  if (uname.length < 3) {
    return res.status(400).json({ error: "Foydalanuvchi nomi kamida 3 belgidan iborat bo'lsin." });
  }
  if (!/^[a-zA-Z0-9_.]+$/.test(uname)) {
    return res.status(400).json({ error: "Foydalanuvchi nomida faqat harf, raqam, _ va . bo'lishi mumkin." });
  }
  if (String(password).length < 4) {
    return res.status(400).json({ error: "Parol kamida 4 belgidan iborat bo'lsin." });
  }

  const db = readDb();
  const key = uname.toLowerCase();
  if (db.users[key]) {
    return res.status(409).json({ error: "Bu foydalanuvchi nomi allaqachon band." });
  }

  const passHash = await bcrypt.hash(password, 10);
  db.users[key] = {
    username: uname,
    passHash,
    results: [],
    theme: "light",
    createdAt: Date.now(),
  };
  await writeDb(db);

  const token = signToken(uname);
  res.cookie("token", token, { httpOnly: true, sameSite: "lax", maxAge: COOKIE_MAX_AGE });
  notifyAdmin(uname, "(yangi ro'yxatdan o'tish)");
  res.json({ user: publicUser(db.users[key]) });
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: "Ma'lumotlar to'liq emas." });
  }
  const db = readDb();
  const rec = db.users[String(username).trim().toLowerCase()];
  if (!rec) return res.status(404).json({ error: "Bunday foydalanuvchi topilmadi." });

  const ok = await bcrypt.compare(password, rec.passHash);
  if (!ok) return res.status(401).json({ error: "Parol noto'g'ri." });

  const token = signToken(rec.username);
  res.cookie("token", token, { httpOnly: true, sameSite: "lax", maxAge: COOKIE_MAX_AGE });

  const last = rec.results[rec.results.length - 1];
  notifyAdmin(rec.username, last ? last.type : "(hali test topshirmagan)");

  res.json({ user: publicUser(rec) });
});

app.post("/api/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ ok: true });
});

app.get("/api/me", authMiddleware, (req, res) => {
  const db = readDb();
  const rec = db.users[req.username.toLowerCase()];
  if (!rec) return res.status(404).json({ error: "Topilmadi." });
  res.json({ user: publicUser(rec) });
});

app.post("/api/theme", authMiddleware, async (req, res) => {
  const { theme } = req.body || {};
  const db = readDb();
  const rec = db.users[req.username.toLowerCase()];
  if (!rec) return res.status(404).json({ error: "Topilmadi." });
  rec.theme = theme === "dark" ? "dark" : "light";
  await writeDb(db);
  res.json({ ok: true });
});

app.post("/api/results", authMiddleware, async (req, res) => {
  const { type } = req.body || {};
  if (!type || !/^[EI][SN][TF][JP]$/.test(type)) {
    return res.status(400).json({ error: "Noto'g'ri natija formati." });
  }
  const db = readDb();
  const rec = db.users[req.username.toLowerCase()];
  if (!rec) return res.status(404).json({ error: "Topilmadi." });

  rec.results.push({ type, date: Date.now() });
  await writeDb(db);
  notifyAdmin(rec.username, type);

  res.json({ user: publicUser(rec) });
});

app.listen(PORT, () => {
  console.log(`MBTI backend http://localhost:${PORT} manzilida ishga tushdi`);
});
