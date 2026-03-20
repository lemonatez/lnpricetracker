# 🚀 Deployment Guide - 電撃文庫 Price Intelligence

## Quick Deploy to GitHub Pages (5 minutes)

### Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `kadokawa-price` (or your choice)
3. Visibility: **Public** (required for free GitHub Pages)
4. Click **Create repository**

### Step 2: Upload Files

**Option A: Using Git (Recommended)**

```bash
cd c:\Users\Administrator\Downloads\files

# Initialize git repository
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: Kadokawa Price Intelligence"

# Create main branch
git branch -M main

# Add remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/kadokawa-price.git

# Push to GitHub
git push -u origin main
```

**Option B: Drag & Drop**

1. In your GitHub repository page
2. Click **uploading an existing file**
3. Drag all files from `c:\Users\Administrator\Downloads\files\`
4. Click **Commit changes**

### Step 3: Enable GitHub Pages

1. Go to your repository → **Settings** → **Pages**
2. Under **Source**, select:
   - Deploy from a branch
   - Branch: `main` / root
3. Click **Save**
4. Wait 1-2 minutes for deployment
5. Your site will be live at: `https://YOUR_USERNAME.github.io/kadokawa-price/`

### Step 4: Register with Rakuten API

1. Go to https://api.rakuten.net/
2. Sign up / Log in
3. Click **Create Application**
4. Fill in:
   - **Application name**: `Kadokawa Price Tracker`
   - **Application URL**: `https://YOUR_USERNAME.github.io/kadokawa-price/`
   - **Application type**: `Web Service`
   - **Allowed websites**:
     ```
     YOUR_USERNAME.github.io
     ```
5. Accept terms and create
6. Copy your **Application ID** and **Access Key**

### Step 5: Configure the App

1. Open your deployed site: `https://YOUR_USERNAME.github.io/kadokawa-price/`
2. Go to **Import Data** page
3. Scroll to **Rakuten Books API** section
4. Enter your **Application ID** and **Access Key**
5. Click **💾 Save Credentials**
6. Your credentials are stored in browser localStorage (never on GitHub)

### Step 6: Import Data

**Option 1: Rakuten API**
- Enter release month (e.g., `2026-04` for April)
- Click **🔍 Fetch from Rakuten**

**Option 2: TSV Import**
- Copy your spreadsheet data
- Paste into **Paste TSV / Tabular Data** box
- Click **📥 Import TSV**

---

## Update Deployment

After making changes locally:

```bash
cd c:\Users\Administrator\Downloads\files

# Check changes
git status

# Add and commit
git add .
git commit -m "Your commit message"

# Push to GitHub
git push
```

GitHub Pages will auto-deploy in ~30 seconds.

---

## Custom Domain (Optional)

1. Buy a domain (e.g., from Namecheap, GoDaddy)
2. In GitHub repo → Settings → Pages → Custom domain
3. Enter your domain
4. Update DNS records at your domain registrar:
   ```
   Type: CNAME
   Name: www
   Value: YOUR_USERNAME.github.io
   ```
5. Update Rakuten allowed websites:
   ```
   yourdomain.com
   www.yourdomain.com
   ```

---

## Troubleshooting

### Site not loading
- Wait 2-3 minutes after deployment
- Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- Check GitHub Actions tab for build errors

### Rakuten API error
- Verify Application ID and Access Key are correct
- Check allowed websites includes your GitHub Pages domain
- Wait a few minutes after updating allowed websites

### Charts not showing
- Check browser console for errors
- Ensure Chart.js CDN is accessible
- Clear browser cache

---

## Local Development

For local testing without deploying:

1. Install a local server:
   ```bash
   # Using Python (if installed)
   cd c:\Users\Administrator\Downloads\files
   python -m http.server 8000
   
   # Or using Node.js (if installed)
   npx serve .
   ```

2. Open `http://localhost:8000` in browser

**Note:** Rakuten API won't work on localhost due to domain restrictions. Use GitHub Pages for testing API integration.

---

## File Structure

```
├── index.html              # Main application
├── css/
│   └── main.css            # Styles (updated with modern UI)
├── js/
│   ├── data.js             # Data store
│   ├── fetcher.js          # API fetchers (Rakuten + TSV)
│   ├── page-import.js      # Import logic
│   ├── page-overview.js    # Dashboard
│   ├── page-trend.js       # Price trends
│   ├── page-monthly.js     # Monthly growth (NEW)
│   ├── page-newvsequel.js  # New vs Sequel analysis
│   ├── page-taxdist.js     # Tax & distribution
│   └── page-yearly.js      # Yearly drill-down
├── .nojekyll               # Disable Jekyll processing
└── README.md               # Documentation
```

---

## Support

- GitHub Issues: https://github.com/YOUR_USERNAME/kadokawa-price/issues
- Rakuten API Docs: https://api.rakuten.net/doc/
