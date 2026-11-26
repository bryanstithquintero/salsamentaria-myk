/**
 * historial.js — Historial y registro de ventas
 */

const SALES_PER_PAGE = 10;
let histPage    = 1;
let histStatus  = 'all';

// ── Init ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.requireAuth()) return;
  renderSidebar('historial');
  applyFilters();
});

// ── Cambio de estado ───────────────────────────────────────────────────────
function setStatus(btn) {
  document.querySelectorAll('.st-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  histStatus = btn.dataset.st;
  histPage   = 1;
  applyFilters();
}

// ── Limpiar filtros ────────────────────────────────────────────────────────
function clearFilters() {
  document.getElementById('hist-search').value   = '';
  document.getElementById('filter-client').value = '';
  document.getElementById('filter-range').value  = 'month';
  histStatus = 'all';
  histPage   = 1;
  document.querySelectorAll('.st-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('.st-btn[data-st="all"]').classList.add('active');
  applyFilters();
}

// ── Filtros principales ────────────────────────────────────────────────────
function applyFilters() {
  const q      = document.getElementById('hist-search').value.trim().toLowerCase();
  const client = document.getElementById('filter-client').value;

  let data = MYK.getSales();

  if (histStatus !== 'all') data = data.filter(s => s.status === histStatus);
  if (client)               data = data.filter(s => s.client === client);
  if (q) data = data.filter(s =>
    s.id.toLowerCase().includes(q) ||
    s.client.toLowerCase().includes(q) ||
    s.prods.toLowerCase().includes(q)
  );

  updateStats(data);
  renderTable(data);
}

// ── Estadísticas ───────────────────────────────────────────────────────────
function updateStats(data) {
  const pagadas = data.filter(s => s.status === 'pagada');
  const total   = pagadas.reduce((s, v) => s + v.total, 0);
  const avg     = pagadas.length ? Math.round(total / pagadas.length) : 0;

  document.getElementById('sum-count').textContent = data.length;
  document.getElementById('sum-total').textContent = MYK.fmt(total);
  document.getElementById('sum-avg').textContent   = avg > 0 ? MYK.fmt(avg) : '—';
  document.getElementById('hist-subtitle').textContent =
    `${data.length} ventas registradas · ${MYK.fmt(total)} acumulado`;

  // Producto top (heurístico)
  const freq = {};
  data.forEach(s => {
    const base = s.prods.split('+')[0].trim().split(' x')[0].trim();
    freq[base] = (freq[base] || 0) + s.qty;
  });
  const top = Object.entries(freq).sort((a,b) => b[1]-a[1])[0];
  document.getElementById('sum-top').textContent = top
    ? (top[0].length > 18 ? top[0].slice(0,18) + '…' : top[0])
    : '—';
}

// ── Render tabla ───────────────────────────────────────────────────────────
function renderTable(data) {
  const total  = data.length;
  const pages  = Math.ceil(total / SALES_PER_PAGE) || 1;
  if (histPage > pages) histPage = 1;

  const slice = data.slice((histPage - 1) * SALES_PER_PAGE, histPage * SALES_PER_PAGE);
  const tbody = document.getElementById('hist-tbody');

  if (slice.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8">
      <div class="empty-state">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <h3>Sin ventas en este período</h3>
        <p>Cambia los filtros o registra una nueva venta.</p>
      </div>
    </td></tr>`;
    document.getElementById('pg-info').textContent = 'Sin resultados';
    document.getElementById('pg-btns').innerHTML = '';
    return;
  }

  tbody.innerHTML = slice.map(s => {
    const isPending = s.status === 'pendiente';
    return `<tr class="${isPending ? 'tr-warn' : ''}">
      <td class="td-code">${s.id}</td>
      <td class="td-muted" style="white-space:nowrap">${fmtDate(s.date, s.time)}</td>
      <td>${s.client}</td>
      <td>${s.prods}</td>
      <td class="text-center">${s.qty}</td>
      <td class="text-right td-price">${MYK.fmt(s.total)}</td>
      <td>${statusBadge(s.status)}</td>
      <td>
        <button class="icon-btn" title="Ver detalle" onclick="showDetail('${s.id}')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </td>
    </tr>`;
  }).join('');

  // Paginación
  const from = (histPage - 1) * SALES_PER_PAGE + 1;
  const to   = Math.min(histPage * SALES_PER_PAGE, total);
  document.getElementById('pg-info').textContent = `Mostrando ${from}–${to} de ${total}`;

  const container = document.getElementById('pg-btns');
  container._data = data;
  let btns = '';
  if (histPage > 1) btns += `<button class="pg-btn" onclick="goPage(${histPage-1},event)">‹ Ant.</button>`;
  for (let i = 1; i <= pages; i++) {
    if (pages > 5 && i > 2 && i < pages - 1 && Math.abs(i - histPage) > 1) {
      if (i === 3 || i === pages - 2) btns += `<button class="pg-btn" disabled>…</button>`;
      continue;
    }
    btns += `<button class="pg-btn${i === histPage ? ' active' : ''}" onclick="goPage(${i},event)">${i}</button>`;
  }
  if (histPage < pages) btns += `<button class="pg-btn" onclick="goPage(${histPage+1},event)">Sig. ›</button>`;
  container.innerHTML = btns;
}

function goPage(n, e) {
  histPage = n;
  renderTable(e.currentTarget.parentElement._data);
}

// ── Detalle de venta ───────────────────────────────────────────────────────
function showDetail(id) {
  const sale = MYK.getSales().find(s => s.id === id);
  if (!sale) return;
  showToast(`${sale.id} · ${sale.client} — ${MYK.fmt(sale.total)} · ${sale.status}`);
}

// ── Exportar "PDF" (abre ventana de impresión) ────────────────────────────
function exportPDF() {
  window.print();
  showToast('Usa Ctrl+P / Imprimir para guardar como PDF', '');
}

// ── Modal nueva venta ─────────────────────────────────────────────────────
function showNewSaleModal() {
  const products = MYK.getProducts();
  const sel = document.getElementById('ns-prod');
  sel.innerHTML = products.map(p =>
    `<option value="${p.sell}" data-name="${p.name}">${p.name} — ${MYK.fmt(p.sell)}</option>`
  ).join('');
  document.getElementById('ns-qty').value    = 1;
  document.getElementById('ns-client').value = '';
  calcSaleTotal();
  document.getElementById('sale-modal').style.display = 'flex';
}

function calcSaleTotal() {
  const price = parseFloat(document.getElementById('ns-prod').value) || 0;
  const qty   = parseInt(document.getElementById('ns-qty').value)    || 1;
  document.getElementById('ns-total').value = price * qty;
}

document.addEventListener('DOMContentLoaded', () => {
  const sel = document.getElementById('ns-prod');
  if (sel) sel.addEventListener('change', calcSaleTotal);
});

function closeSaleModal() {
  document.getElementById('sale-modal').style.display = 'none';
}

function saveSale() {
  const prod  = document.getElementById('ns-prod');
  const name  = prod.options[prod.selectedIndex]?.dataset.name || 'Producto';
  const qty   = parseInt(document.getElementById('ns-qty').value)   || 1;
  const total = parseFloat(document.getElementById('ns-total').value) || 0;
  const client = document.getElementById('ns-client').value.trim() || 'Cliente eventual';

  if (!total) { showToast('Ingresa el total de la venta', 'error'); return; }

  const sales = MYK.getSales();
  const lastId = parseInt(sales[0]?.id.replace('V-', '') || '0');
  const newId  = 'V-' + String(lastId + 1).padStart(4, '0');

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 5);

  // Guardar venta (prepend)
  const all = [{ id: newId, date: dateStr, time: timeStr, client, prods: name, qty, total, status: 'pagada' }, ...sales];
  localStorage.setItem('myk_sales', JSON.stringify(all));

  closeSaleModal();
  applyFilters();
  showToast(`Venta ${newId} registrada correctamente`, 'success');
}
