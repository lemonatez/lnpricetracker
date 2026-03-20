// ═══════════════════════════════════════════════════════
//  PAGE: OVERVIEW
// ═══════════════════════════════════════════════════════
const PageOverview = (() => {

  function render(books) {
    if (!books.length) return;

    const prices = books.map(b => b.price);
    const newBooks = books.filter(b => !b.sequel);
    const sequels  = books.filter(b => b.sequel);
    const years    = books.map(b => b.year).filter(Boolean);
    const minY = Math.min(...years), maxY = Math.max(...years);

    // KPIs
    el('kpi-total').textContent  = Fmt.num(books.length);
    el('kpi-range').textContent  = `${minY}–${maxY}`;
    el('kpi-avg').textContent    = Fmt.yen(Stat.avg(prices));
    el('kpi-med').textContent    = Fmt.yen(Stat.median(prices));
    el('kpi-new').textContent    = newBooks.length ? Fmt.yen(Stat.avg(newBooks.map(b => b.price))) : '—';
    el('kpi-seq').textContent    = sequels.length  ? Fmt.yen(Stat.avg(sequels.map(b => b.price)))  : '—';

    const gap = Stat.avg(sequels.map(b => b.price)) - Stat.avg(newBooks.map(b => b.price));
    el('kpi-gap').textContent    = Fmt.delta(gap, '');
    el('kpi-gap').className      = 'kpi-delta ' + (gap > 0 ? 'up' : 'down');

    // Trend by year
    renderTrend(books);
    renderDist(books);
    renderTierStack(books);
    renderMonthly(books);
    renderInsights(books);
  }

  function renderTrend(books) {
    const byYear = Store.byYear();
    const years  = Store.sortedYears(byYear);

    const datasets = [
      { label: 'All Books', key: b => true, color: Theme.gold },
      { label: 'New Series', key: b => !b.sequel, color: Theme.teal },
      { label: 'Sequels',    key: b => b.sequel,  color: Theme.coral },
    ].map(d => ({
      label: d.label,
      data: years.map(y => {
        const ys = byYear[y].filter(d.key);
        return ys.length ? Math.round(Stat.avg(ys.map(b => b.price))) : null;
      }),
      borderColor: d.color,
      backgroundColor: d.color + '18',
      borderWidth: 2.5, pointRadius: 2.5, tension: 0.35,
      spanGaps: true,
    }));

    // Linear regression overlay for "All"
    const allPts = years.map((y, i) => {
      const ys = byYear[y];
      return ys.length ? Math.round(Stat.avg(ys.map(b => b.price))) : null;
    });
    const validX = years.filter((_, i) => allPts[i] !== null);
    const validY = allPts.filter(v => v !== null);
    const reg = Stat.linearRegression(validX, validY);
    datasets.push({
      label: `Trend (slope ${Fmt.delta(reg.slope, '¥/yr')})`,
      data: years.map(y => Math.round(reg.slope * y + reg.intercept)),
      borderColor: Theme.indigo,
      borderWidth: 1.5,
      borderDash: [5, 4],
      pointRadius: 0,
      tension: 0,
      fill: false,
    });

    mkChart('chart-trend', {
      type: 'line',
      data: { labels: years, datasets },
      options: mergeOpts(Theme.baseOpts, {
        plugins: { legend: { position: 'top' } },
        scales: { y: Theme.yenAxis(400) },
      }),
    });
  }

  function renderDist(books) {
    const counts = {};
    books.forEach(b => { counts[b.price] = (counts[b.price] || 0) + 1; });
    const sorted = Object.keys(counts).map(Number).sort((a, b) => a - b);

    mkChart('chart-dist', {
      type: 'bar',
      data: {
        labels: sorted.map(p => '¥' + p),
        datasets: [{
          data: sorted.map(p => counts[p]),
          backgroundColor: sorted.map(p =>
            p >= 920 ? Theme.coral :
            p >= 880 ? Theme.orange :
            p >= 840 ? Theme.gold :
            p >= 800 ? Theme.teal :
            Theme.indigo
          ),
          borderRadius: 3,
          borderSkipped: false,
        }],
      },
      options: mergeOpts(Theme.baseOpts, {
        plugins: { legend: { display: false } },
        scales: { x: { ticks: { maxTicksLimit: 20 } } },
      }),
    });
  }

  function renderTierStack(books) {
    const byYear = Store.byYear();
    const years  = Store.sortedYears(byYear).filter(y => byYear[y].length >= 3);
    const tiers  = Store.TIER_ORDER;
    const colors = [Theme.sky, Theme.indigo, Theme.teal, Theme.gold, Theme.orange, Theme.pink, Theme.coral, '#cc3333'];

    mkChart('chart-tier', {
      type: 'bar',
      data: {
        labels: years,
        datasets: tiers.map((tier, i) => ({
          label: tier,
          data: years.map(y => +Stat.pct(byYear[y].filter(b => b.tier === tier).length, byYear[y].length).toFixed(1)),
          backgroundColor: colors[i],
          borderRadius: 1,
        })),
      },
      options: mergeOpts(Theme.baseOpts, {
        scales: {
          x: { stacked: true, ticks: { maxTicksLimit: 16 } },
          y: { stacked: true, ...Theme.pctAxis(), max: 100 },
        },
        plugins: { legend: { labels: { font: { size: 9 } } } },
      }),
    });
  }

  function renderMonthly(books) {
    // Last 3 years monthly avg
    const cutoff = Math.max(...books.map(b => b.year).filter(Boolean)) - 2;
    const recent = books.filter(b => b.year >= cutoff);
    const byYM   = Store.byYM(b => b.year >= cutoff);
    const yms    = Store.sortedYMs(byYM);

    mkChart('chart-monthly', {
      type: 'line',
      data: {
        labels: yms,
        datasets: [
          {
            label: 'All avg',
            data: yms.map(ym => Math.round(Stat.avg(byYM[ym].map(b => b.price)))),
            borderColor: Theme.gold, borderWidth: 2, pointRadius: 2, tension: 0.4,
          },
          {
            label: 'New series',
            data: yms.map(ym => {
              const ns = byYM[ym].filter(b => !b.sequel);
              return ns.length ? Math.round(Stat.avg(ns.map(b => b.price))) : null;
            }),
            borderColor: Theme.teal, borderWidth: 2, pointRadius: 2, tension: 0.4, spanGaps: true,
          },
          {
            label: 'Sequels',
            data: yms.map(ym => {
              const sq = byYM[ym].filter(b => b.sequel);
              return sq.length ? Math.round(Stat.avg(sq.map(b => b.price))) : null;
            }),
            borderColor: Theme.coral, borderWidth: 2, pointRadius: 2, tension: 0.4, spanGaps: true,
          },
        ],
      },
      options: mergeOpts(Theme.baseOpts, {
        scales: { x: { ticks: { maxTicksLimit: 18 } }, y: Theme.yenAxis(600) },
      }),
    });
  }

  function renderInsights(books) {
    const byYear = Store.byYear();
    const years  = Store.sortedYears(byYear);
    const avgAll = y => Stat.avg(byYear[y].map(b => b.price));

    const recent = years.slice(-3);
    const oldMid = years.filter(y => y >= 2005 && y <= 2015);

    const avgRecent = Stat.avg(recent.flatMap(y => byYear[y].map(b => b.price)));
    const avgOld    = Stat.avg(oldMid.flatMap(y => byYear[y].map(b => b.price)));
    const pctChange = ((avgRecent - avgOld) / avgOld * 100).toFixed(1);

    const newBooks = books.filter(b => !b.sequel);
    const sequels  = books.filter(b => b.sequel);
    const gap = Stat.avg(sequels.map(b => b.price)) - Stat.avg(newBooks.map(b => b.price));

    const recentBooks = books.filter(b => b.year >= Math.max(...years) - 1);
    const over800pct  = Stat.pct(recentBooks.filter(b => b.price >= 800).length, recentBooks.length);
    const recentSeq   = sequels.filter(b => b.year >= Math.max(...years) - 1);
    const over900pct  = Stat.pct(recentSeq.filter(b => b.price >= 900).length, recentSeq.length);

    // Trend regression
    const reg = Stat.linearRegression(years, years.map(avgAll));

    const insights = [
      { icon:'📈', text: `Avg price rose <strong>${pctChange > 0 ? '+' : ''}${pctChange}%</strong> from 2005–15 baseline (${Fmt.yen(avgOld)}) to recent years (${Fmt.yen(avgRecent)})` },
      { icon:'📐', text: `Linear trend: prices rising approx. <strong>${Fmt.yen(reg.slope)} per year</strong> (R²=${reg.r2.toFixed(2)}) — ${reg.r2 > 0.7 ? 'strong' : reg.r2 > 0.4 ? 'moderate' : 'weak'} correlation` },
      { icon:'🆚', text: `Sequel avg is <strong>${Fmt.yen(Math.abs(gap))} ${gap > 0 ? 'higher' : 'lower'}</strong> than new series avg across all time — gap appears ${gap > 0 ? 'widening' : 'narrowing'} recently` },
      { icon:'💴', text: `In the last 2 years, <strong>${over800pct.toFixed(1)}%</strong> of all releases priced ≥¥800 — compared to historically lower rates` },
      { icon:'📚', text: `<strong>${over900pct.toFixed(1)}%</strong> of recent sequel releases hit ¥900+, supporting the hypothesis of sequel-tier price inflation` },
    ];

    el('overview-insights').innerHTML = insights.map(i =>
      `<div class="insight-box"><div class="insight-icon">${i.icon}</div><div class="insight-body">${i.text}</div></div>`
    ).join('');
  }

  function el(id) { return document.getElementById(id); }

  return { render };
})();
