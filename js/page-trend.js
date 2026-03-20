// ═══════════════════════════════════════════════════════
//  PAGE: TREND ANALYSIS
// ═══════════════════════════════════════════════════════
const PageTrend = (() => {

  function render(books) {
    if (!books.length) return;
    renderYoY(books);
    renderVolumePricing(books);
    renderPriceBreakpoints(books);
    renderHeatmap(books);
    renderInflationTable(books);
  }

  // Year-over-year change in avg price
  function renderYoY(books) {
    const byYear = Store.byYear();
    const years  = Store.sortedYears(byYear);

    const avgs = years.map(y => Stat.avg(byYear[y].map(b => b.price)));
    const yoy  = avgs.map((a, i) => i === 0 ? 0 : +(a - avgs[i - 1]).toFixed(1));

    mkChart('chart-yoy', {
      type: 'bar',
      data: {
        labels: years.slice(1),
        datasets: [{
          label: 'YoY change (¥)',
          data: yoy.slice(1),
          backgroundColor: yoy.slice(1).map(v => v > 0 ? Theme.coral + 'cc' : Theme.teal + 'cc'),
          borderRadius: 3,
        }],
      },
      options: mergeOpts(Theme.baseOpts, {
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { maxTicksLimit: 16 } },
          y: { ticks: { callback: v => (v >= 0 ? '+' : '') + '¥' + v, color: Theme.text2, font: { family: "'JetBrains Mono'", size: 10 } } },
        },
      }),
    });
  }

  // Price by volume number (vol 1 vs 2 vs 3+ etc)
  function renderVolumePricing(books) {
    const buckets = { 1: [], 2: [], 3: [], 4: [], 5: [], '6+': [] };
    books.forEach(b => {
      const v = b.volume;
      const key = v >= 6 ? '6+' : v <= 5 ? String(v) : '6+';
      (buckets[key] = buckets[key] || []).push(b.price);
    });

    const labels = Object.keys(buckets).filter(k => buckets[k].length);
    const avgs   = labels.map(k => Math.round(Stat.avg(buckets[k])));
    const counts = labels.map(k => buckets[k].length);

    mkChart('chart-volume-price', {
      type: 'bar',
      data: {
        labels: labels.map(l => `Vol. ${l}`),
        datasets: [
          {
            label: 'Avg Price',
            data: avgs,
            backgroundColor: labels.map((_, i) => Theme.palette[i % Theme.palette.length] + 'cc'),
            borderRadius: 4,
            yAxisID: 'y',
          },
          {
            label: 'Book Count',
            data: counts,
            type: 'line',
            borderColor: Theme.text2,
            borderWidth: 1.5,
            pointRadius: 3,
            fill: false,
            yAxisID: 'y2',
          },
        ],
      },
      options: mergeOpts(Theme.baseOpts, {
        scales: {
          y:  { ...Theme.yenAxis(600), position: 'left' },
          y2: { position: 'right', grid: { drawOnChartArea: false }, ticks: { color: Theme.text2, font: { family: "'JetBrains Mono'", size: 10 } } },
        },
      }),
    });
  }

  // Price threshold crossings — when did ¥800, ¥840, ¥880 become majority?
  function renderPriceBreakpoints(books) {
    const byYear = Store.byYear();
    const years  = Store.sortedYears(byYear).filter(y => byYear[y].length >= 5);
    const thresholds = [700, 750, 800, 840, 880];
    const colors = [Theme.teal, Theme.sky, Theme.gold, Theme.orange, Theme.coral];

    mkChart('chart-breakpoints', {
      type: 'line',
      data: {
        labels: years,
        datasets: thresholds.map((t, i) => ({
          label: `≥¥${t}`,
          data: years.map(y => +Stat.pct(byYear[y].filter(b => b.price >= t).length, byYear[y].length).toFixed(1)),
          borderColor: colors[i],
          backgroundColor: colors[i] + '12',
          borderWidth: 2, pointRadius: 2, tension: 0.35, fill: false,
        })),
      },
      options: mergeOpts(Theme.baseOpts, {
        scales: {
          y: { ...Theme.pctAxis(), min: 0, max: 100 },
          x: { ticks: { maxTicksLimit: 16 } },
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y}% of books`,
            },
          },
        },
      }),
    });
  }

  // Monthly heatmap: year × month, color = avg price
  function renderHeatmap(books) {
    const cell = (year, month) => {
      const ym = `${year}-${String(month).padStart(2, '0')}`;
      const ys = books.filter(b => b.ym === ym);
      return ys.length ? Math.round(Stat.avg(ys.map(b => b.price))) : null;
    };

    const allYears  = [...new Set(books.map(b => b.year).filter(Boolean))].sort();
    const months    = [1,2,3,4,5,6,7,8,9,10,11,12];
    const monthNames= ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    const allVals   = allYears.flatMap(y => months.map(m => cell(y, m)).filter(v => v !== null));
    const minP      = Math.min(...allVals);
    const maxP      = Math.max(...allVals);

    function lerp(t) {
      // dark teal → gold → coral
      if (t < 0.5) {
        const u = t * 2;
        return `rgb(${Math.round(45 + u*(240-45))},${Math.round(212 + u*(192-212))},${Math.round(191 + u*(64-191))})`;
      } else {
        const u = (t - 0.5) * 2;
        return `rgb(${Math.round(240 + u*(255-240))},${Math.round(192 + u*(107-192))},${Math.round(64 + u*(107-64))})`;
      }
    }

    const wrap = document.getElementById('heatmap-wrap');
    if (!wrap) return;

    const gridCols = allYears.length + 1;
    wrap.style.gridTemplateColumns = `40px repeat(${allYears.length}, 1fr)`;
    wrap.innerHTML = '';

    // Header: empty + years
    const cornerEl = document.createElement('div');
    cornerEl.style.cssText = 'font-size:9px;color:var(--muted);';
    wrap.appendChild(cornerEl);
    allYears.forEach(y => {
      const d = document.createElement('div');
      d.textContent = y;
      d.style.cssText = 'font-family:var(--font-mono);font-size:9px;color:var(--muted);text-align:center;padding:2px 0;';
      wrap.appendChild(d);
    });

    // Rows: month label + cells
    months.forEach((m, mi) => {
      const lbl = document.createElement('div');
      lbl.textContent = monthNames[mi];
      lbl.style.cssText = 'font-family:var(--font-mono);font-size:9px;color:var(--muted);display:flex;align-items:center;';
      wrap.appendChild(lbl);

      allYears.forEach(y => {
        const v = cell(y, m);
        const d = document.createElement('div');
        d.className = 'hm-cell';
        d.style.height = '28px';
        if (v !== null) {
          const t = (v - minP) / (maxP - minP || 1);
          d.style.background = lerp(t);
          d.style.color = t > 0.6 ? '#0a0a0f' : '#dde0f0';
          d.textContent = v >= 1000 ? (v/1000).toFixed(1)+'k' : v;
          d.title = `${y}-${monthNames[mi]}: ¥${v}`;
        } else {
          d.style.background = 'var(--surface2)';
        }
        wrap.appendChild(d);
      });
    });
  }

  // YoY table: price history per year with % changes
  function renderInflationTable(books) {
    const byYear = Store.byYear();
    const years  = Store.sortedYears(byYear);

    const rows = years.map((y, i) => {
      const ys   = byYear[y];
      const avg  = Math.round(Stat.avg(ys.map(b => b.price)));
      const prev = i > 0 ? Math.round(Stat.avg(byYear[years[i-1]].map(b => b.price))) : null;
      const chg  = prev !== null ? avg - prev : null;
      const pct  = prev ? ((avg - prev) / prev * 100).toFixed(1) : null;
      const over800 = +Stat.pct(ys.filter(b => b.price >= 800).length, ys.length).toFixed(1);
      const over880 = +Stat.pct(ys.filter(b => b.price >= 880).length, ys.length).toFixed(1);
      return { y, count: ys.length, avg, chg, pct, over800, over880 };
    }).reverse(); // newest first

    const tbody = document.getElementById('inflation-tbody');
    if (!tbody) return;
    tbody.innerHTML = rows.map(r => `
      <tr>
        <td class="num">${r.y}</td>
        <td class="num">${r.count.toLocaleString()}</td>
        <td class="num">${Fmt.yen(r.avg)}</td>
        <td class="num">${r.chg !== null ? `<span class="${r.chg > 0 ? 'pill pill-red' : 'pill pill-teal'}">${Fmt.delta(r.chg)}</span>` : '—'}</td>
        <td class="num">${r.pct !== null ? `${r.pct > 0 ? '+' : ''}${r.pct}%` : '—'}</td>
        <td class="num">${r.over800}%</td>
        <td class="num">${r.over880}%</td>
      </tr>
    `).join('');
  }

  return { render };
})();
