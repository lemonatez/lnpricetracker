# 電撃文庫 Price Intelligence

Price tracking and analysis tool for 電撃文庫 (Dengeki Bunko) light novels.

## Features

- **Price Trends**: Track price changes over years
- **Monthly Growth**: See price movements within each month (start/high/low)
- **New vs Sequel**: Compare first volume vs sequel pricing
- **Tax Analysis**: Understand tax impact on pricing
- **Multiple Import Sources**:
  - TSV/Tabular data from spreadsheets
  - Rakuten Books API
  - Kadokawa API (via JSON import)

## Quick Start

### 1. Deploy to GitHub Pages

```bash
# Create a new GitHub repository, then:
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

Then enable GitHub Pages:
- Go to Settings → Pages
- Source: Deploy from `main` branch
- Your site will be at: `https://YOUR_USERNAME.github.io/YOUR_REPO/`

### 2. Register with Rakuten API

1. Go to https://api.rakuten.net/
2. Sign up for free
3. Create a new application
4. Set **Application URL**: `https://YOUR_USERNAME.github.io/YOUR_REPO/`
5. Set **Allowed websites**:
   ```
   YOUR_USERNAME.github.io
   ```
6. Copy your **Application ID**

### 3. Import Data

Open your deployed site and:
- **TSV Import**: Paste spreadsheet data (レーベル，発売月，発売日，タイトル，著者，イラスト，定価，ISBN)
- **Rakuten API**: Enter your Application ID and fetch latest releases

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
└── README.md
```

## Data Format (TSV)

| Column | Description |
|--------|-------------|
| レーベル | Label code (1 = 電撃文庫) |
| 発売月 | Release month (e.g., 2026 年 3 月刊) |
| 発売日 | Release day (e.g., 10) |
| タイトル | Title |
| 著者 | Author |
| イラスト | Illustrator |
| 定価 | Price (tax-included) |
| ISBN | ISBN |

## Technology

- Chart.js 4.4.1 for visualizations
- Vanilla JavaScript (no framework)
- No build step required

## License

MIT
