# 🚀 Orchids Universal Video Downloader - Deployment Guide

## 📋 **Project Overview**

- **Frontend**: Next.js 15 (App Router) -> Deploy to **Vercel**
- **Backend**: Node.js/Express (yt-dlp + FFmpeg) -> Deploy to **Render** or **Railway**
- **Database**: SQLite (local file)
- **Auth**: Firebase + JWT sync

---

## 🛠️ **Deployment Steps**

### **1. Backend Deployment (Render/Railway)**

The backend needs a server environment with Python (for `yt-dlp`) and FFmpeg.

**Environment Variables**:
```plaintext
PORT=5000
GOOGLE_CLIENT_ID=your_google_id
JWT_SECRET=your_secret_key
ADMIN_EMAIL=dhanaprabha216@gmail.com
FRONTEND_URL=https://your-frontend.vercel.app
NODE_ENV=production
```

**Deployment Config**:
- **Root Directory**: `backend`
- **Build Command**: `npm install`
- **Start Command**: `node index.js`
- **Node Version**: 20.x

---

### **2. Frontend Deployment (Vercel)**

**Environment Variables**:
```plaintext
NEXT_PUBLIC_BACKEND_URL=https://your-backend-url.com
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

**Vercel Settings**:
- **Framework Preset**: Next.js
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Install Command**: `npm install`

---

## ✅ **Post-Deployment Verification**

1. **Auth Flow**: Verify you can sign in with Google and the session persists.
2. **Download Flow**: Paste a URL and verify metadata loads.
3. **Trimming**: Test with a short video to verify FFmpeg processing.
4. **Admin Panel**: Login as `dhanaprabha216@gmail.com` and check system stats.

---

## 📂 **Final Project Structure**

```
/orchids-universal-video-downloader
├── /frontend               # Next.js Application
│   ├── src/app             # Pages & Layouts
│   ├── src/contexts        # Auth State
│   └── src/lib             # Firebase & Auth logic
├── /backend                # Express API
│   ├── index.js            # Entry Point
│   ├── controllers/        # Business Logic
│   ├── models/             # SQLite Models
│   └── routes/             # API Endpoints
└── README.md
```

---

## 🏁 **Status**
The repository is fully synchronized and verified for production.
✨ **Ready to deploy!** ✨
