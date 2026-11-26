/**
 * dashboard.js — Lógica del panel principal
 */
const YT_VIDEO_ID = 'y98yumliemM';

// ── Instancia del gráfico ────────────────────────────────────────────────
let salesChart = null;
let currentPeriod = '7d';

// ── Inicialización ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.requireAuth()) return;
  renderSidebar('dashboard');
  setDate();
  loadStats();
  loadLowStock();
  loadRecentSales();
  initChart('7d');
});

function setDate() {
  const dias = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const d = new Date();
  document.getElementById('dash-date').textContent =
    `Resumen de la operación · ${dias[d.getDay()]} ${d.getDate()} de ${meses[d.getMonth()]}, ${d.getFullYear()}`;
}

// ── Estadísticas ─────────────────────────────────────────────────────────
function loadStats() {
  const products = MYK.getProducts();
  const totalStock = products.reduce((s, p) => s + p.stock, 0);
  const lowCount   = MYK.getLowStock().length;

  document.getElementById('stat-ventas').textContent = MYK.fmt(482500);
  document.getElementById('stat-stock').textContent  = totalStock;
  document.getElementById('stat-refs').textContent   = `de ${products.length} referencias`;
  document.getElementById('stat-bajo').textContent   = lowCount;
}

// ── Bajo stock ────────────────────────────────────────────────────────────
function loadLowStock() {
  const items = MYK.getLowStock().slice(0, 5);
  const list  = document.getElementById('low-stock-list');
  const count = document.getElementById('low-count');
  count.textContent = `${MYK.getLowStock().length} ítems`;

  if (items.length === 0) {
    list.innerHTML = `<div class="empty-state" style="padding:24px 0"><p>No hay productos con bajo stock 🎉</p></div>`;
    return;
  }

  list.innerHTML = items.map(p => {
    const cls = p.stock <= 2 ? 'badge-err' : 'badge-warn';
    return `<div class="stock-item">
      <div>
        <div class="stock-name">${p.name}</div>
        <div class="stock-code">${p.code} · ${p.pres}</div>
      </div>
      <span class="badge ${cls}">${p.stock} und</span>
    </div>`;
  }).join('');
}

// ── Ventas recientes ──────────────────────────────────────────────────────
function loadRecentSales() {
  const sales = MYK.getSales().slice(0, 5);
  const tbody = document.getElementById('recent-sales');
  tbody.innerHTML = sales.map(s => `
    <tr>
      <td class="td-code">${s.id}</td>
      <td class="td-muted">${fmtDate(s.date, s.time)}</td>
      <td>${s.client}</td>
      <td>${s.prods}</td>
      <td class="text-right">${s.qty}</td>
      <td class="text-right td-price">${MYK.fmt(s.total)}</td>
    </tr>`).join('');
}

// ── Gráfico de ventas (Chart.js) ──────────────────────────────────────────
function initChart(period) {
  const data = MYK.chartData[period];
  const ctx  = document.getElementById('salesChart').getContext('2d');

  const barColors = data.labels.map((l, i) =>
    i === data.labels.length - 1 ? '#161614' : '#D4CFC6');
  const hoverColors = data.labels.map((l, i) =>
    i === data.labels.length - 1 ? '#2A2A28' : '#AD7930');

  if (salesChart) salesChart.destroy();

  salesChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.labels,
      datasets: [{
        data: data.values,
        backgroundColor: barColors,
        hoverBackgroundColor: hoverColors,
        borderRadius: 5,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ' ' + MYK.fmt(ctx.parsed.y),
          },
          backgroundColor: '#161614',
          titleColor: 'rgba(255,255,255,0.6)',
          bodyColor: '#fff',
          padding: 10,
          cornerRadius: 6,
        }
      },
      scales: {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: { font: { family: "'DM Sans', sans-serif", size: 11 }, color: '#7A7670' }
        },
        y: {
          grid: { color: '#ECE8E0', drawBorder: false },
          border: { display: false, dash: [4, 4] },
          ticks: {
            font: { family: "'DM Sans', sans-serif", size: 11 },
            color: '#7A7670',
            callback: v => v >= 1000000 ? '$' + (v/1000000).toFixed(1) + 'M' : '$' + (v/1000).toFixed(0) + 'k',
          }
        }
      }
    }
  });
}

function setChartPeriod(period, btn) {
  document.querySelectorAll('.chart-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentPeriod = period;
  initChart(period);
}

// ── Búsqueda global ───────────────────────────────────────────────────────
function globalSearch(q) {
  if (!q.trim()) return;
  // Redirige a productos con búsqueda si corresponde
  if (q.length > 2) {
    const products = MYK.getProducts().filter(p =>
      p.name.toLowerCase().includes(q.toLowerCase()) ||
      p.code.toLowerCase().includes(q.toLowerCase())
    );
    if (products.length > 0) {
      window.location.href = `./productos.html?q=${encodeURIComponent(q)}`;
    }
  }
}

// ── YouTube ────────────────────────────────────────────────────────────────
function loadYTVideo() {
  if (YT_VIDEO_ID === 'VIDEO_ID_AQUI') {
    showToast('Reemplaza VIDEO_ID_AQUI en dashboard.js con el ID de tu video', 'error');
    return;
  }
  const frame = document.getElementById('yt-frame');
  frame.innerHTML = `<iframe src="https://www.youtube.com/embed/${YT_VIDEO_ID}?autoplay=1&rel=0"
    title="Demo Salsamentaria MYK" allowfullscreen allow="autoplay; encrypted-media"></iframe>`;
}
