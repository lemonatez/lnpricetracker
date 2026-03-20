// ═══════════════════════════════════════════════════════
//  PAGE: TAX & DISTRIBUTION
// ═══════════════════════════════════════════════════════
const PageTaxDist = (() => {

  function render(books) {
    if (!books.length) return;
    renderTaxRateHistory(books);
    renderBaseVsTaxLine(books);
    renderDistViolin(books);
    renderPercentiles(books);
    renderOutliers(books);
    renderTaxTable(books);
  }

  // Tax rate changes over time (8% → 10%)
  function renderTaxRateHistory(books) {
    const byYM  = Store.byYM();
    const yms   = Store.sortedYMs(byYM);

    const avgRate = ym => {
      const rates = byYM[ym].map(b => b.taxRate).filter(r => r > 0);
      return rates.length ? +Stat.avg(rates).toFixed(2) : null;
    };

    mkChart('chart-taxrate', {
      type: 'line',
      data: {
        labels: yms,
        datasets: [
          {
            label: 'Avg effective tax rate (%)',
            data: yms.map(avgRate),
            borderColor: Theme.gold,
            backgroundColor: Theme.gold + '18',
            borderWidth: 2, pointRadius: 1, tension: 0.3, spanGaps: true, fill: true,
          },
          // Reference lines at 3%, 5%, 8%, 10%
          ...[3, 5, 8, 10].map((rate, i) => ({
            label: `${rate}% rate`,
            data: yms.map(() => rate),
            borderColor: [Theme.teal, Theme.sky, Theme.orange, Theme.coral][i],
            borderWidth: 1, borderDash: [4, 4], pointRadius: 0, fill: false,
          })),
        ],
      },
      options: mergeOpts(Theme.baseOpts, {
        scales: {
          y: { ticks: { callback: v => v + '%', color: Theme.text2, font: { family: "'JetBrains Mono'", size: 10 } }, min: 0, max: 12 },
          x: { ticks: { maxTicksLimit: 18 } },
        },
        plugins: { legend: { labels: { filter: i => !i.text.includes('%') || i.text.length < 10 } } },
      }),
    });
  }

  // Base price vs tax-included price by year
  function renderBaseVsTaxLine(books) {
    const byYear = Store.byYear();
    const years  = Store.sortedYears(byYear);

    mkChart('chart-base-vs-tax', {
      type: 'line',
      data: {
        labels: years,
        datasets: [
          {
            label: 'Base price (excl. tax)',
            data: years.map(y => Math.round(Stat.avg(byYear[y].map(b => b.price)))),
            borderColor: Theme.teal, borderWidth: 2.5, pointRadius: 3, tension: 0.35, fill: false,
          },
          {
            label: 'Incl. tax (consumer pays)',
            data: years.map(y => Math.round(Stat.avg(byYear[y].map(b => b.priceTax)))),
            borderColor: Theme.coral, borderWidth: 2.5, pointRadius: 3, tension: 0.35, fill: false,
          },
          {
            label: 'Tax burden (difference)',
            data: years.map(y => Math.round(Stat.avg(byYear[y].map(b => b.priceTax - b.price)))),
            borderColor: Theme.gold, borderWidth: 1.5, borderDash: [4, 3], pointRadius: 2, tension: 0.35,
            yAxisID: 'y2',
          },
        ],
      },
      options: mergeOpts(Theme.baseOpts, {
        scales: {
          y:  { ...Theme.yenAxis(400), position: 'left' },
          y2: { position: 'right', grid: { drawOnChartArea: false }, ticks: { callback: v => '+¥' + v, color: Theme.text2, font: { family: "'JetBrains Mono'", size: 10 } } },
          x:  { ticks: { maxTicksLimit: 16 } },
        },
      }),
    });
  }

  // Price distribution by decade (density-like grouped bars)
  function renderDistViolin(books) {
    const decades = ['1990s', '2000s', '2010s', '2020s'];
    const decRange = { '1990s': [1993,1999], '2000s': [2000,2009], '2010s': [2010,2019], '2020s': [2020,2030] };
    const colors = [Theme.sky, Theme.indigo, Theme.gold, Theme.coral];

    // Price buckets every 20¥
    const allPrices = books.map(b => b.price);
    const minP = Math.floor(Math.min(...allPrices) / 20) * 20;
    const maxP = Math.ceil(Math.max(...allPrices) / 20) * 20;
    const buckets = [];
    for (let p = minP; p <= maxP; p += 20) buckets.push(p);

    mkChart('chart-violin', {
      type: 'bar',
      data: {
        labels: buckets.map(p => '¥' + p),
        datasets: decades.map((d, i) => {
          const [lo, hi] = decRange[d];
          const ys = books.filter(b => b.year >= lo && b.year <= hi);
          return {
            label: d,
            data: buckets.map(p => {
              const cnt = ys.filter(b => b.price >= p && b.price < p + 20).length;
              return ys.length ? +Stat.pct(cnt, ys.length).toFixed(1) : 0;
            }),
            backgroundColor: colors[i] + 'aa',
            borderRadius: 2,
          };
        }),
      },
      options: mergeOpts(Theme.baseOpts, {
        scales: {
          x: { ticks: { maxTicksLimit: 20 } },
          y: { ...Theme.pctAxis() },
        },
      }),
    });
  }

  // Percentile chart (P10, P25, P50, P75, P90) by year
  function renderPercentiles(books) {
    const byYear = Store.byYear();
    const years  = Store.sortedYears(byYear).filter(y => byYear[y].length >= 5);
    const pcts   = [0.1, 0.25, 0.5, 0.75, 0.9];
    const labels_p = ['P10', 'P25', 'Median', 'P75', 'P90'];
    const colors = [Theme.sky, Theme.teal, Theme.gold, Theme.orange, Theme.coral];

    mkChart('chart-percentiles', {
      type: 'line',
      data: {
        labels: years,
        datasets: pcts.map((p, i) => ({
          label: labels_p[i],
          data: years.map(y => Math.round(Stat.quantile(byYear[y].map(b => b.price), p))),
          borderColor: colors[i],
          borderWidth: i === 2 ? 2.5 : 1.5,
          pointRadius: i === 2 ? 3 : 1.5,
          tension: 0.35,
          fill: i === 2,
          backgroundColor: i === 2 ? Theme.gold + '10' : undefined,
        })),
      },
      options: mergeOpts(Theme.baseOpts, {
        scales: { y: Theme.yenAxis(300), x: { ticks: { maxTicksLimit: 16 } } },
      }),
    });
  }

  // Outlier / most expensive books
  function renderOutliers(books) {
    const sorted = [...books].sort((a, b) => b.price - a.price);
    const top = sorted.slice(0, 15);
    const bottom = sorted.slice(-10).reverse();

    const toRow = b => `
      <tr>
        <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${b.title}">${b.title}</td>
        <td class="num">${b.year || '?'}</td>
        <td class="num">${Fmt.yen(b.price)}</td>
        <td class="num">${Fmt.yen(b.priceTax)}</td>
        <td><span class="pill ${b.sequel ? 'pill-red' : 'pill-teal'}">${b.sequel ? 'Sequel' : 'New'}</span></td>
      </tr>
    `;

    const topBody = document.getElementById('top-price-tbody');
    if (topBody) topBody.innerHTML = top.map(toRow).join('');
    const botBody = document.getElementById('bot-price-tbody');
    if (botBody) botBody.innerHTML = bottom.map(toRow).join('');
  }

  // Tax era breakdown table
  function renderTaxTable(books) {
    const eras = [
      { name: 'Pre-tax (–1989)', lo: 0,    hi: 1989, rate: '0%' },
      { name: 'Tax 3% (1989–96)', lo: 1989, hi: 1996, rate: '3%' },
      { name: 'Tax 5% (1997–2013)', lo: 1997, hi: 2013, rate: '5%' },
      { name: 'Tax 8% (2014–2019)', lo: 2014, hi: 2018, rate: '8%' },
      { name: 'Tax 10% (2019–)',    lo: 2019, hi: 2100, rate: '10%' },
    ];

    const tbody = document.getElementById('tax-era-tbody');
    if (!tbody) return;
    tbody.innerHTML = eras.map(era => {
      const ys = books.filter(b => b.year >= era.lo && b.year <= era.hi);
      if (!ys.length) return '';
      const prices = ys.map(b => b.price);
      return `
        <tr>
          <td>${era.name}</td>
          <td class="num">${era.rate}</td>
          <td class="num">${ys.length.toLocaleString()}</td>
          <td class="num">${Fmt.yen(Stat.avg(prices))}</td>
          <td class="num">${Fmt.yen(Stat.median(prices))}</td>
          <td class="num">${Fmt.yen(Math.min(...prices))}</td>
          <td class="num">${Fmt.yen(Math.max(...prices))}</td>
          <td class="num">${Fmt.yen(Stat.stddev(prices))}</td>
        </tr>
      `;
    }).join('');
  }

  return { render };
})();
