# Shaxsiyat testi — backend

O'zbekcha MBTI testi uchun to'liq backend: akkountlar, natijalar tarixi va
Telegram bot orqali admin bildirishnomasi. Parollar va bot tokeni faqat
serverda saqlanadi, brauzerga hech qachon chiqmaydi.

## Tuzilma

```
mbti-backend/
  server.js        — Express API (register/login/results)
  db.js             — fayl-asosidagi oddiy "baza" (data/users.json)
  public/index.html — frontend (backendni serve qiladi)
  .env.example      — sozlamalar namunasi
```

## O'rnatish

1. Node.js 18+ o'rnatilgan bo'lishi kerak.
2. Loyihaga kiring va paketlarni o'rnating:

   ```
   cd mbti-backend
   npm install
   ```

3. `.env` faylini yarating:

   ```
   cp .env.example .env
   ```

4. `.env` faylini oching va:
   - `JWT_SECRET` ni uzun tasodifiy matn bilan almashtiring
   - Telegram bildirishnomasini yoqish uchun:
     - Telegram-da **@BotFather** ga yozing, `/newbot` buyrug'i bilan bot yarating va tokenni oling
     - **@userinfobot** ga yozib, o'z chat_id raqamingizni bilib oling
     - `.env` faylida:
       ```
       TELEGRAM_ENABLED=true
       TELEGRAM_BOT_TOKEN=123456:ABC-token
       TELEGRAM_CHAT_ID=123456789
       ```
     - Botga birinchi marta o'zingiz `/start` yozib, suhbatni boshlab qo'ying (aks holda bot sizga xabar yubora olmaydi)

## Ishga tushirish

```
npm start
```

Server odatda `http://localhost:3000` manzilida ishga tushadi. Brauzerda shu
manzilni oching — sayt shu yerdan xizmat qiladi (frontend va backend bitta
serverda).

Ishlab chiqish vaqtida fayl o'zgarganda serverni avtomatik qayta ishga
tushirish uchun:

```
npm run dev
```

## API qisqacha

| So'rov | Yo'l | Vazifasi |
|---|---|---|
| POST | `/api/register` | Yangi akkount yaratadi, sessiya cookie o'rnatadi |
| POST | `/api/login` | Login qiladi, sessiya cookie o'rnatadi |
| POST | `/api/logout` | Sessiyani tugatadi |
| GET | `/api/me` | Joriy foydalanuvchi ma'lumotini qaytaradi |
| POST | `/api/theme` | Tanlangan mavzuni (light/dark) saqlaydi |
| POST | `/api/results` | Test natijasini saqlaydi va Telegram-ga xabar yuboradi |

Sessiya `httpOnly` cookie ichidagi JWT token orqali boshqariladi — token
JavaScript orqali o'qib bo'lmaydi, bu XSS xavfini kamaytiradi.

## Ma'lumotlar qayerda saqlanadi

`data/users.json` — oddiy fayl-asosidagi "baza". Kichik/shaxsiy loyiha uchun
yetarli. Foydalanuvchi ko'payib, bir vaqtda ko'p yozuv bo'ladigan bo'lsa,
buni haqiqiy bazaga (masalan, PostgreSQL yoki SQLite) almashtirish tavsiya
etiladi — `db.js` shu joyni almashtirish uchun ajratilgan.

## Production uchun eslatmalar

- `.env` faylini hech qachon ochiq joyga (masalan, GitHub) yuklamang.
- `JWT_SECRET` ni albatta o'zgartiring.
- HTTPS orqali joylashtiring (masalan, Render, Railway, VPS + Nginx + Let's
  Encrypt); shunda cookie'ga `secure: true` qo'shish tavsiya etiladi.
- Ko'p foydalanuvchi kutilsa, `express-rate-limit` kabi paket bilan
  `/api/login` va `/api/register` yo'llarini so'rovlar sonidan himoyalang.
