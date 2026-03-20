// ═══════════════════════════════════════════════════════
//  PAGE: NEW vs SEQUEL
// ═══════════════════════════════════════════════════════
const PageNewVsSequel = (() => {

  function render(books) {
    if (!books.length) return;

    renderGapOverTime(books);
    renderVolumeCurve(books);
    renderBoxPlots(books);
    renderSeriesTable(books);
    renderFirstVsLatest(books);
  }

  // Gap (sequel avg - new avg) per year
  function renderGapOverTime(books) {
    const byYear = Store.byYear();
    const years  = Store.sortedYears(byYear).filter(y =>
      byYear[y].some(b => !b.sequel) && byYear[y].some(b => b.sequel)
    );

    const newAvg = y => Stat.avg(byYear[y].filter(b => !b.sequel).map(b => b.price));
    const seqAvg = y => Stat.avg(byYear[y].filter(b => b.sequel).map(b => b.price));
    const gaps   = years.map(y => +(seqAvg(y) - newAvg(y)).toFixed(1));

    // cumulative gap trend
    const reg = Stat.linearRegression(years, gaps);

    mkChart('chart-gap-time', {
      type: 'bar',
      data: {
        labels: years,
        datasets: [
          {
            label: 'Sequel − New (¥)',
            data: gaps,
            backgroundColor: gaps.map(g => g > 0 ? Theme.coral + 'bb' : Theme.teal + 'bb'),
            borderRadius: 3,
            yAxisID: 'y',
          },
          {
            label: 'Trend',
            data: years.map(y => +(reg.slope * y + reg.intercept).toFixed(1)),
            type: 'line',
            borderColor: Theme.indigo,
            borderWidth: 2,
            pointRadius: 0,
            borderDash: [5, 4],
            fill: false,
            yAxisID: 'y',
          },
          {
            label: 'New avg',
            data: years.map(y => Math.round(newAvg(y))),
            type: 'line',
            borderColor: Theme.teal,
            borderWidth: 1.5,
            pointRadius: 2,
            fill: false,
            yAxisID: 'y2',
          },
          {
            label: 'Sequel avg',
            data: years.map(y => Math.round(seqAvg(y))),
            type: 'line',
            borderColor: Theme.coral,
            borderWidth: 1.5,
            pointRadius: 2,
            fill: false,
            yAxisID: 'y2',
          },
        ],
      },
      options: mergeOpts(Theme.baseOpts, {
        scales: {
          y:  { ticks: { callback: v => (v >= 0 ? '+' : '') + '¥' + v, color: Theme.text2, font: { family: "'JetBrains Mono'", size: 10 } }, position: 'left' },
          y2: { ...Theme.yenAxis(400), position: 'right', grid: { drawOnChartArea: false } },
          x:  { ticks: { maxTicksLimit: 16 } },
        },
      }),
    });
  }

  // Average price curve by volume number (1 through 10+)
  function renderVolumeCurve(books) {
    const maxVol = 10;
    const buckets = Array.from({ length: maxVol }, (_, i) => ({ vol: i + 1, prices: [], taxPrices: [] }));
    const overflow = { vol: '11+', prices: [], taxPrices: [] };

    books.forEach(b => {
      const v = b.volume;
      if (v <= maxVol) {
        buckets[v - 1].prices.push(b.price);
        buckets[v - 1].taxPrices.push(b.priceTax);
      } else {
        overflow.prices.push(b.price);
        overflow.taxPrices.push(b.priceTax);
      }
    });

    const all = [...buckets, overflow].filter(bk => bk.prices.length >= 2);
    const labels = all.map(bk => `Vol. ${bk.vol}`);

    mkChart('chart-vol-curve', {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Avg base price',
            data: all.map(bk => Math.round(Stat.avg(bk.prices))),
            borderColor: Theme.gold, borderWidth: 2.5, pointRadius: 4,
            backgroundColor: Theme.gold + '20', tension: 0.3, fill: true,
          },
          {
            label: 'Avg incl. tax',
            data: all.map(bk => Math.round(Stat.avg(bk.taxPrices))),
            borderColor: Theme.coral, borderWidth: 1.5, pointRadius: 3,
            borderDash: [4, 3], tension: 0.3,
          },
          {
            label: '± 1 Stddev (low)',
            data: all.map(bk => Math.round(Stat.avg(bk.prices) - Stat.stddev(bk.prices))),
            borderColor: 'transparent',
            backgroundColor: Theme.gold + '18',
            pointRadius: 0, tension: 0.3, fill: '+1',
          },
          {
            label: '± 1 Stddev (high)',
            data: all.map(bk => Math.round(Stat.avg(bk.prices) + Stat.stddev(bk.prices))),
            borderColor: 'transparent',
            backgroundColor: Theme.gold + '18',
            pointRadius: 0, tension: 0.3,
          },
        ],
      },
      options: mergeOpts(Theme.baseOpts, {
        scales: { y: Theme.yenAxis(400) },
        plugins: { legend: { labels: { filter: i => !i.text.includes('Stddev') } } },
      }),
    });
  }

  // Quarterly distributions: new vs sequel (simulated box with Q1/Q3/median bars)
  function renderBoxPlots(books) {
    // We'll use a grouped bar approximating a box: Q1, Median, Q3, Mean
    const segments = [
      { label: 'New Series', filter: b => !b.sequel, color: Theme.teal },
      { label: 'Sequels',    filter: b => b.sequel,  color: Theme.coral },
    ];

    // By decade
    const decades = ['1990s', '2000s', '2010s', '2020s'];
    const decadeFilter = {
      '1990s': b => b.year >= 1993 && b.year <= 1999,
      '2000s': b => b.year >= 2000 && b.year <= 2009,
      '2010s': b => b.year >= 2010 && b.year <= 2019,
      '2020s': b => b.year >= 2020,
    };

    // For each decade, compute median of new vs sequel
    const labels = decades;
    mkChart('chart-box', {
      type: 'bar',
      data: {
        labels,
        datasets: segments.map((seg, si) => ({
          label: seg.label,
          data: decades.map(d => {
            const dec = books.filter(decadeFilter[d]).filter(seg.filter);
            return dec.length ? Math.round(Stat.median(dec.map(b => b.price))) : null;
          }),
          backgroundColor: seg.color + 'bb',
          borderRadius: 4,
          borderSkipped: false,
        })),
      },
      options: mergeOpts(Theme.baseOpts, {
        scales: { y: Theme.yenAxis(0) },
        plugins: { legend: {} },
      }),
    });
  }

  // Series table — multi-volume series showing price evolution
  function renderSeriesTable(books) {
    const bySeries = Store.bySeries();
    const series = Object.entries(bySeries)
      .filter(([_, bs]) => bs.length >= 2)
      .map(([name, bs]) => {
        const sorted = [...bs].sort((a, b) => a.volume - b.volume || (a.date?.year || 0) - (b.date?.year || 0));
        const first  = sorted[0];
        const last   = sorted[sorted.length - 1];
        const prices = sorted.map(b => b.price);
        const growth = last.price - first.price;
        return {
          name,
          volumes: bs.length,
          firstPrice: first.price,
          lastPrice:  last.price,
          growth,
          avgPrice: Math.round(Stat.avg(prices)),
          firstYear: first.year,
          lastYear:  last.year,
        };
      })
      .filter(s => s.volumes >= 2)
      .sort((a, b) => Math.abs(b.growth) - Math.abs(a.growth))
      .slice(0, 30);

    const tbody = document.getElementById('series-tbody');
    if (!tbody) return;
    tbody.innerHTML = series.map(s => `
      <tr>
        <td style="max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${s.name}">${s.name}</td>
        <td class="num">${s.volumes}</td>
        <td class="num">${s.firstYear}–${s.lastYear || '?'}</td>
        <td class="num">${Fmt.yen(s.firstPrice)}</td>
        <td class="num">${Fmt.yen(s.lastPrice)}</td>
        <td class="num">
          <span class="pill ${s.growth > 0 ? 'pill-red' : s.growth < 0 ? 'pill-teal' : 'pill-indigo'}">
            ${s.growth >= 0 ? '+' : ''}${Fmt.yen(s.growth)}
          </span>
        </td>
        <td class="num">${Fmt.yen(s.avgPrice)}</td>
      </tr>
    `).join('');
  }

  // First vs latest volume price comparison by release year cohort
  function renderFirstVsLatest(books) {
    const bySeries = Store.bySeries();
    // For each series with ≥ 2 vols, record first and latest price
    const pairs = Object.values(bySeries)
      .filter(bs => bs.length >= 2)
      .map(bs => {
        const sorted = [...bs].sort((a, b) => (a.date?.year || 0) - (b.date?.year || 0) || a.volume - b.volume);
        return { first: sorted[0].price, last: sorted[sorted.length - 1].price };
      })
      .filter(p => p.first > 0 && p.last > 0);

    const sameCount    = pairs.filter(p => p.last === p.first).length;
    const higherCount  = pairs.filter(p => p.last > p.first).length;
    const lowerCount   = pairs.filter(p => p.last < p.first).length;
    const avgIncrease  = Stat.avg(pairs.filter(p => p.last > p.first).map(p => p.last - p.first));

    mkChart('chart-first-vs-last', {
      type: 'doughnut',
      data: {
        labels: ['Price increased', 'Price unchanged', 'Price decreased'],
        datasets: [{
          data: [higherCount, sameCount, lowerCount],
          backgroundColor: [Theme.coral, Theme.gold, Theme.teal],
          borderColor: '#111422',
          borderWidth: 3,
        }],
      },
      options: {
        ...Theme.baseOpts,
        cutout: '60%',
        plugins: {
          legend: { position: 'bottom', labels: { color: Theme.text2, font: { family: "'JetBrains Mono'", size: 10 } } },
          tooltip: { ...Theme.baseOpts.plugins.tooltip },
        },
      },
    });

    const el = document.getElementById('first-vs-last-stats');
    if (el) {
      el.innerHTML = `
        <div class="insight-box"><div class="insight-icon">📈</div><div class="insight-body">
          <strong>${higherCount}</strong> series (${Stat.pct(higherCount, pairs.length).toFixed(0)}%) had their final volume priced <strong>higher</strong> than the first.
          Average increase: <strong>+${Fmt.yen(avgIncrease)}</strong>
        </div></div>
        <div class="insight-box"><div class="insight-icon">📉</div><div class="insight-body">
          <strong>${lowerCount}</strong> series (${Stat.pct(lowerCount, pairs.length).toFixed(0)}%) had prices go <strong>down</strong> over time.
          <strong>${sameCount}</strong> stayed flat.
        </div></div>
      `;
    }
  }

  return { render };
})();
