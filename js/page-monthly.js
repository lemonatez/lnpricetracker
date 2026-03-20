// ═══════════════════════════════════════════════════════
//  PAGE: MONTHLY PRICE GROWTH
// ═══════════════════════════════════════════════════════
const PageMonthly = (() => {

  function render(books) {
    if (!books.length) return;
    renderGrowthChart(books);
    renderStartEndChart(books);
    renderSpreadChart(books);
    renderStatsTable(books);
  }

  // Main chart: monthly start, high, low, avg prices
  function renderGrowthChart(books) {
    const stats = Store.byYMWithStats();
    const yms = Store.sortedYMs(stats);

    const startData = yms.map(ym => stats[ym].start);
    const highData = yms.map(ym => stats[ym].max);
    const lowData = yms.map(ym => stats[ym].min);
    const avgData = yms.map(ym => Math.round(stats[ym].avg));

    mkChart('chart-monthly-growth', {
      type: 'line',
      data: {
        labels: yms,
        datasets: [
          {
            label: 'Start Price',
            data: startData,
            borderColor: Theme.sky,
            backgroundColor: Theme.sky + '20',
            borderWidth: 2,
            pointRadius: 3,
            pointBackgroundColor: Theme.sky,
            fill: false,
          },
          {
            label: 'Highest',
            data: highData,
            borderColor: Theme.coral,
            backgroundColor: Theme.coral + '20',
            borderWidth: 2,
            pointRadius: 2,
            fill: false,
          },
          {
            label: 'Lowest',
            data: lowData,
            borderColor: Theme.teal,
            backgroundColor: Theme.teal + '20',
            borderWidth: 2,
            pointRadius: 2,
            fill: false,
          },
          {
            label: 'Average',
            data: avgData,
            borderColor: Theme.gold,
            backgroundColor: Theme.gold + '20',
            borderWidth: 2.5,
            pointRadius: 3,
            fill: false,
          },
        ],
      },
      options: mergeOpts(Theme.baseOpts, {
        scales: {
          x: { ticks: { maxTicksLimit: 18 } },
          y: Theme.yenAxis(500),
        },
        plugins: {
          legend: { position: 'top' },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.dataset.label}: ¥${ctx.parsed.y.toLocaleString()}`,
            },
          },
        },
      }),
    });
  }

  // Start vs End comparison
  function renderStartEndChart(books) {
    const stats = Store.byYMWithStats();
    const yms = Store.sortedYMs(stats);

    // Get end price (last release of the month)
    const endData = yms.map(ym => {
      const monthBooks = stats[ym].books.sort((a, b) => {
        const dayA = a.date?.day || 10;
        const dayB = b.date?.day || 10;
        return dayB - dayA;
      });
      return monthBooks[0]?.price || stats[ym].start;
    });

    mkChart('chart-monthly-start-end', {
      type: 'bar',
      data: {
        labels: yms,
        datasets: [
          {
            label: 'Start Price',
            data: yms.map(ym => stats[ym].start),
            backgroundColor: Theme.sky + 'cc',
            borderRadius: 3,
          },
          {
            label: 'End Price',
            data: endData,
            backgroundColor: Theme.indigo + 'cc',
            borderRadius: 3,
          },
        ],
      },
      options: mergeOpts(Theme.baseOpts, {
        scales: {
          x: { ticks: { maxTicksLimit: 16 } },
          y: Theme.yenAxis(500),
        },
      }),
    });
  }

  // Price spread (high - low) per month
  function renderSpreadChart(books) {
    const stats = Store.byYMWithStats();
    const yms = Store.sortedYMs(stats);

    const spreadData = yms.map(ym => stats[ym].max - stats[ym].min);
    const countData = yms.map(ym => stats[ym].count);

    mkChart('chart-monthly-spread', {
      type: 'bar',
      data: {
        labels: yms,
        datasets: [{
          label: 'Price Spread (¥)',
          data: spreadData,
          backgroundColor: spreadData.map(v =>
            v >= 100 ? Theme.coral + 'cc' :
            v >= 50 ? Theme.orange + 'cc' :
            Theme.teal + 'cc'
          ),
          borderRadius: 3,
          yAxisID: 'y',
        },
        {
          label: 'Releases',
          data: countData,
          type: 'line',
          borderColor: Theme.text2,
          borderWidth: 1.5,
          pointRadius: 3,
          fill: false,
          yAxisID: 'y2',
        }],
      },
      options: mergeOpts(Theme.baseOpts, {
        scales: {
          x: { ticks: { maxTicksLimit: 16 } },
          y: {
            position: 'left',
            ticks: { callback: v => '¥' + v, color: Theme.text2, font: { family: "'JetBrains Mono'", size: 10 } },
          },
          y2: {
            position: 'right',
            grid: { drawOnChartArea: false },
            ticks: { color: Theme.text2, font: { family: "'JetBrains Mono'", size: 10 } },
          },
        },
      }),
    });
  }

  // Detailed stats table
  function renderStatsTable(books) {
    const stats = Store.byYMWithStats();
    const yms = Store.sortedYMs(stats);

    const tbody = document.getElementById('monthly-stats-tbody');
    if (!tbody) return;

    tbody.innerHTML = yms.map(ym => {
      const s = stats[ym];
      const growth = s.start > 0 ? ((s.avg - s.start) / s.start * 100) : 0;
      const spread = s.max - s.min;

      return `
        <tr>
          <td class="num">${ym}</td>
          <td class="num">${s.count.toLocaleString()}</td>
          <td class="num">${Fmt.yen(s.start)}</td>
          <td class="num">${Fmt.yen(s.min)}</td>
          <td class="num">${Fmt.yen(s.max)}</td>
          <td class="num">${Fmt.yen(Math.round(s.avg))}</td>
          <td class="num">
            <span class="${growth > 0 ? 'pill pill-red' : growth < 0 ? 'pill pill-teal' : ''}">
              ${growth > 0 ? '+' : ''}${growth.toFixed(1)}%
            </span>
          </td>
          <td class="num">${Fmt.yen(spread)}</td>
        </tr>
      `;
    }).join('');
  }

  return { render };
})();
