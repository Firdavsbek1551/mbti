// Oddiy fayl-asosidagi "baza" — kichik/shaxsiy loyihalar uchun yetarli.
// Katta trafik yoki ko'p serverli joylashtirish uchun buni haqiqiy bazaga
// (Postgres, MongoDB va h.k.) almashtirish tavsiya etiladi.

const fs = require("fs");
const path = require("path");

const DB_DIR = path.join(__dirname, "data");
const DB_PATH = path.join(DB_DIR, "users.json");

function ensureDb() {
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ users: {} }, null, 2));
  }
}

function readDb() {
  ensureDb();
  const raw = fs.readFileSync(DB_PATH, "utf-8");
  try {
    return JSON.parse(raw);
  } catch (e) {
    return { users: {} };
  }
}

// Yozishlarni ketma-ket bajarish uchun oddiy navbat (race condition oldini olish uchun)
let writeChain = Promise.resolve();

function writeDb(data) {
  writeChain = writeChain.then(
    () =>
      new Promise((resolve, reject) => {
        fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), (err) => {
          if (err) reject(err);
          else resolve();
        });
      })
  );
  return writeChain;
}

module.exports = { readDb, writeDb };
