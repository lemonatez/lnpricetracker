const Fetcher = (() => {
  let _active = false;
  let _onProgress = null;
  let _onError = null;

  const BASE_URL = 'https://www.kadokawa.co.jp/product/search/';
  const FORM_BASE =
    'itemIdKbn=&item_type=&kw=&auth=&mgenre=86&brand=&isbn=&sy=&sm=&sd=&ey=&em=&ed=&lgenre=&sgenre=&tSeries=&mSeries=&bSeries=&productForm=&releaseDate=0&label=330&prid=&preview_hash=&sort=&trialReading=&production_year=&type_id=';

  const RAKUTEN_API =
    'https://openapi.rakuten.co.jp/services/api/BooksBook/Search/20170404';

  // ─────────────────────────────────────────────
  // COMMON
  // ─────────────────────────────────────────────
  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  function safeJSON(text, page) {
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`Invalid JSON (Kadokawa page ${page})`);
    }
  }

  // ─────────────────────────────────────────────
  // KADOKAWA FETCH
  // ─────────────────────────────────────────────
  function buildForm(page, size) {
    return `pageno=${page}&pageno_book=${page}&size=${size}&${FORM_BASE}`;
  }

  async function fetchPage(page, size) {
    const resp = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: buildForm(page, size),
    });

    if (!resp.ok) throw new Error(`Kadokawa HTTP ${resp.status}`);

    const text = await resp.text();
    return safeJSON(text, page);
  }

  function extractBooks(data) {
    const b = data?.result?.book || data?.result?.all;
    return Array.isArray(b) ? b : [];
  }

  function extractTotal(data) {
    return data?.count_raw?.book || data?.count_raw?.all || 0;
  }

  async function fetchKadokawa({ size = 100, maxPages = 60, delay = 300 } = {}) {
    _active = true;

    let page = 1;
    let total = null;
    let lastCount = 0;

    const all = [];

    try {
      while (_active && page <= maxPages) {
        const data = await fetchPage(page, size);
        const books = extractBooks(data);

        if (!books.length) break;

        if (total === null) total = extractTotal(data);

        all.push(...books);

        if (all.length === lastCount) {
          console.warn('Kadokawa loop detected, stopping');
          break;
        }

        lastCount = all.length;

        _onProgress?.({
          page,
          total,
          collected: all.length,
        });

        if (total && all.length >= total) break;

        page++;
        await sleep(delay);
      }
    } catch (e) {
      _onError?.(e);
      return [];
    }

    _active = false;
    return all;
  }

  // ─────────────────────────────────────────────
  // JSON PARSER
  // ─────────────────────────────────────────────
  function parseJSON(raw) {
    const parsed = JSON.parse(raw);
    const books = [];

    const extract = obj => {
      if (!obj) return;

      if (Array.isArray(obj)) {
        obj.forEach(extract);
      } else if (obj?.result) {
        extract(obj.result.book || obj.result.all);
      } else if (obj?.book || obj?.all) {
        extract(obj.book || obj.all);
      } else if (obj?.itemCode) {
        books.push(obj);
      }
    };

    extract(parsed);

    if (!books.length) {
      throw new Error('No book records found in JSON');
    }

    return books;
  }

  // ─────────────────────────────────────────────
  // TSV PARSER (WITH NEXT MONTH)
  // ─────────────────────────────────────────────
  function parseTSV(raw) {
    const lines = raw.trim().split(/\r?\n/);

    if (lines.length < 2) {
      throw new Error('TSV must have header + data');
    }

    // ✅ fix BOM + trim
    const header = lines[0]
      .replace(/^\uFEFF/, '')
      .split('\t')
      .map(h => h.trim());

    const idx = {
      label: header.findIndex(h => h.includes('レーベル')),
      releaseMonth: header.findIndex(h => h.includes('発売月')),
      releaseDay: header.findIndex(h => h.includes('発売日')),
      title: header.findIndex(h => h.includes('タイトル')),
      author: header.findIndex(h => h.includes('著者')),
      illustrator: header.findIndex(h => h.includes('イラスト')),
      price: header.findIndex(h => h.includes('定価')),
      isbn: header.findIndex(h => h.includes('ISBN')),
    };

    // ✅ debug safety
    if (idx.title === -1) {
      console.error('TSV header:', header);
      throw new Error('TSV header parsing failed (タイトル not found)');
    }

    const books = [];

    let latestYear = 0;
    let latestMonth = 0;

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split('\t').map(c => c.trim());
      if (!cols.length || !cols[idx.title]) continue;

      // ✅ safer label check
      const label = cols[idx.label];
      if (idx.label !== -1 && label && label !== '1') continue;

      const releaseMonthStr = cols[idx.releaseMonth] || '';

      const m = releaseMonthStr.match(/(\d{4})\D*(\d{1,2})/);

      const year = m ? parseInt(m[1]) : null;
      const month = m ? parseInt(m[2]) : null;
      const day = cols[idx.releaseDay] || '10';

      // track latest month
      if (year && month) {
        if (
          year > latestYear ||
          (year === latestYear && month > latestMonth)
        ) {
          latestYear = year;
          latestMonth = month;
        }
      }

      const priceTaxIn = parseInt(cols[idx.price]) || 0;

      books.push({
        itemCode: cols[idx.isbn] || `${cols[idx.title]}-${i}`,
        title: cols[idx.title] || '',
        disp_author_name: cols[idx.author] || '',
        illustrator_name: cols[idx.illustrator] || '',
        price: Math.floor(priceTaxIn / 1.1),
        price_tax_in: priceTaxIn,
        release_date:
          year && month
            ? `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            : null,
        year,
        month,
        isbn: cols[idx.isbn] || '',
      });
    }

    if (!books.length) {
      console.error('Parsed 0 books. First rows:', lines.slice(0, 5));
      throw new Error('No valid TSV records');
    }

    // next month logic (same as before)
    let nextYear = latestYear;
    let nextMonth = latestMonth + 1;

    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear++;
    }

    return {
      books,
      latest: { year: latestYear, month: latestMonth },
      next: { year: nextYear, month: nextMonth },
    };
  }

  // ─────────────────────────────────────────────
  // RAKUTEN FETCH
  // ─────────────────────────────────────────────
  async function fetchRakuten({
    applicationId,
    accessKey,
    booksGenreId = '001017005004',
    maxResults = 30,
    sort = '-releaseDate',
    releaseMonth, // Optional: filter by YYYY-MM
  }) {
    if (!applicationId || !accessKey) {
      throw new Error('Rakuten requires applicationId + accessKey');
    }

    const params = new URLSearchParams({
      applicationId,
      accessKey,
      booksGenreId,
      page: '1',
      sort,
    });

    const url = `${RAKUTEN_API}?${params.toString()}`;
    const host_origin = "https://lemonatez.github.io/lnpricetracker/";

    const resp = await fetch(url, {
      headers: {
        "accessKey": accessKey,
        "Origin": "https://lemonatez.github.io/lnpricetracker/",
        "Referer": "https://lemonatez.github.io/lnpricetracker/",
      },
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(
        `Rakuten ${resp.status}: ${err?.errors?.errorMessage || resp.statusText}`
      );
    }

    const data = await resp.json();
    const items = data.items || [];

    console.log(`Rakuten API returned ${items.length} items (requested ${maxResults})`);

    let books = items.map((Item) => {
      const salesDate = Item.salesDate || '';
      const m = salesDate.match(/(\d{4}) 年 (\d{1,2}) 月 (\d{1,2}) 日/);
      const isbn = Item.isbn || '';
      const year = m ? parseInt(m[1]) : null;
      const month = m ? parseInt(m[2]) : null;
      const day = m ? parseInt(m[3]) : 10;

      return {
        itemCode: isbn || `rakuten-${Item.title}`,
        title: Item.title || '',
        disp_author_name: Item.author || '',
        isbn,
        year,
        month,
        release_date: year && month ? `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` : null,
        price_tax_in: Item.itemPrice || 0,
        price: Math.floor((Item.itemPrice || 0) / 1.1),
        imageUrl: Item.mediumImageUrl || '',
        itemUrl: Item.itemUrl || '',
      };
    });

    // Filter by release month if specified
    if (releaseMonth) {
      const [targetYear, targetMonth] = releaseMonth.split('-').map(Number);
      books = books.filter(b => b.year === targetYear && b.month === targetMonth);
      console.log(`Filtered to ${books.length} books for ${releaseMonth}`);
    }

    return books;
  }

  // ─────────────────────────────────────────────
  // AUTO PIPELINE
  // ─────────────────────────────────────────────
  async function fetchNextFromTSV(tsvRaw, config) {
    const parsed = parseTSV(tsvRaw);

    const rakuten = await fetchRakuten(config);

    const next = parsed.next;

    const upcoming = rakuten.filter(
      b => b.year === next.year && b.month === next.month
    );

    return {
      kadokawa: null, // optional if you call it
      json: null,
      tsv: parsed.books,
      upcoming,
      nextMonth: next,
    };
  }

  return {
    fetchKadokawa,
    parseJSON,
    parseTSV,
    fetchRakuten,
    fetchNextFromTSV,

    onProgress: fn => (_onProgress = fn),
    onError: fn => (_onError = fn),
    stop: () => (_active = false),
  };
})();