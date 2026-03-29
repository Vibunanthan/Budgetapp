const Charts = (() => {
  let categoryChart = null;
  let investmentChart = null;
  let trendChart = null;

  const fmt = (cents) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100);

  const CHART_DEFAULTS = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        labels: { font: { family: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', size: 12 }, color: '#1C1C1E', boxWidth: 12, padding: 16 }
      }
    }
  };

  function setEmpty(canvasId, emptyId, isEmpty) {
    const canvas = document.getElementById(canvasId);
    const empty = document.getElementById(emptyId);
    if (!canvas || !empty) return;
    canvas.style.display = isEmpty ? 'none' : 'block';
    empty.style.display = isEmpty ? 'block' : 'none';
  }

  // Category doughnut — expenses by category
  function updateCategoryChart(labels, data, colors) {
    const isEmpty = !data.length || data.every(v => v === 0);
    setEmpty('category-chart', 'category-chart-empty', isEmpty);
    if (isEmpty) { if (categoryChart) { categoryChart.destroy(); categoryChart = null; } return; }

    if (categoryChart) {
      categoryChart.data.labels = labels;
      categoryChart.data.datasets[0].data = data;
      categoryChart.data.datasets[0].backgroundColor = colors;
      categoryChart.update();
      return;
    }

    const ctx = document.getElementById('category-chart').getContext('2d');
    categoryChart = new Chart(ctx, {
      type: 'doughnut',
      data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0, hoverOffset: 6 }] },
      options: {
        ...CHART_DEFAULTS,
        aspectRatio: 1.6,
        cutout: '65%',
        plugins: {
          ...CHART_DEFAULTS.plugins,
          legend: { ...CHART_DEFAULTS.plugins.legend, position: 'bottom' },
          tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${fmt(ctx.raw)}` } }
        }
      }
    });
  }

  // Investment horizontal bar — by investment name
  function updateInvestmentChart(labels, data) {
    const isEmpty = !data.length || data.every(v => v === 0);
    setEmpty('investment-chart', 'investment-chart-empty', isEmpty);
    if (isEmpty) { if (investmentChart) { investmentChart.destroy(); investmentChart = null; } return; }

    const barColors = labels.map(() => 'rgba(96, 165, 250, 0.75)');

    if (investmentChart) {
      investmentChart.data.labels = labels;
      investmentChart.data.datasets[0].data = data;
      investmentChart.data.datasets[0].backgroundColor = barColors;
      investmentChart.update();
      return;
    }

    const ctx = document.getElementById('investment-chart').getContext('2d');
    investmentChart = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ data, backgroundColor: barColors, borderRadius: 6, borderSkipped: false }] },
      options: {
        ...CHART_DEFAULTS,
        indexAxis: 'y',
        aspectRatio: Math.max(1.2, labels.length * 0.5),
        plugins: {
          ...CHART_DEFAULTS.plugins,
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx) => ` ${fmt(ctx.raw)}` } }
        },
        scales: {
          x: {
            grid: { color: '#F0F0F5' },
            ticks: { callback: (v) => fmt(v), color: '#8E8E93', font: { size: 11 } }
          },
          y: { grid: { display: false }, ticks: { color: '#1C1C1E', font: { size: 13 } } }
        }
      }
    });
  }

  // Stacked trend bar — expenses vs investments over time
  function updateTrendChart(labels, expenseData, investmentData) {
    const isEmpty = !labels.length;
    setEmpty('trend-chart', 'trend-chart-empty', isEmpty);
    if (isEmpty) { if (trendChart) { trendChart.destroy(); trendChart = null; } return; }

    if (trendChart) {
      trendChart.data.labels = labels;
      trendChart.data.datasets[0].data = expenseData;
      trendChart.data.datasets[1].data = investmentData;
      trendChart.update('active');
      return;
    }

    const ctx = document.getElementById('trend-chart').getContext('2d');
    trendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Expenses',
            data: expenseData,
            borderColor: '#F87171',
            backgroundColor: 'rgba(248, 113, 113, 0.08)',
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: '#F87171',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
          },
          {
            label: 'Investments',
            data: investmentData,
            borderColor: '#60A5FA',
            backgroundColor: 'rgba(96, 165, 250, 0.08)',
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: '#60A5FA',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
          }
        ]
      },
      options: {
        ...CHART_DEFAULTS,
        aspectRatio: 1.8,
        plugins: {
          ...CHART_DEFAULTS.plugins,
          legend: { ...CHART_DEFAULTS.plugins.legend, position: 'bottom' },
          tooltip: { mode: 'index', intersect: false, callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${fmt(ctx.raw)}` } }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#8E8E93', font: { size: 11 } } },
          y: { grid: { color: '#F0F0F5' }, ticks: { callback: (v) => fmt(v), color: '#8E8E93', font: { size: 11 } } }
        }
      }
    });
  }

  function destroyAll() {
    [categoryChart, investmentChart, trendChart].forEach(c => c && c.destroy());
    categoryChart = null; investmentChart = null; trendChart = null;
  }

  return { updateCategoryChart, updateInvestmentChart, updateTrendChart, destroyAll };
})();
