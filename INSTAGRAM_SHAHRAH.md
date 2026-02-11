# شاهراه Instagram (بدون درگیری با `teamId`)

این پروژه یک API محلی روی `http://localhost:3000` بالا می‌آورد که درخواست‌ها را به Bundle.social می‌فرستد.

هدف این فایل: شما فقط `عکس/ویدیو + کپشن (+ تاریخ اختیاری)` بدهید و سرویس بقیه مسیر را انجام دهد و در پاسخ `postId` برگرداند.

---

## پیش‌نیاز (یک‌بار برای همیشه)

1. در `/Users/mac/Documents/development/expres-social-api/express/.env` این‌ها باید ست شده باشند:
   - `BUNDLESOCIAL_API_KEY`
   - `BUNDLESOCIAL_WEBHOOK_SECRET`
2. برای اینکه در هیچ درخواستِ شما `teamId` لازم نباشد:
   - `BUNDLESOCIAL_DEFAULT_TEAM_ID` را یک‌بار در همان `.env` بگذارید.

---

## اجرای سرور

```bash
cd /Users/mac/Documents/development/expres-social-api/express
npm install
npm run dev
```

---

## شاهراه 1: Feed Post (عکس/ویدیو)

**یک درخواست**: آپلود + ساخت پست

`POST /api/instagram/publish/feed` (multipart/form-data)

فیلدها:
- `file` یا `files` (حداکثر 10 فایل)
- `caption` (متن کپشن)
- اختیاری:
  - `postDate` (ISO 8601 مثل `2026-02-10T21:30:00Z`)
  - `status` = `DRAFT` یا `SCHEDULED` (پیشنهاد برای تست: `DRAFT`)
  - `collaborators` (CSV یا JSON array)
  - `tagged` (JSON array مثل `[{"username":"u","x":0.5,"y":0.5}]`)

نمونه:
```bash
curl -sS -X POST http://localhost:3000/api/instagram/publish/feed \
  -F 'file=@/path/to/image.jpg;type=image/jpeg' \
  -F 'caption=سلام دنیا' \
  -F 'status=DRAFT'
```

---

## شاهراه 2: Reel (ویدیو mp4)

`POST /api/instagram/publish/reel` (multipart/form-data)

فیلدها:
- `file` (فقط 1 فایل)
- `caption`
- اختیاری:
  - `postDate`
  - `status`
  - `shareToFeed=true|false`
  - `thumbnail` (URL تصویر روی bundle.social)
  - `thumbnailOffset` (عدد، میلی‌ثانیه)

نمونه:
```bash
curl -sS -X POST http://localhost:3000/api/instagram/publish/reel \
  -F 'file=@/path/to/video.mp4;type=video/mp4' \
  -F 'caption=Reel test' \
  -F 'status=DRAFT' \
  -F 'shareToFeed=true'
```

---

## شاهراه 3: Story (عکس/ویدیو)

`POST /api/instagram/publish/story` (multipart/form-data)

فیلدها:
- `file` (فقط 1 فایل)
- `caption`
- اختیاری: `postDate`, `status`

نمونه:
```bash
curl -sS -X POST http://localhost:3000/api/instagram/publish/story \
  -F 'file=@/path/to/image.jpg;type=image/jpeg' \
  -F 'caption=Story test' \
  -F 'status=DRAFT'
```

---

## بعد از ساخت پست: وضعیت، خطا، Retry, Delete

**گرفتن وضعیت/جزئیات**
```bash
curl -sS http://localhost:3000/api/v1/post/<POST_ID>
```

**Retry اگر خطا خورد**
```bash
curl -sS -X POST http://localhost:3000/api/v1/post/<POST_ID>/retry
```

**حذف (برای کنسل کردن قبل از انتشار)**
```bash
curl -sS -X DELETE http://localhost:3000/api/v1/post/<POST_ID>
```

---

## چک سریع وضعیت (بدون `teamId`)

این endpoint برای پاسخ به سوالاتی مثل "چرا پست‌ها ارسال نمی‌شوند؟" یا "quota پر شده یا نه؟" ساخته شده:
```bash
curl -sS http://localhost:3000/api/instagram/usage
```

---

## فایل‌های بزرگ (مسیر 3 مرحله‌ای آپلود)

اگر فایل شما از محدودیت simple upload بالاتر است:
1) `POST /api/v1/upload/init`
2) `PUT` مستقیم به signed URL
3) `POST /api/v1/upload/finalize`

بعدش می‌توانید همان شاهراه‌های `/api/instagram/publish/*` را بدون فایل و فقط با `uploadIds` صدا بزنید:
- body: `caption`, `uploadIds` (CSV یا JSON)

---

## محدودیت‌های مهم (برای جلوگیری از خطا)

این‌ها باید رعایت شوند تا سمت Instagram رد نشود:
- کپشن: حداکثر 2000 کاراکتر
- Collaborators: حداکثر 3 نفر
- Tagged users: حداکثر 20 نفر
- عکس: حداکثر 8MB
- ویدیو Story: حداکثر 60 ثانیه

نکته: خود Bundle.social برای simple upload محدودیت جدا دارد (مثلا برای عکس‌ها تا 25MB)، ولی Instagram در بعضی موارد سخت‌گیرتر است.
