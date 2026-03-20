// ═══════════════════════════════════════════════════════
//  DATA STORE — single source of truth
// ═══════════════════════════════════════════════════════
const Store = (() => {
  let _raw = [];
  let _books = [];
  const _listeners = [];

  function notify() { _listeners.forEach(fn => fn(_books)); }

  // ── Sequel detection ──────────────────────────────────
  // Looks for （２）, ２, vol.2, 第二巻 etc. in title
  function detectSequel(title) {
    if (!title) return false;
    const t = title;
    // Fullwidth digits in brackets
    if (/[（(][２-９][０-９]*[）)]/.test(t)) return true;
    // Halfwidth (2)-(99)
    if (/[(\[][2-9]\d*[\])]/.test(t)) return true;
    // Number at end after space
    if (/[\s　][２-９2-9]\s*$/.test(t)) return true;
    // Volume suffix patterns
    if (/[Ｖvv][Ｏoо][Ｌlｌ][\s　]*[２-９2-9]/.test(t)) return true;
    // Kanji ordinals
    if (/第[二三四五六七八九十百千]+[巻話章]/.test(t)) return true;
    // Series numbers like ６ in middle of title (very loose — only if >= 2)
    const m = t.match(/[（(]\s*(\d{1,2})\s*[）)]/);
    if (m && parseInt(m[1]) >= 2) return true;
    return false;
  }

  // ── Volume number extraction ──────────────────────────
  function extractVolume(title) {
    if (!title) return 1;
    let m;
    m = title.match(/[（(]\s*(\d{1,2})\s*[）)]/);
    if (m) return parseInt(m[1]);
    m = title.match(/[（(]([２-９][０-９]*)[）)]/);
    if (m) return parseInt(m[1].replace(/[０-９]/g, d => String.fromCharCode(d.charCodeAt(0) - 0xFEE0)));
    return 1;
  }

  // ── Date parsing ─────────────────────────────────────
  function parseDate(str) {
    if (!str) return null;
    const m = str.match(/(\d{4})[^\d](\d{2})[^\d](\d{2})/);
    if (!m) return null;
    return { year: +m[1], month: +m[2], day: +m[3], ym: `${m[1]}-${m[2]}` };
  }

  // ── Series name extraction ────────────────────────────
  function extractSeries(title) {
    if (!title) return title;
    // Remove volume suffix
    return title
      .replace(/[\s　][（(]\s*\d+\s*[）)]\s*$/, '')
      .replace(/[\s　][２-９][０-９]?\s*$/, '')
      .trim();
  }

  // ── Author normalisation ──────────────────────────────
  function extractAuthor(person, disp) {
    if (!person) return '—';
    // person field is space-separated: author illustrator
    return person.split(/[\s　]+/)[0] || person;
  }

  // ── Price tier ────────────────────────────────────────
  function priceTier(p) {
    if (p <= 600) return '≤¥600';
    if (p <= 700) return '¥601–700';
    if (p <= 799) return '¥701–799';
    if (p <= 839) return '¥800–839';
    if (p <= 879) return '¥840–879';
    if (p <= 919) return '¥880–919';
    if (p <= 959) return '¥920–959';
    return '¥960+';
  }

  const TIER_ORDER = ['≤¥600','¥601–700','¥701–799','¥800–839','¥840–879','¥880–919','¥920–959','¥960+'];

  // ── Transform raw record ──────────────────────────────
  function transform(raw) {
    const price = parseInt(raw.price) || 0;
    const priceTax = parseInt(raw.price_tax_in) || 0;
    const date = parseDate(raw.release_date);
    const sequel = detectSequel(raw.title);
    return {
      ...raw,
      price,
      priceTax,
      taxRate: price > 0 ? +((priceTax / price - 1) * 100).toFixed(1) : 0,
      date,
      year:  date?.year  || null,
      month: date?.month || null,
      ym:    date?.ym    || null,
      sequel,
      volume: extractVolume(raw.title),
      series: extractSeries(raw.title),
      author: extractAuthor(raw.person, raw.disp_author_name),
      tier: priceTier(price),
    };
  }

  return {
    TIER_ORDER,

    load(rawArray) {
      // Merge & dedupe by itemCode
      const map = new Map(_raw.map(b => [b.itemCode, b]));
      rawArray.forEach(b => map.set(b.itemCode, b));
      _raw = [...map.values()];
      _books = _raw
        .map(transform)
        .filter(b => b.price > 0 && b.year >= 1993 && b.year <= 2030);
      notify();
      return _books.length;
    },

    clear() { _raw = []; _books = []; notify(); },

    get books() { return _books; },
    get raw()   { return _raw; },
    get count() { return _books.length; },

    subscribe(fn) { _listeners.push(fn); },

    // ── Aggregation helpers ───────────────────────────────
    byYear(filter) {
      const src = filter ? _books.filter(filter) : _books;
      return src.reduce((acc, b) => {
        if (!b.year) return acc;
        (acc[b.year] = acc[b.year] || []).push(b);
        return acc;
      }, {});
    },

    byYM(filter) {
      const src = filter ? _books.filter(filter) : _books;
      return src.reduce((acc, b) => {
        if (!b.ym) return acc;
        (acc[b.ym] = acc[b.ym] || []).push(b);
        return acc;
      }, {});
    },

    byYMWithStats(filter) {
      const src = filter ? _books.filter(filter) : _books;
      const byMonth = src.reduce((acc, b) => {
        if (!b.ym) return acc;
        (acc[b.ym] = acc[b.ym] || []).push(b);
        return acc;
      }, {});

      const result = {};
      for (const [ym, books] of Object.entries(byMonth)) {
        const prices = books.map(b => b.price).sort((a, b) => a - b);
        const sortedByDay = [...books].sort((a, b) => {
          const dayA = a.date?.day || 10;
          const dayB = b.date?.day || 10;
          return dayA - dayB;
        });
        const startPrice = sortedByDay[0]?.price || 0;

        result[ym] = {
          books,
          avg: Stat.avg(prices),
          median: Stat.median(prices),
          min: prices[0] || 0,
          max: prices[prices.length - 1] || 0,
          start: startPrice,
          count: books.length,
        };
      }
      return result;
    },

    bySeries() {
      return _books.reduce((acc, b) => {
        const key = b.series;
        if (!acc[key]) acc[key] = [];
        acc[key].push(b);
        return acc;
      }, {});
    },

    sortedYears(obj) {
      return Object.keys(obj).map(Number).sort((a, b) => a - b);
    },

    sortedYMs(obj) {
      return Object.keys(obj).sort();
    },
  };
})();

// ═══════════════════════════════════════════════════════
//  STAT HELPERS
// ═══════════════════════════════════════════════════════
const Stat = {
  avg(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; },
  median(arr) {
    if (!arr.length) return 0;
    const s = [...arr].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  },
  pct(n, total) { return total ? (n / total * 100) : 0; },
  stddev(arr) {
    if (arr.length < 2) return 0;
    const m = Stat.avg(arr);
    return Math.sqrt(arr.reduce((s, x) => s + (x - m) ** 2, 0) / arr.length);
  },
  quantile(arr, q) {
    const s = [...arr].sort((a, b) => a - b);
    const i = (s.length - 1) * q;
    const lo = Math.floor(i), hi = Math.ceil(i);
    return s[lo] + (s[hi] - s[lo]) * (i - lo);
  },
  linearRegression(xs, ys) {
    const n = xs.length;
    if (n < 2) return { slope: 0, intercept: ys[0] || 0, r2: 0 };
    const mx = Stat.avg(xs), my = Stat.avg(ys);
    const num = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0);
    const den = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
    const slope = den ? num / den : 0;
    const intercept = my - slope * mx;
    const predicted = xs.map(x => slope * x + intercept);
    const ssTot = ys.reduce((s, y) => s + (y - my) ** 2, 0);
    const ssRes = ys.reduce((s, y, i) => s + (y - predicted[i]) ** 2, 0);
    const r2 = ssTot ? 1 - ssRes / ssTot : 0;
    return { slope, intercept, r2 };
  },
};

// ═══════════════════════════════════════════════════════
//  CHART THEME
// ═══════════════════════════════════════════════════════
const Theme = {
  gold:   '#f0c040',
  indigo: '#6c63ff',
  coral:  '#ff6b6b',
  teal:   '#2dd4bf',
  lime:   '#a3e635',
  orange: '#f0a060',
  pink:   '#f472b6',
  sky:    '#38bdf8',
  muted:  '#4a5075',
  text2:  '#8890b8',
  border: '#1e2238',

  palette: ['#f0c040','#6c63ff','#ff6b6b','#2dd4bf','#a3e635','#f0a060','#f472b6','#38bdf8'],

  baseOpts: {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 500 },
    plugins: {
      legend: { labels: { color: '#8890b8', boxWidth: 11, font: { family: "'JetBrains Mono'", size: 10 } } },
      tooltip: {
        backgroundColor: '#111422',
        borderColor: '#1e2238',
        borderWidth: 1,
        titleColor: '#f0c040',
        bodyColor: '#dde0f0',
        padding: 10,
        titleFont: { family: "'JetBrains Mono'", size: 11 },
        bodyFont: { family: "'JetBrains Mono'", size: 11 },
      }
    },
    scales: {
      x: {
        grid: { color: '#13152a' },
        ticks: { color: '#4a5075', font: { family: "'JetBrains Mono'", size: 10 }, maxTicksLimit: 14 }
      },
      y: {
        grid: { color: '#13152a' },
        ticks: { color: '#4a5075', font: { family: "'JetBrains Mono'", size: 10 } }
      }
    }
  },

  yenAxis(min) {
    return {
      ticks: { callback: v => '¥' + v.toLocaleString(), color: '#4a5075', font: { family: "'JetBrains Mono'", size: 10 } },
      min,
    };
  },

  pctAxis() {
    return { ticks: { callback: v => v + '%', color: '#4a5075', font: { family: "'JetBrains Mono'", size: 10 } } };
  },
};

Chart.defaults.color = Theme.text2;
Chart.defaults.font.family = "'JetBrains Mono'";

const _charts = {};
function mkChart(id, config) {
  if (_charts[id]) _charts[id].destroy();
  const el = document.getElementById(id);
  if (!el) return;
  const ctx = el.getContext('2d');
  _charts[id] = new Chart(ctx, config);
  return _charts[id];
}

function mergeOpts(...objs) {
  return objs.reduce((acc, o) => deepMerge(acc, o), {});
}
function deepMerge(a, b) {
  const r = { ...a };
  for (const k of Object.keys(b)) {
    r[k] = (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]))
      ? deepMerge(a[k] || {}, b[k])
      : b[k];
  }
  return r;
}

// ═══════════════════════════════════════════════════════
//  FORMAT HELPERS
// ═══════════════════════════════════════════════════════
const Fmt = {
  yen: n => '¥' + Math.round(n).toLocaleString(),
  pct: n => n.toFixed(1) + '%',
  num: n => Math.round(n).toLocaleString(),
  delta: (n, suffix='') => (n >= 0 ? '+' : '') + Math.round(n).toLocaleString() + suffix,
  round1: n => n.toFixed(1),
};
