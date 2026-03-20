# 電撃文庫 Price Intelligence

Price tracking and analysis tool for 電撃文庫 (Dengeki Bunko) light novels.

## 🔒 Security Note

**Rakuten API credentials are NEVER stored in the code or GitHub.**

- Application ID and Access Key are stored in your **browser's localStorage only**
- Credentials are sent **only to Rakuten API** (https://app.rakuten.co.jp/)
- Nothing is committed to GitHub or sent to any third-party server

## Features

- **Price Trends**: Track price changes over years
- **Monthly Growth**: See price movements within each month (start/high/low)
- **New vs Sequel**: Compare first volume vs sequel pricing
- **Tax Analysis**: Understand tax impact on pricing
- **Multiple Import Sources**:
  - TSV/Tabular data from spreadsheets
  - Rakuten Books API (requires credentials)
  - Kadokawa API (via JSON import)

## Quick Start

### 1. Deploy to GitHub Pages

```bash
# In your files directory:
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

Then enable GitHub Pages:
- Go to your repo → Settings → Pages
- Source: Deploy from `main` branch
- Your site: `https://YOUR_USERNAME.github.io/YOUR_REPO/`

### 2. Register with Rakuten API

1. Go to https://api.rakuten.net/
2. Sign up for free
3. Create a new application:
   - **Application name**: `Kadokawa Price Tracker` (or any name)
   - **Application URL**: `https://YOUR_USERNAME.github.io/YOUR_REPO/`
   - **Application type**: `Web`
   - **Allowed websites**:
     ```
     YOUR_USERNAME.github.io
     ```
4. Copy your **Application ID** and **Access Key**

### 3. Import Data

Open your deployed GitHub Pages site:

1. Go to **Import Data** page
2. Scroll to **Rakuten Books API** section
3. Enter your **Application ID** and **Access Key**
4. Click **💾 Save Credentials** (stored in browser only)
5. Configure search:
   - **Keyword**: 電撃文庫
   - **Publisher**: KADOKAWA
   - **Genre ID**: 001004008 (light novels)
   - **Release Month**: 2026-04 (for April releases)
6. Click **🔍 Fetch from Rakuten**

## Data Format (TSV Import)

| Column | Description | Example |
|--------|-------------|---------|
| レーベル | Label code (1 = 電撃文庫) | 1 |
| 発売月 | Release month | 2026 年 3 月刊 |
| 発売日 | Release day | 10 |
| タイトル | Title | 焼き祓え！ネット巫女つむぎちゃん |
| 著者 | Author | 鎌池和馬 |
| イラスト | Illustrator | ぶーた |
| 定価 | Price (tax-included) | 814 |
| ISBN | ISBN | 978-4-04-916717-7 |

## File Structure

```
├── index.html          # Main application
├── css/
│   └── main.css        # Styles
├── js/
│   ├── data.js         # Data store & transformations
│   ├── fetcher.js      # API fetchers (Rakuten, TSV parser)
│   ├── page-import.js  # Import page logic
│   ├── page-overview.js# Dashboard
│   ├── page-trend.js   # Price trends
│   ├── page-monthly.js # Monthly price growth
│   ├── page-newvsequel.js
│   ├── page-taxdist.js
│   └── page-yearly.js
├── .nojekyll           # Disable Jekyll processing
└── README.md
```

## Technology

- Chart.js 4.4.1 for visualizations
- Vanilla JavaScript (no framework)
- No build step required
- Static hosting (GitHub Pages, Netlify, Vercel, etc.)

## API Reference

### Rakuten Books Book Search API
- **Docs**: https://api.rakuten.net/doc/booksbooksearch.html

## License

MIT
