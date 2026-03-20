// ═══════════════════════════════════════════════════════
//  PAGE: YEARLY DRILL-DOWN
// ═══════════════════════════════════════════════════════
const PageYearly = (() => {

  let selectedYear = null;
  let booksData = [];

  function render(books) {
    if (!books.length) return;
    booksData = books;

    // Get year range
    const years = books.map(b => b.year).filter(Boolean);
    const minY = Math.min(...years);
    const maxY = Math.max(...years);

    // Set default to latest year
    if (!selectedYear || selectedYear < minY || selectedYear > maxY) {
      selectedYear = maxY;
    }

    renderYearSelector(books, minY, maxY);
    renderYearChart(books);
    renderMonthTable(books);
    renderBookList(books);
    
    // Update selected year label
    const labelEl = document.getElementById('selected-year-label');
    if (labelEl) labelEl.textContent = selectedYear;
  }

  function renderYearSelector(books, minY, maxY) {
    const byYear = Store.byYear();
    const years = Store.sortedYears(byYear);

    const container = document.getElementById('year-selector');
    if (!container) return;

    container.innerHTML = years.map(y => {
      const count = byYear[y].length;
      const avg = Math.round(Stat.avg(byYear[y].map(b => b.price)));
      const isActive = y === selectedYear ? 'active' : '';
      return `
        <button class="year-btn ${isActive}" onclick="PageYearly.selectYear(${y})">
          <div class="year-label">${y}</div>
          <div class="year-stats">
            <span class="year-count">${count} books</span>
            <span class="year-avg">¥${avg.toLocaleString()}</span>
          </div>
        </button>
      `;
    }).join('');
  }

  function renderYearChart(books) {
    const byYear = Store.byYear();
    const years = Store.sortedYears(byYear);

    const bookCounts = years.map(y => byYear[y].length);
    const avgPrices = years.map(y => Math.round(Stat.avg(byYear[y].map(b => b.price))));

    // Create gradient colors based on avg price
    const bgColors = avgPrices.map(avg => {
      if (avg >= 900) return hexToRgba(Theme.coral, 0.7);
      if (avg >= 850) return hexToRgba(Theme.gold, 0.7);
      if (avg >= 800) return hexToRgba(Theme.teal, 0.7);
      return hexToRgba(Theme.indigo, 0.7);
    });

    const borderColors = avgPrices.map(avg => {
      if (avg >= 900) return Theme.coral;
      if (avg >= 850) return Theme.gold;
      if (avg >= 800) return Theme.teal;
      return Theme.indigo;
    });

    mkChart('chart-yearly', {
      type: 'bar',
      data: {
        labels: years,
        datasets: [
          {
            label: 'Book Count',
            data: bookCounts,
            backgroundColor: bgColors,
            borderColor: borderColors,
            borderWidth: 2,
            borderRadius: 6,
            yAxisID: 'y',
          },
          {
            label: 'Avg Price (¥)',
            data: avgPrices,
            type: 'line',
            borderColor: Theme.gold,
            backgroundColor: Theme.gold,
            borderWidth: 3,
            pointRadius: 5,
            pointHoverRadius: 7,
            pointBackgroundColor: Theme.gold,
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            tension: 0.4,
            yAxisID: 'y1',
          },
        ],
      },
      options: mergeOpts(Theme.baseOpts, {
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: Theme.text2,
              boxWidth: 12,
              font: { family: "'JetBrains Mono'", size: 11 },
              generateLabels: (chart) => {
                const datasets = chart.data.datasets;
                return datasets.map((ds, i) => ({
                  text: ds.label,
                  fillStyle: ds.borderColor || ds.backgroundColor,
                  hidden: !chart.isDatasetVisible(i),
                  datasetIndex: i,
                }));
              },
            },
          },
          tooltip: {
            backgroundColor: '#111422',
            borderColor: '#1e2238',
            borderWidth: 1,
            titleColor: '#f0c040',
            bodyColor: '#dde0f0',
            padding: 12,
            titleFont: { family: "'JetBrains Mono'", size: 11 },
            bodyFont: { family: "'JetBrains Mono'", size: 11 },
            callbacks: {
              label: (ctx) => {
                if (ctx.datasetIndex === 0) {
                  return `  Books: ${ctx.parsed.y}`;
                }
                return `  Avg Price: ¥${ctx.parsed.y.toLocaleString()}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { color: '#13152a' },
            ticks: {
              color: '#4a5075',
              font: { family: "'JetBrains Mono'", size: 10 },
              maxTicksLimit: 20,
            },
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            grid: { color: '#13152a' },
            ticks: {
              callback: (v) => v,
              color: '#4a5075',
              font: { family: "'JetBrains Mono'", size: 10 },
            },
            title: {
              display: true,
              text: 'Book Count',
              color: Theme.muted,
              font: { family: "'JetBrains Mono'", size: 10 },
            },
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            grid: {
              drawOnChartArea: false,
            },
            ticks: {
              callback: (v) => '¥' + v.toLocaleString(),
              color: Theme.gold,
              font: { family: "'JetBrains Mono'", size: 10 },
            },
            title: {
              display: true,
              text: 'Avg Price (¥)',
              color: Theme.gold,
              font: { family: "'JetBrains Mono'", size: 10 },
            },
            min: 400,
          },
        },
        onClick: (e, elements) => {
          if (elements.length > 0) {
            const index = elements[0].index;
            const year = years[index];
            selectYear(year);
          }
        },
      }),
    });
  }

  function renderMonthTable(books) {
    const byYear = Store.byYear();
    const yearBooks = byYear[selectedYear] || [];

    // Group by month
    const byMonth = yearBooks.reduce((acc, b) => {
      if (!b.month) return acc;
      const m = b.month.toString().padStart(2, '0');
      (acc[m] = acc[m] || []).push(b);
      return acc;
    }, {});

    const months = Object.keys(byMonth).sort();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const container = document.getElementById('month-table');
    if (!container) return;

    if (!months.length) {
      container.innerHTML = '<div class="empty-state">No monthly data available</div>';
      return;
    }

    const rows = months.map(m => {
      const monthBooks = byMonth[m];
      const count = monthBooks.length;
      const avg = Math.round(Stat.avg(monthBooks.map(b => b.price)));
      const min = Math.min(...monthBooks.map(b => b.price));
      const max = Math.max(...monthBooks.map(b => b.price));
      const median = Math.round(Stat.median(monthBooks.map(b => b.price)));

      // Color based on avg price
      let colorClass = 'month-indigo';
      if (avg >= 900) colorClass = 'month-coral';
      else if (avg >= 850) colorClass = 'month-gold';
      else if (avg >= 800) colorClass = 'month-teal';

      return `
        <tr class="month-row ${colorClass}" onclick="PageYearly.selectMonth('${m}')" style="cursor:pointer">
          <td class="month-name">${monthNames[parseInt(m) - 1]}</td>
          <td class="month-count">${count}</td>
          <td class="month-avg">¥${avg.toLocaleString()}</td>
          <td class="month-median">¥${median.toLocaleString()}</td>
          <td class="month-range">¥${min}–¥${max}</td>
          <td class="month-bar">
            <div class="bar-container">
              <div class="bar-fill" style="width:${Math.min(100, (count / Math.max(...Object.values(byMonth).map(arr => arr.length))) * 100)}%"></div>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    const totalBooks = yearBooks.length;
    const totalAvg = Math.round(Stat.avg(yearBooks.map(b => b.price)));

    container.innerHTML = `
      <table class="month-data-table">
        <thead>
          <tr>
            <th>Month</th>
            <th>Books</th>
            <th>Avg Price</th>
            <th>Median</th>
            <th>Range</th>
            <th>Volume</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
        <tfoot>
          <tr class="year-total">
            <td><strong>${selectedYear} Total</strong></td>
            <td><strong>${totalBooks}</strong></td>
            <td><strong>¥${totalAvg.toLocaleString()}</strong></td>
            <td><strong>¥${Math.round(Stat.median(yearBooks.map(b => b.price))).toLocaleString()}</strong></td>
            <td><strong>¥${Math.min(...yearBooks.map(b => b.price))}–¥${Math.max(...yearBooks.map(b => b.price))}</strong></td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    `;
  }

  function renderBookList(books) {
    const byYear = Store.byYear();
    const yearBooks = byYear[selectedYear] || [];

    // Sort by release date
    const sorted = [...yearBooks].sort((a, b) => {
      if (a.ym && b.ym) return a.ym.localeCompare(b.ym);
      if (a.ym) return -1;
      if (b.ym) return 1;
      return 0;
    });

    const container = document.getElementById('book-list');
    if (!container) return;

    if (!sorted.length) {
      container.innerHTML = '<div class="empty-state">No books available for this year</div>';
      return;
    }

    const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const items = sorted.map(b => {
      const monthLabel = b.month ? monthNames[b.month] : 'Unknown';
      const sequelTag = b.sequel ? '<span class="pill pill-red">Sequel</span>' : '<span class="pill pill-gold">New</span>';
      const volumeInfo = b.volume > 1 ? `<span class="vol-tag">Vol. ${b.volume}</span>` : '';

      return `
        <div class="book-card" onclick="PageYearly.showBookDetail('${b.itemCode}')">
          <div class="book-cover">
            <img src="${b.bookCoverUrl || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2260%22 height=%2280%22%3E%3Crect fill=%22%231e2238%22 width=%2260%22 height=%2280%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 fill=%22%234a5075%22 font-size=%2210%22>No Image</text%3E%3C/svg%3E'}" 
                 alt="${escapeHtml(b.title)}" 
                 onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2260%22 height=%2280%22%3E%3Crect fill=%22%231e2238%22 width=%2260%22 height=%2280%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 fill=%22%234a5075%22 font-size=%2210%22>No Image</text%3E%3C/svg%3E'">
          </div>
          <div class="book-info">
            <div class="book-meta">
              <span class="book-month">${monthLabel} ${b.year || ''}</span>
              ${sequelTag}
              ${volumeInfo}
            </div>
            <div class="book-title">${escapeHtml(b.title)}</div>
            <div class="book-price">
              <span class="price-base">¥${b.price.toLocaleString()}</span>
              <span class="price-tax">(¥${b.priceTax.toLocaleString()} w/tax)</span>
            </div>
            <div class="book-author">${escapeHtml(b.author)}</div>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `<div class="book-grid">${items}</div>`;
  }

  function selectYear(year) {
    selectedYear = year;
    const books = booksData;
    renderYearSelector(books, Math.min(...books.map(b => b.year)), Math.max(...books.map(b => b.year)));
    renderMonthTable(books);
    renderBookList(books);
    
    // Update selected year label
    const labelEl = document.getElementById('selected-year-label');
    if (labelEl) labelEl.textContent = year;
  }

  function selectMonth(month) {
    // Could implement further drill-down to show books in specific month
    console.log('Selected month:', month);
  }

  function showBookDetail(itemCode) {
    const book = booksData.find(b => b.itemCode === itemCode);
    if (!book) return;

    const modal = document.getElementById('book-modal');
    if (!modal) return;

    const sequelTag = book.sequel ? '<span class="pill pill-red">Sequel</span>' : '<span class="pill pill-gold">New Series</span>';

    document.getElementById('modal-title').innerHTML = `
      ${escapeHtml(book.title)}
      ${sequelTag}
      ${book.volume > 1 ? `<span class="pill pill-indigo">Vol. ${book.volume}</span>` : ''}
    `;
    document.getElementById('modal-cover').src = book.bookCoverUrl || '';
    document.getElementById('modal-cover').onerror = function() {
      this.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22160%22%3E%3Crect fill=%22%231e2238%22 width=%22120%22 height=%22160%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 fill=%22%234a5075%22 font-size=%2212%22>No Image</text%3E%3C/svg%3E';
    };
    document.getElementById('modal-author').innerHTML = book.disp_author_name || escapeHtml(book.person);
    document.getElementById('modal-price').textContent = `¥${book.price.toLocaleString()} (¥${book.priceTax.toLocaleString()} w/tax)`;
    document.getElementById('modal-release').textContent = book.releaseDate || book.release_date || 'Unknown';
    document.getElementById('modal-catchphrase').textContent = book.catchphrase || 'No description available';
    document.getElementById('modal-series').textContent = book.series || '—';
    document.getElementById('modal-isbn').textContent = book.isbn || '—';
    document.getElementById('modal-subgenre').textContent = book.subgenre_name || '—';

    modal.style.display = 'flex';
  }

  function closeModal() {
    const modal = document.getElementById('book-modal');
    if (modal) modal.style.display = 'none';
  }

  // Helper functions
  function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str.replace(/<[^>]*>/g, '');
    return div.innerHTML;
  }

  function el(id) { return document.getElementById(id); }

  return {
    render,
    selectYear,
    selectMonth,
    showBookDetail,
    closeModal,
  };
})();
