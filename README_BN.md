# রিমেল স্টুডিও — মূল ওয়েব অ্যাপ

এটি আগের static HTML demo নয়; এটি React + TypeScript + Supabase ভিত্তিক production-oriented starter app। Admin Gmail, private file storage, QR upload flow এবং print calendar-এর জন্য প্রয়োজনীয় source code অন্তর্ভুক্ত।

## এই সোর্সে যা তৈরি আছে

- Premium black & gold responsive admin panel
- নির্দিষ্ট Admin Gmail: `rimelstudio60@gmail.com` (অন্য Gmail-কে Admin UI-তে ঢুকতে দেয় না)
- Google OAuth login (Supabase Auth provider দিয়ে)
- ৫টি মেনু: Dashboard, ছবি সংগ্রহ, Edit, Print, ক্যালেন্ডার
- Collection পেজে QR Code — `/upload` পাবলিক আপলোড পেজে নিয়ে যায়
- গ্রাহক ফোনের gallery/file picker থেকে একাধিক ছবি/PDF/document বেছে পাঠাতে পারে
- Supabase private bucket-এ ফাইল যায়; Admin collection-এ metadata দেখা যায়
- Admin-এর জন্য signed download link
- Calendar: মাস/তারিখ/গ্রাহকের নাম/সংযুক্ত ফাইল সেভ
- Image preview: brightness, contrast, saturation, passport/stamp aspect ratio
- Print dialog

## গুরুত্বপূর্ণ সীমাবদ্ধতা

- AI background removal, AI clothes change, AI photo enhancement চালু নয়; এগুলোর জন্য আলাদা AI image API এবং সার্ভার integration লাগবে।
- বর্তমান Edit-এর background রং পরিবর্তনটি আসল ছবির background cutout করে না।
- Passport/stamp preset aspect ratio preview দেয়; প্রকৃত print DPI, crop positioning ও paper layout আরও পরিমার্জন দরকার।
- PDF/document-এর পূর্ণ OCR, লেখা পরিবর্তন/যোগ-বিয়োগ এখনো নেই।
- Public upload-এ spam ঠেকাতে production launch-এর আগে CAPTCHA/Cloudflare Turnstile + server-side rate limit যোগ করা উচিত।
- QR code-এ domain auto ব্যবহার হয়; localhost-এর QR কেবল local test-এ কাজ করবে। Deploy করার পর QR-এ live domain আসবে।
- Browser থেকে Gmail password নেওয়া হয় না; Google OAuth ব্যবহার হয়। Admin allowlist-এর পাশাপাশি Supabase SQL RLS-এও নির্দিষ্ট Gmail বসানো আছে।

## সেটআপ — একবারই করতে হবে

### 1. Supabase project
1. `https://supabase.com` খুলে নিজের account দিয়ে একটি project তৈরি করুন।
2. Project Dashboard → SQL Editor → New query খুলুন।
3. `supabase/migrations/0001_rimel_studio.sql` ফাইলের সম্পূর্ণ SQL paste করে Run দিন।
4. Project Settings → API থেকে Project URL ও anon/public key কপি করুন।

### 2. Google login
1. Supabase Dashboard → Authentication → Providers → Google চালু করুন।
2. Google Cloud Console-এ OAuth Client তৈরি করে Supabase-এর দেখানো callback URL-টি Authorized redirect URI-তে যোগ করুন।
3. Google Client ID ও Client Secret Supabase Google provider-এ বসিয়ে Save করুন।
4. Supabase Authentication → URL Configuration-এ আপনার live site URL এবং local development URL (`http://localhost:5173`) Redirect URLs-এ যোগ করুন।
5. OAuth consent screen-এ app-এর নাম ও প্রয়োজনীয় তথ্য পূরণ করুন। Google OAuth testing mode-এ থাকলে আপনার Admin Gmail-কে test user হিসেবে যোগ করুন।

### 3. App environment
1. এই project folder-এ `.env.example` কপি করে `.env` নামে রাখুন।
2. Supabase Project URL এবং anon/public key বসান। `VITE_ADMIN_EMAIL` অপরিবর্তিত রাখুন।
3. Terminal-এ:
   ```bash
   npm install
   npm run dev
   ```
4. Browser-এ `http://localhost:5173` খুলুন।

### 4. Deploy
Vercel/Netlify-এ এই folder deploy করুন। Build command `npm run build`, output folder `dist`। Hosting provider-এ `.env`-এর তিনটি variable Environment Variables হিসেবে বসান। `/upload` route-এ fallback rewrite প্রয়োজন হলে hosting-এর SPA rewrite সেট করুন।

Deploy করার পর Supabase Auth URL Configuration-এ live domain যোগ করুন। তারপর Collection menu-এর QR code-টি live upload URL-এ নিজে থেকেই তৈরি হবে।

## Security notes
- `service_role` key কখনো `.env`-এর `VITE_` variable-এ বা browser code-এ দেবেন না।
- Supabase anon key browser-এ থাকা স্বাভাবিক; নিরাপত্তা RLS policies দ্বারা প্রয়োগ করা হয়েছে।
- Public upload insert-only; public visitor অন্য গ্রাহকের ফাইল/তথ্য পড়তে পারবে না।
- এই app-এর SQL policies-এ Admin email স্থিরভাবে `rimelstudio60@gmail.com` দেওয়া আছে। Admin Gmail বদলালে SQL policies এবং app environment দুটোই একসাথে পরিবর্তন করতে হবে।
- বাস্তব গ্রাহকের sensitive document নেওয়ার আগে privacy notice, retention/deletion policy এবং abuse protection যুক্ত করুন।

## Logo পরে যুক্ত করা
- `public/` folder-এ logo/profile image রাখার জন্য জায়গা যোগ করা যাবে।
- Login background logo ও profile photo user-provided assets পেলে বসানো হবে।

## আপনার দেওয়া লোগো/ছবি
- `public/assets/rimel-profile.png` — Admin প্রোফাইল এবং সাইডবারের ব্র্যান্ড আইকন।
- `public/assets/google-login-background.png` — Google Admin Login স্ক্রিনের ব্যাকগ্রাউন্ড।
এই ফাইল দুটি আপনার দেওয়া মূল ছবির অপরিবর্তিত কপি।
