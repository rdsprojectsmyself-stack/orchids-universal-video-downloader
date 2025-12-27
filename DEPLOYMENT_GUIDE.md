# 🚀 Deployment Guide

## Architecture
- **Frontend**: Next.js (Vercel)
- **Backend**: Express.js (Render)
- **Database**: SQLite (RenderPersistent Disk)
- **Authentication**: Direct Google OAuth 2.0 (Google Identity Services) + JWT (Backend)

## Backend Deployment (Render)

### 1. Prepare Backend
```bash
cd backend
```

### 2. Add yt-dlp Binary
The backend uses `yt-dlp` for video extraction. Render supports installing it via a custom build command or by including the binary.
Alternatively, the backend is configured to look for `yt-dlp` in the system path or the local directory.

### 3. Environment Variables (Render)
Configure these in the Render Dashboard -> Environment:

```env
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com  # MUST match the frontend client ID
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRATION=7d
ADMIN_EMAIL=your_admin@email.com
FRONTEND_URL=https://your-vercel-app.vercel.app
PORT=10000
NODE_ENV=production
```

### 4. Render Settings
- **Build Command**: `npm install`
- **Start Command**: `node server.js`
- **Environment**: Node
- **Instance Type**: Free/Starter

### 5. Enable Disk Persistence (for SQLite)
In Render dashboard, add a **Persistent Disk**:
- Mount Path: `/opt/render/project/src/backend/data` (Ensure DB path matches your app structure)
- Size: 1GB

## Frontend Deployment (Vercel)

### 1. Environment Variables (Vercel)
Configure these in the Vercel Dashboard -> Settings -> Environment Variables:

```env
NEXT_PUBLIC_BACKEND_URL=https://your-backend.onrender.com
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
```

### 2. Vercel Settings
- **Framework Preset**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: (leave as default)
- **Root Directory**: `frontend`

## Testing

### Backend Health Check
```bash
curl https://your-backend.onrender.com/health
```

## Important Notes

1.  **Google OAuth**:
    *   Create a project in [Google Cloud Console](https://console.cloud.google.com/).
    *   Enable **"Google People API"**.
    *   Create **OAuth 2.0 Client IDs**.
    *   **Authorized JavaScript Origins**: Add your Vercel URL and `http://localhost:3000`.
    *   **Redirect URIs**: (Not strictly needed for the popup flow, but good to add the same origins).
    *   **CRITICAL**: Use the **SAME** Client ID for `GOOGLE_CLIENT_ID` (Backend) and `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (Frontend).

2.  **CORS**: Backend allows requests from `FRONTEND_URL` env variable. Use commas to separate multiple URLs in `server.js` if needed (though the current implementation filters by exact match or array).

3.  **Trimming**: Core functionality relies on `ffmpeg`. Render's default Node environment includes `ffmpeg`.

## Local Development

### Backend
1.  `cd backend`
2.  `npm install`
3.  Create `.env` with variables listed above.
4.  `npm start`

### Frontend
1.  `cd frontend`
2.  `npm install`
3.  Create `.env.local` with variables listed above.
4.  `npm run dev`

Set `NEXT_PUBLIC_BACKEND_URL=http://localhost:10000` in `.env.local` for local testing.

---

**Ready to deploy!** 🚀

---

## Bypassing "Sign in to confirm you're not a bot"

If you encounter a bot detection error on Render, follow these steps:

### Step 1: Export Cookies
1.  Install the [Get cookies.txt LOCALLY](https://chrome.google.com/webstore/detail/get-cookiestxt-locally/ccmclokmhdnhbhedkhjocageobnrbbon) extension.
2.  Open **YouTube** and ensure you are logged in.
3.  Click the extension icon -> **Export** for `youtube.com`.
4.  Copy all text from the downloaded file.

### Step 2: Update Render Environment Variables
1.  Go to **Render Dashboard** -> **Environment**.
2.  Add a new variable:
    -   Key: `COOKIES_TXT_CONTENT`
    -   Value: [Paste the copied text here]
3.  Save and wait for the redeploy.

