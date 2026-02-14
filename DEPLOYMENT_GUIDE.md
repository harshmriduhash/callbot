# 🌐 Deployment Guide: CallBot AI

CallBot AI consists of two parts: a **Frontend (React)** and a **Backend (Node.js/WebSockets)**. Follow these steps to take your product live.

---

## 1. Deploy the Backend (The "Engine")
The backend handles the real-time telephony and AI processing. It **must** be deployed to a platform that supports WebSockets.

### Recommended: [Railway.app](https://railway.app/) or [Render.com](https://render.com/)

**Steps for Railway:**
1. Create a new project and select "Deploy from GitHub repo."
2. Select your `callbot` repository.
3. In the "Settings," set the **Root Directory** to `/server`.
4. Add all **Environment Variables** from your `.env.local` to the Railway "Variables" tab.
5. Railway will automatically detect the `package.json` in `/server` and deploy.
6. **Important**: Once deployed, you will get a URL like `https://your-backend.up.railway.app`.

---

## 2. Deploy the Frontend (The "Dashboard")
The frontend is a static Vite app and can be hosted anywhere.

### Recommended: [Vercel](https://vercel.com/) or [Netlify](https://netlify.com/)

**Steps for Vercel:**
1. Connect your GitHub repo to Vercel.
2. Set the **Framework Preset** to `Vite`.
3. Keep the **Root Directory** as the root of your repo.
4. Add the following **Environment Variables**:
   - `VITE_BACKEND_URL`: The URL of your deployed backend (from Step 1).
   - `VITE_GEMINI_API_KEY`: Your Gemini API key.
   - `VITE_SUPABASE_URL`: Your Supabase URL.
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase Anon Key.
5. Click **Deploy**.

---

## 3. Final Step: Connect Twilio
Now that your backend is live, you must tell Twilio where to send incoming calls.

1. Go to your [Twilio Console](https://www.twilio.com/console).
2. Navigate to **Phone Numbers** > **Manage** > **Active Numbers**.
3. Click on the phone number you want to use for CallBot.
4. Under the **Voice & Fax** section:
   - Find "A CALL COMES IN."
   - Set it to **Webhook**.
   - Paste your backend URL with the `/twiml` endpoint: 
     `https://your-backend.up.railway.app/twiml`
   - Set the method to **HTTP POST**.
5. Click **Save**.

---

## 🚀 You are Live!
Test your deployment by calling your Twilio number. If everything is configured correctly, your AI assistant will answer immediately.

### Troubleshooting:
- **WebSocket issues**: Ensure your backend hosting provider doesn't have a timeout for WebSocket connections.
- **Mixed Content**: Ensure both your frontend and backend are using `https`.
- **Latency**: Check the logs on your backend hosting provider to see the response times from Google Gemini and Deepgram.
