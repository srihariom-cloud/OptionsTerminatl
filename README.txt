# Trade-with-Us App — Netlify Deploy Guide

## Why Netlify?
Browsers block direct calls to `api.anthropic.com` from local HTML files (CORS policy).
This app uses a tiny Netlify serverless function as a secure proxy — your API key
lives in Netlify's environment variables, never in the HTML.

---

## Deploy in 3 Steps (~5 minutes, free forever)

### Step 1 — Create a free Netlify account
Go to https://netlify.com and sign up (free tier is plenty).

### Step 2 — Deploy via Drag & Drop
1. Go to https://app.netlify.com
2. Scroll to the bottom of the page — you'll see a drag-and-drop zone:
   **"Want to deploy a new site without connecting to Git? Drag and drop your site output folder here"**
3. Unzip this file and **drag the entire folder** (`trade_netlify/`) into that box
4. Netlify will deploy instantly and give you a URL like `https://amazing-name-123.netlify.app`

### Step 3 — Add your Anthropic API Key (optional but recommended)
This lets the app work without entering your key each time:
1. In Netlify dashboard → your site → **Site configuration → Environment variables**
2. Click **Add a variable**
3. Key: `ANTHROPIC_API_KEY`  Value: `sk-ant-api03-...` (your key)
4. Click Save, then **Deploys → Trigger deploy → Deploy site** to pick it up

**Alternatively:** Skip Step 3 entirely — just paste your key in the app's ⚙ Settings panel each session. It saves to your browser's localStorage automatically.

---

## Your app URL
After deploy: `https://your-site-name.netlify.app`

Bookmark it — works on any device, any browser, no installation needed.
