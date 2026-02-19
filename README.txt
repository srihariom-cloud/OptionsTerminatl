# Trade-with-Us — Deploy to Netlify

## IMPORTANT: Two separate issues explained

### Issue 1 — "Buy a domain" prompt
This is just Netlify asking if you want a custom domain.
✅ Simply DISMISS/SKIP it — your app already has a FREE URL like:
   https://random-name-12345.netlify.app
   You do NOT need to buy anything.

### Issue 2 — App running locally instead of on Netlify
Drag-and-drop does NOT support serverless functions (the Claude API proxy).
Use the GitHub method below for full functionality.

---

## Best Deploy Method: GitHub + Netlify (5 min, free)

### Step 1 — Put files on GitHub
1. Go to https://github.com/new
2. Create repo (name it anything, set Public) → click Create
3. Click "uploading an existing file"
4. Unzip this ZIP and upload ALL files keeping the folder structure:
     index.html              (at root)
     netlify.toml            (at root)
     netlify/functions/claude.js   (in subfolder)
5. Click "Commit changes"

### Step 2 — Connect Netlify to GitHub
1. Go to https://app.netlify.com
2. Click "Add new site" → "Import an existing project"
3. Click "Deploy with GitHub" → authorize → select your repo
4. Build settings: leave EVERYTHING blank
5. Click "Deploy site"
6. In ~30 seconds you get: https://amazing-fox-123.netlify.app ✅

### Step 3 — Add your Anthropic API Key
1. Netlify dashboard → your site → "Site configuration" (left sidebar)
2. "Environment variables" (left sidebar) → "Add a variable"
3. Key: ANTHROPIC_API_KEY   Value: sk-ant-api03-...
4. Save → Deploys tab → "Trigger deploy" → "Deploy site"

Your app is now live at your .netlify.app URL — works on any browser/device!
