// ═══════════════════════════════════════════════════════
//  FETCHER — handles live API calls + JSON import
// ═══════════════════════════════════════════════════════

const Fetcher = (() => {
  let _active = false;
  let _onProgress = null;
  let _onError = null;

  const BASE_URL = 'https://www.kadokawa.co.jp/product/search/';
  const FORM_BASE = 'itemIdKbn=&item_type=&kw=&auth=&mgenre=86&brand=&isbn=&sy=&sm=&sd=&ey=&em=&ed=&lgenre=&sgenre=&tSeries=&mSeries=&bSeries=&productForm=&releaseDate=0&label=330&prid=&preview_hash=&sort=&trialReading=&production_year=&type_id=';

  // Rakuten Books API
  const RAKUTEN_API = 'https://app.rakuten.co.jp/services/api/BooksBookSearch/BookSearch/20170404';

  function buildForm(page, size) {
    return `pageno=${page}&pageno_book=${page}&pageno_media=1&size=${size}&${FORM_BASE}`;
  }

  async function fetchPage(page, size) {
    const resp = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: buildForm(page, size),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status} on page ${page}`);
    return resp.json();
  }

  function extractBooks(data) {
    return data?.result?.book || data?.result?.all || [];
  }
  function extractTotal(data) {
    return data?.count_raw?.book || data?.count_raw?.all || 0;
  }

  return {
    get active() { return _active; },

    onProgress(fn) { _onProgress = fn; },
    onError(fn)    { _onError = fn; },

    stop() { _active = false; },

    async fetchAll({ size = 100, maxPages = 60, delay = 300 } = {}) {
      _active = true;
      let page = 1;
      let total = null;
      let collected = 0;
      const all = [];

      try {
        while (_active && page <= maxPages) {
          const data = await fetchPage(page, size);
          const books = extractBooks(data);
          if (!books.length) break;
          if (total === null) total = extractTotal(data);

          all.push(...books);
          collected = all.length;

          _onProgress?.({ page, total, collected, pct: total ? collected / total : page / maxPages });

          if (total && collected >= total) break;
          page++;
          await new Promise(r => setTimeout(r, delay));
        }
      } catch (e) {
        _onError?.(e);
        _active = false;
        return [];
      }

      _active = false;
      return all;
    },

    parseJSON(raw) {
      const parsed = JSON.parse(raw);
      const books = [];

      const extract = obj => {
        if (!obj) return;
        if (Array.isArray(obj)) {
          obj.forEach(item => {
            if (item?.result) extract(item);
            else if (item?.itemCode) books.push(item);
            else if (Array.isArray(item)) item.forEach(b => { if (b?.itemCode) books.push(b); });
          });
        } else if (obj?.result) {
          const r = obj.result;
          (r.book || r.all || []).forEach(b => books.push(b));
        } else if (obj?.book || obj?.all) {
          (obj.book || obj.all || []).forEach(b => books.push(b));
        } else if (obj?.itemCode) {
          books.push(obj);
        }
      };

      extract(parsed);
      if (!books.length) throw new Error('No book records found — expected itemCode fields');
      return books;
    },

    parseTSV(raw) {
      const lines = raw.trim().split(/\r?\n/);
      if (lines.length < 2) throw new Error('TSV must have header row + at least one data row');

      const header = lines[0].split(/\t/).map(h => h.trim());
      const books = [];

      const idx = {
        label: header.indexOf('レーベル'),
        releaseMonth: header.indexOf('発売月'),
        releaseDay: header.indexOf('発売日'),
        title: header.indexOf('タイトル'),
        author: header.indexOf('著者'),
        illustrator: header.indexOf('イラスト'),
        price: header.indexOf('定価'),
        isbn: header.indexOf('ISBN'),
      };

      if (idx.label === -1 || idx.title === -1 || idx.price === -1) {
        throw new Error('TSV missing required columns: レーベル，タイトル，定価');
      }

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        const cols = line.split(/\t/);

        const label = cols[idx.label]?.trim();
        if (label !== '1') continue;

        const releaseMonthStr = cols[idx.releaseMonth] || '';
        const monthMatch = releaseMonthStr.match(/(\d{4})[^\d](\d{1,2})[^\d]/);
        const year = monthMatch ? parseInt(monthMatch[1]) : null;
        const month = monthMatch ? parseInt(monthMatch[2]) : null;
        const day = cols[idx.releaseDay]?.trim() || '10';

        const title = cols[idx.title]?.trim() || '';
        const author = cols[idx.author]?.trim() || '';
        const illustrator = cols[idx.illustrator]?.trim() || '';
        const priceTaxIn = cols[idx.price]?.trim() || '0';
        const isbn = cols[idx.isbn]?.trim() || '';

        // 定価 is tax-included, so calculate base price (reverse 10% tax)
        const priceTaxInNum = parseInt(priceTaxIn) || 0;
        const basePrice = Math.round(priceTaxInNum / 1.1);

        books.push({
          itemCode: isbn || `${title}-${year}-${month}`,
          title,
          person: author + (illustrator ? ' ' + illustrator : ''),
          disp_author_name: author,
          illustrator_name: illustrator,
          price: basePrice,
          price_tax_in: priceTaxInNum,
          release_date: year && month ? `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` : null,
          label_code: '330',
          label_name: '電撃文庫',
        });
      }

      if (!books.length) throw new Error('No valid records found (ensure レーベル=1 rows exist)');
      return books;
    },

    async fetchRakuten({ applicationId, keyword = '電撃文庫', publisher = 'KADOKAWA', releaseMonth = '', maxResults = 100 } = {}) {
      if (!applicationId) throw new Error('Rakuten Application ID is required');

      const params = new URLSearchParams({
        format: 'json',
        applicationId,
        keyword,
        publisher,
        hits: String(maxResults),
        page: '1',
        sort: '+releaseDate',
      });

      // Add release year/month filter if specified
      if (releaseMonth) {
        const match = releaseMonth.match(/(\d{4})-(\d{2})/);
        if (match) {
          params.set('releaseDate', `${match[1]}${match[2]}`);
        }
      }

      const url = `${RAKUTEN_API}?${params.toString()}`;
      console.log('Rakuten API URL:', url);

      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
      const data = await resp.json();

      const books = (data.Books || []).map(book => {
        const item = book.Book;
        const releaseDate = item.releaseDate || '';
        const yearMonth = releaseDate.match(/(\d{4})-(\d{2})/) || [];

        return {
          itemCode: item.isbn || `${item.title}-${releaseDate}`,
          title: item.title,
          person: item.author + (item.carrier ? ' ' + item.carrier : ''),
          disp_author_name: item.author || '',
          illustrator_name: item.carrier || '',
          price: Math.round((item.listPrice || 0) / 1.1),
          price_tax_in: item.listPrice || 0,
          release_date: releaseDate || null,
          year: yearMonth[1] ? parseInt(yearMonth[1]) : null,
          month: yearMonth[2] ? parseInt(yearMonth[2]) : null,
          label_code: '330',
          label_name: '電撃文庫',
          isbn: item.isbn || '',
        };
      });

      return books;
    },
  };
})();
