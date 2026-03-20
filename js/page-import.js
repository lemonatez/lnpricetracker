// ═══════════════════════════════════════════════════════
//  PAGE: DATA IMPORT
// ═══════════════════════════════════════════════════════
const PageImport = (() => {

  let _onDataLoaded = null;

  function onDataLoaded(fn) { _onDataLoaded = fn; }

  function init() {
    Fetcher.onProgress(({ page, total, collected, pct }) => {
      const fill = document.getElementById('fetch-fill');
      const lbl  = document.getElementById('fetch-label');
      const cnt  = document.getElementById('fetch-count');
      if (fill) fill.style.width = (pct * 100).toFixed(1) + '%';
      if (lbl)  lbl.textContent  = `Fetching page ${page}…`;
      if (cnt)  cnt.textContent  = total ? `${collected.toLocaleString()} / ${total.toLocaleString()}` : `${collected.toLocaleString()} books`;
    });

    Fetcher.onError(err => {
      showError('fetch-error', err.message +
        (err.message.toLowerCase().includes('fetch') || err.message.toLowerCase().includes('cors')
          ? ' — CORS blocked. Use "Paste JSON" method instead.'
          : ''));
      resetFetch();
    });
  }

  async function startFetch() {
    const size     = parseInt(document.getElementById('cfg-size')?.value || '100');
    const maxPages = parseInt(document.getElementById('cfg-maxpages')?.value || '60');
    const delay    = parseInt(document.getElementById('cfg-delay')?.value || '300');

    hideError('fetch-error');
    document.getElementById('fetch-btn').disabled = true;
    document.getElementById('stop-btn').style.display = '';
    document.getElementById('fetch-progress').style.display = '';
    document.getElementById('fetch-fill').style.width = '0%';

    const books = await Fetcher.fetchAll({ size, maxPages, delay });
    if (books.length) {
      const count = Store.load(books);
      showSuccess(`Loaded ${count.toLocaleString()} books successfully!`);
      _onDataLoaded?.();
    }
    resetFetch();
  }

  function stopFetch() {
    Fetcher.stop();
    resetFetch();
  }

  function resetFetch() {
    document.getElementById('fetch-btn').disabled = false;
    document.getElementById('stop-btn').style.display = 'none';
  }

  function importJSON() {
    hideError('import-error');
    const raw = document.getElementById('json-input')?.value.trim();
    if (!raw) return showError('import-error', 'Paste JSON first');
    try {
      const books = Fetcher.parseJSON(raw);
      const count = Store.load(books);
      showSuccess(`Imported ${count.toLocaleString()} books!`);
      document.getElementById('json-input').value = '';
      _onDataLoaded?.();
    } catch (e) {
      showError('import-error', e.message);
    }
  }

  function importTSV() {
    hideError('tsv-error');
    const raw = document.getElementById('tsv-input')?.value.trim();
    if (!raw) return showError('tsv-error', 'Paste TSV data first');
    try {
      const books = Fetcher.parseTSV(raw);
      const count = Store.load(books);
      showSuccess(`Imported ${count.toLocaleString()} books from TSV!`);
      document.getElementById('tsv-input').value = '';
      _onDataLoaded?.();
    } catch (e) {
      showError('tsv-error', e.message);
    }
  }

  async function fetchRakuten() {
    hideError('rakuten-error');
    const appId = document.getElementById('rakuten-app-id')?.value.trim();
    const keyword = document.getElementById('rakuten-keyword')?.value.trim() || '電撃文庫';
    const publisher = document.getElementById('rakuten-publisher')?.value.trim() || 'KADOKAWA';
    const releaseMonth = document.getElementById('rakuten-release-month')?.value.trim() || '';
    const maxResults = parseInt(document.getElementById('rakuten-max-results')?.value || '100');

    if (!appId) return showError('rakuten-error', 'Rakuten Application ID is required');

    try {
      document.getElementById('rakuten-btn').disabled = true;
      document.getElementById('rakuten-loading').style.display = '';
      
      const books = await Fetcher.fetchRakuten({
        applicationId: appId,
        keyword,
        publisher,
        releaseMonth,
        maxResults,
      });
      
      if (books.length) {
        const count = Store.load(books);
        showSuccess(`Fetched ${count.toLocaleString()} books from Rakuten!`);
        _onDataLoaded?.();
      }
    } catch (e) {
      showError('rakuten-error', e.message);
    } finally {
      document.getElementById('rakuten-btn').disabled = false;
      document.getElementById('rakuten-loading').style.display = 'none';
    }
  }

  function clearAll() {
    if (!confirm('Clear all loaded data?')) return;
    Store.clear();
    updateDataStatus();
    showSuccess('Data cleared.');
    _onDataLoaded?.();
  }

  function showError(id, msg) {
    const el = document.getElementById(id);
    if (el) { el.style.display = ''; el.textContent = '⚠ ' + msg; }
  }
  function hideError(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  }
  function showSuccess(msg) {
    const el = document.getElementById('success-msg');
    if (el) { el.style.display = ''; el.textContent = '✓ ' + msg; setTimeout(() => { el.style.display = 'none'; }, 4000); }
  }

  return { init, startFetch, stopFetch, importJSON, importTSV, fetchRakuten, clearAll, onDataLoaded };
})();
