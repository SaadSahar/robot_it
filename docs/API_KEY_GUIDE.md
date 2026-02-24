# دليل الحصول على مفتاح Gemini API الصحيح
# Guide to Get the Correct Gemini API Key

## المشكلة / The Problem
مفتاح API الحالي في ملف `.env` هو مفتاح Google Cloud API Key (لـ Vertex AI) الذي يتطلب OAuth2.
نحتاج إلى مفتاح Gemini API Key الذي يقبل API keys مباشرة.

The current API key in `.env` is a Google Cloud API Key (for Vertex AI) which requires OAuth2.
We need a Gemini API Key that accepts API keys directly.

## الحل / The Solution

### الخطوة 1: الحصول على مفتاح Gemini API
### Step 1: Get Gemini API Key

1. اذهب إلى: https://makersuite.google.com/app/apikey
   Go to: https://makersuite.google.com/app/apikey

2. سجل الدخول بحساب Google الخاص بك
   Sign in with your Google account

3. اضغط على "Create API Key" أو "إنشاء مفتاح API"
   Click on "Create API Key"

4. سيظهر لك مفتاح API. انسخه
   An API key will be displayed. Copy it

### الخطوة 2: تحديث ملف .env
### Step 2: Update .env file

افتح ملف `bot_it/.env` واستبدل مفتاح API الحالي بالمفتاح الجديد:
Open `bot_it/.env` and replace the current API key with the new one:

```env
# استبدل هذا المفتاح بمفتاح Gemini API الجديد
# Replace this key with your new Gemini API key
GOOGLE_CLOUD_API_KEY=your_new_gemini_api_key_here
```

مثال / Example:
```env
GOOGLE_CLOUD_API_KEY=AIzaSyABC123XYZ789...
```

### الخطوة 3: إعادة تشغيل السيرفر
### Step 3: Restart the Server

1. أوقف السيرفر الحالي (اضغط Ctrl+C في الطرفية)
   Stop the current server (press Ctrl+C in terminal)

2. أعد تشغيل السيرفر:
   Restart the server:
   ```bash
   npm start
   ```

## الفرق بين المفاتيح / Difference Between Keys

| نوع المفتاح / Key Type | المصدر / Source | الاستخدام / Usage |
|------------------------|------------------|-------------------|
| **Google Cloud API Key** | Google Cloud Console | Vertex AI APIs (يحتاج OAuth2) |
| **Gemini API Key** | AI Studio (makersuite.google.com) | Gemini APIs (يقبل API Key) |

## التحقق من صحة المفتاح / Verify the Key

مفتاح Gemini API الصحيح يبدأ عادةً بـ:
A correct Gemini API key usually starts with:
- `AIza` أو `AIzaSy`

مفتاح Google Cloud API Key يبدأ عادةً بـ:
A Google Cloud API key usually starts with:
- `AQ.` أو `GOAX`

مفتاحك الحالي يبدأ بـ `AQ.` مما يعني أنه مفتاح Google Cloud API Key.
Your current key starts with `AQ.` which means it's a Google Cloud API Key.

## بعد التحديث / After Update

بعد تحديث مفتاح API وإعادة تشغيل السيرفر، يجب أن يعمل التطبيق بشكل صحيح.
After updating the API key and restarting the server, the application should work correctly.

اختبار / Test:
1. افتح المتصفح: http://localhost:3000
2. اضغط على زر الميكروفون
3. قل: "روبوت ما هي بايثون"
