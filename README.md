# Whop OAuth Backend for Unity

**Production-ready Whop OAuth backend** deployable on **Vercel** that enables Unity games to authenticate users via Whop. This backend acts as a secure bridge between Unity clients and Whop's OAuth system, keeping your API keys safe on the server.

## 🎯 What This Does

- ✅ **Server-side OAuth flow** - Keeps `WHOP_API_KEY` secure (never exposed to Unity)
- ✅ **Session JWT tokens** - Issues short-lived (2h) session tokens for Unity clients
- ✅ **Unity-friendly JSON APIs** - `/api/me`, `/api/session` for identity checks
- ✅ **CORS support** - Allows `localhost:*` for Unity Editor and standalone testing
- ✅ **Loopback helper** - Optional HTML page that auto-POSTs session to Unity's local HTTP listener
- ✅ **Production-ready** - CSRF protection, secure cookies, proper error handling

## 🏗️ Architecture

```
Unity Client (Game)
     ↓ Opens browser
     ↓
Whop OAuth (User Login)
     ↓ Redirects with code
     ↓
Your Vercel Backend (This repo)
  - Exchanges code → Whop tokens (server-side)
  - Issues session JWT (2h expiry)
     ↓ Returns JSON + optional HTML loopback
     ↓
Unity Client
  - Stores session_token
  - Calls GET /api/me with Bearer token
```

## 📁 Project Structure

```
whop-kart-oauth/
├── README.md
├── .gitignore
├── .env.example          # Template for environment variables
├── vercel.json           # Vercel deployment config
├── tsconfig.json         # TypeScript configuration
├── package.json          # Dependencies and scripts
├── api/                  # Vercel serverless functions
│   ├── oauth/
│   │   ├── init.ts       # GET /api/oauth/init (starts OAuth)
│   │   └── callback.ts   # GET /api/oauth/callback (handles redirect)
│   ├── me.ts             # GET /api/me (returns user from JWT)
│   ├── session.ts        # GET /api/session (validates JWT)
│   └── health.ts         # GET /api/health (uptime check)
└── src/
    └── lib/
        ├── whop.ts       # Whop SDK wrapper
        ├── session.ts    # JWT issue/verify
        ├── cors.ts       # CORS middleware
        ├── http.ts       # JSON response helpers
        └── html.ts       # Loopback HTML generator
```

## 🚀 Setup

### 1. Create a Whop App

1. Go to [Whop Dashboard](https://dash.whop.com) → **Apps** → **Create App**
2. Copy your **API Key** (keep this secret!)
3. Copy your **App ID** (starts with `app_`)
4. Add OAuth redirect URI: `https://<your-vercel-domain>/api/oauth/callback`
   - For local dev: `http://localhost:3000/api/oauth/callback`

### 2. Configure Environment Variables

```bash
# Copy the example env file
cp .env.example .env

# Edit .env and fill in your values
```

**Required variables:**

| Variable | Description | Example |
|----------|-------------|---------|
| `WHOP_API_KEY` | Your Whop API key (from dashboard) | `whop_xxx...` |
| `NEXT_PUBLIC_WHOP_APP_ID` | Your Whop App ID | `app_abc123` |
| `OAUTH_REDIRECT_URI` | OAuth callback URL | `https://your-domain.vercel.app/api/oauth/callback` |
| `SESSION_JWT_SECRET` | Random secret for JWT signing | Generate with `openssl rand -hex 32` |
| `CORS_ORIGINS` | Allowed CORS origins (comma-separated) | `http://localhost:3000,http://127.0.0.1:3000` |

### 3. Install Dependencies

```bash
npm install
```

### 4. Local Development

```bash
# Start Vercel dev server (run directly, not via npm)
npx vercel dev

# The server will run on http://localhost:3000
# Open http://localhost:3000/api/oauth/init to test OAuth flow
```

### 5. Deploy to Vercel

**Option A: GitHub Integration (Recommended)**

1. Push this repo to GitHub
2. Go to [Vercel](https://vercel.com) → **Import Project**
3. Select your GitHub repo
4. Add environment variables in Vercel dashboard
5. Deploy!

**Option B: Vercel CLI**

```bash
# Install Vercel CLI globally
npm i -g vercel

# Login and deploy
vercel

# Add production environment variables
vercel env add WHOP_API_KEY
vercel env add NEXT_PUBLIC_WHOP_APP_ID
vercel env add OAUTH_REDIRECT_URI
vercel env add SESSION_JWT_SECRET
vercel env add CORS_ORIGINS

# Deploy to production
vercel --prod
```

## 🎮 Unity Integration

### Flow 1: Standard OAuth (Parse JSON)

```csharp
// 1. Open browser to start OAuth
Application.OpenURL("https://your-backend.vercel.app/api/oauth/init");

// 2. After callback, your backend returns JSON:
// {
//   "session_token": "eyJhbGc...",
//   "user": { "id": "user_123", "name": "John" }
// }

// 3. Store the session_token in Unity
PlayerPrefs.SetString("whop_session", sessionToken);

// 4. Call protected endpoints
using UnityEngine.Networking;

string sessionToken = PlayerPrefs.GetString("whop_session");
UnityWebRequest request = UnityWebRequest.Get("https://your-backend.vercel.app/api/me");
request.SetRequestHeader("Authorization", "Bearer " + sessionToken);
yield return request.SendWebRequest();

if (request.result == UnityWebRequest.Result.Success) {
    var json = JsonUtility.FromJson<UserResponse>(request.downloadHandler.text);
    Debug.Log("User: " + json.name);
}
```

### Flow 2: Loopback Mode (Auto-POST to Unity)

**Unity Side:**

```csharp
using System;
using System.Net;
using System.Text;
using UnityEngine;

public class WhopAuth : MonoBehaviour
{
    private HttpListener listener;
    private int port = 31245; // Random port for local listener

    public void StartAuth()
    {
        // Start local HTTP listener
        listener = new HttpListener();
        listener.Prefixes.Add($"http://127.0.0.1:{port}/");
        listener.Start();
        listener.BeginGetContext(OnIncomingRequest, listener);

        // Open browser with loopback parameters
        string url = $"https://your-backend.vercel.app/api/oauth/init?mode=loopback&port={port}";
        Application.OpenURL(url);
    }

    private void OnIncomingRequest(IAsyncResult result)
    {
        HttpListener listener = (HttpListener)result.AsyncState;
        HttpListenerContext context = listener.EndGetContext(result);

        if (context.Request.Url.AbsolutePath == "/session" && context.Request.HttpMethod == "POST")
        {
            // Read session data posted by browser
            string body = new StreamReader(context.Request.InputStream).ReadToEnd();
            var session = JsonUtility.FromJson<SessionResponse>(body);
            
            // Store token
            PlayerPrefs.SetString("whop_session", session.session_token);
            Debug.Log("Logged in as: " + session.user.name);

            // Send response to browser
            byte[] response = Encoding.UTF8.GetBytes("OK");
            context.Response.StatusCode = 200;
            context.Response.OutputStream.Write(response, 0, response.Length);
            context.Response.Close();

            // Clean up
            listener.Stop();
        }
    }

    [Serializable]
    public class SessionResponse
    {
        public string session_token;
        public User user;
    }

    [Serializable]
    public class User
    {
        public string id;
        public string name;
    }
}
```

**How it works:**
1. Unity starts a local HTTP server on a random port (e.g., 31245)
2. Unity opens browser to `/api/oauth/init`
3. After OAuth, callback page includes `?mode=loopback&port=31245`
4. Backend returns HTML with JavaScript that POSTs session back to `http://127.0.0.1:31245/session`
5. Unity receives session automatically, no manual copy needed!

## 📡 API Reference

### `GET /api/oauth/init`

Initiates OAuth flow. Redirects user to Whop login.

**Query Parameters:** None (but will be forwarded to callback)

**Response:** 302 redirect to Whop

**Example:**
```
GET https://your-backend.vercel.app/api/oauth/init
→ Redirects to Whop OAuth consent screen
```

---

### `GET /api/oauth/callback`

Handles OAuth callback, exchanges code for tokens, issues session JWT.

**Query Parameters:**
- `code` (required) - OAuth authorization code from Whop
- `state` (required) - CSRF state token
- `mode` (optional) - Set to `loopback` for Unity auto-POST
- `port` (optional) - Unity's local listener port (if mode=loopback)

**Response (JSON):**
```json
{
  "session_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_abc123",
    "name": "John Doe"
  }
}
```

**Response (HTML):** If `?mode=loopback&port=31245` is provided, returns HTML page that auto-POSTs to Unity.

---

### `GET /api/me`

Returns user info from session JWT.

**Headers:**
- `Authorization: Bearer <session_token>` (required)

**Response:**
```json
{
  "id": "user_abc123",
  "name": "John Doe"
}
```

**Errors:**
- `401` - Missing or invalid token
- `401` - Expired token

---

### `GET /api/session`

Validates session token and returns expiry info.

**Headers:**
- `Authorization: Bearer <session_token>` (required)

**Response:**
```json
{
  "ok": true,
  "valid": true,
  "user": {
    "id": "user_abc123",
    "name": "John Doe"
  },
  "expires_in": 7198
}
```

`expires_in` is seconds remaining until token expires.

---

### `GET /api/health`

Health check endpoint for monitoring.

**Response:**
```json
{
  "ok": true,
  "status": "healthy",
  "timestamp": "2025-10-02T10:30:00.000Z"
}
```

## 🔒 Security

### What's Protected

- ✅ **WHOP_API_KEY** never leaves the server
- ✅ **Whop access tokens** never sent to Unity (used server-side only)
- ✅ **CSRF protection** via state cookie
- ✅ **HttpOnly cookies** for state storage
- ✅ **Short-lived sessions** (2h expiry)
- ✅ **Secure cookies** in production (HTTPS)

### Security Best Practices

1. **Keep secrets secret**: Never commit `.env` to Git
2. **Use HTTPS in production**: Set `NODE_ENV=production` on Vercel
3. **Rotate SESSION_JWT_SECRET**: Change it if compromised
4. **Limit CORS origins**: Only allow your domains in production
5. **Monitor logs**: Check Vercel logs for suspicious activity

### Session Token Claims

```json
{
  "uid": "user_abc123",
  "name": "John Doe",
  "iat": 1696251234,
  "exp": 1696258434,
  "iss": "whop-unity-oauth"
}
```

## 🛠️ Development

### Type Checking

```bash
npm run typecheck
```

### Building

```bash
npm run build
```

### Testing Locally

```bash
# Start dev server
npx vercel dev

# In another terminal, test endpoints
curl http://localhost:3000/api/health
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/me
```

## 🐛 Troubleshooting

### "Missing state cookie (CSRF check failed)"

**Cause:** Browser blocked third-party cookies or cookies expired (10min limit).

**Fix:** Make sure you complete OAuth within 10 minutes of starting. For local dev, ensure `secure: false` in cookies.

---

### "Failed to obtain access token"

**Cause:** Invalid `WHOP_API_KEY`, wrong redirect URI, or code already used.

**Fix:**
1. Verify `WHOP_API_KEY` in `.env` matches Whop dashboard
2. Ensure `OAUTH_REDIRECT_URI` matches exactly in Whop dashboard (trailing slash matters!)
3. OAuth codes are single-use - start flow again

---

### CORS errors from Unity

**Cause:** Origin not allowed in CORS policy.

**Fix:**
1. Add Unity's origin to `CORS_ORIGINS` env var
2. For localhost, pattern `http://localhost:*` is automatically allowed
3. Check browser console for actual origin being sent

---

### "Invalid or expired session token"

**Cause:** Token expired (2h limit) or invalid JWT secret.

**Fix:**
1. Sessions expire after 2 hours - get a new one via `/api/oauth/init`
2. If you changed `SESSION_JWT_SECRET`, all old tokens are invalid
3. Unity should handle 401 errors and re-authenticate

---

### Vercel deployment fails

**Cause:** Missing environment variables or build errors.

**Fix:**
1. Ensure all env vars are set in Vercel dashboard
2. Check Vercel build logs for TypeScript errors
3. Test build locally with `npm run build`

## 📝 TODO / Future Enhancements

- [ ] Add refresh token support for longer sessions
- [ ] Store user sessions in database (Redis/Postgres)
- [ ] Add webhook handler for Whop events (payment, subscription)
- [ ] Rate limiting for API endpoints
- [ ] Add `/api/purchases` to check user's owned products
- [ ] Unity SDK package for easier integration

## 📄 License

ISC

## 🤝 Contributing

Contributions welcome! Please open an issue or PR.

---

**Built with ❤️ for Unity game developers using Whop.**

