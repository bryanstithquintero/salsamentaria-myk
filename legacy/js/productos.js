/**
 * productos.js — Gestión de la lista de productos
 */

const ITEMS_PER_PAGE = 8;
let currentPage = 1;
let currentCat  = 'Todos';
let pendingDelete = null;

// ── Init ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.requireAuth()) return;
  renderSidebar('productos');

  // Leer query param ?q= desde el dashboard
  const params = new URLSearchParams(window.location.search);
  const q = params.get('q');
  if (q) document.getElementById('search-input').value = q;

  updateCounts();
  applyFilters();
});

// ── Contadores de categoría ────────────────────────────────────────────────
function updateCounts() {
  const all = MYK.getProducts();
  document.getElementById('cnt-todos').textContent    = all.length;
  document.getElementById('cnt-carnicos').textContent = all.filter(p => p.cat === 'Cárnicos').length;
  document.getElementById('cnt-lacteos').textContent  = all.filter(p => p.cat === 'Lácteos').length;
  document.getElementById('cnt-otros').textContent    = all.filter(p => p.cat === 'Otros').length;
}

// ── Filtro de categoría ────────────────────────────────────────────────────
function setCategory(btn) {
  document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentCat  = btn.dataset.cat;
  currentPage = 1;
  applyFilters();
}

// ── Filtros + ordenamiento + paginación ───────────────────────────────────
function applyFilters() {
  const q    = document.getElementById('search-input').value.trim().toLowerCase();
  const sort = document.getElementById('sort-select').value;

  let data = MYK.getProducts();

  // Filtro categoría
  if (currentCat !== 'Todos') data = data.filter(p => p.cat === currentCat);

  // Filtro búsqueda
  if (q) data = data.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.code.toLowerCase().includes(q) ||
    p.desc.toLowerCase().includes(q)
  );

  // Ordenamiento
  data.sort((a, b) => {
    if (sort === 'stock-asc')  return a.stock - b.stock;
    if (sort === 'stock-desc') return b.stock - a.stock;
    if (sort === 'name-asc')   return a.name.localeCompare(b.name);
    if (sort === 'price-desc') return b.sell - a.sell;
    return 0;
  });

  renderTable(data);
}

// ── Render tabla ───────────────────────────────────────────────────────────
function renderTable(data) {
  const total = data.length;
  const pages = Math.ceil(total / ITEMS_PER_PAGE) || 1;
  if (currentPage > pages) currentPage = 1;

  const slice = data.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const tbody = document.getElementById('products-tbody');

  if (slice.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9">
      <div class="empty-state">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <h3>Sin resultados</h3>
        <p>Intenta con otro nombre o código.</p>
      </div>
    </td></tr>`;
    document.getElementById('pg-info').textContent = 'Sin resultados';
    document.getElementById('pg-btns').innerHTML = '';
    document.getElementById('prod-subtitle').textContent = '0 productos encontrados';
    return;
  }

  tbody.innerHTML = slice.map(p => {
    const isBajo = p.stock <= p.min;
    const rowCls = isBajo ? 'tr-warn' : '';
    const margin = p.buy > 0 ? Math.round(((p.sell - p.buy) / p.buy) * 100) : 0;
    return `<tr class="${rowCls}">
      <td><input type="checkbox" class="row-check" data-code="${p.code}"></td>
      <td class="td-code">${p.code}</td>
      <td>
        <div style="display:flex;align-items:center;gap:9px">
          ${catDot(p.cat)}
          <div>
            <div class="td-bold">${p.name}</div>
            <div style="font-size:11px;color:var(--text-muted)">${p.cat}</div>
          </div>
        </div>
      </td>
      <td class="td-muted">${p.pres}</td>
      <td class="text-center">
        <strong style="${isBajo ? 'color:var(--err)' : ''}">${p.stock}</strong>
        <span class="td-muted"> und</span>
      </td>
      <td class="td-muted">${MYK.fmt(p.buy)}</td>
      <td class="td-price">${MYK.fmt(p.sell)}</td>
      <td>${statusBadge(isBajo ? 'bajo' : 'ok')}</td>
      <td>
        <div style="display:flex;gap:4px">
          <a href="./nuevo-producto.html?edit=${encodeURIComponent(p.code)}" class="icon-btn" title="Editar producto">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </a>
          <button class="icon-btn danger" title="Eliminar producto" onclick="confirmDelete('${p.code}','${p.name.replace(/'/g,"\\'")}')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');

  // Subtítulo
  const sub = document.getElementById('prod-subtitle');
  const totalAll = MYK.getProducts();
  sub.textContent = `${totalAll.length} referencias · Inventario actualizado hoy`;

  // Info paginación
  const from = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const to   = Math.min(currentPage * ITEMS_PER_PAGE, total);
  document.getElementById('pg-info').textContent = `Mostrando ${from}–${to} de ${total}`;

  // Botones de paginación
  renderPagination(pages, data);
}

function renderPagination(pages, data) {
  const container = document.getElementById('pg-btns');
  if (pages <= 1) { container.innerHTML = ''; return; }

  let btns = '';
  if (currentPage > 1) btns += `<button class="pg-btn" onclick="goPage(${currentPage-1},event)">‹ Ant.</button>`;

  for (let i = 1; i <= pages; i++) {
    if (pages > 5 && i > 2 && i < pages - 1 && Math.abs(i - currentPage) > 1) {
      if (i === 3 || i === pages - 2) btns += `<button class="pg-btn" disabled>…</button>`;
      continue;
    }
    btns += `<button class="pg-btn${i === currentPage ? ' active' : ''}" onclick="goPage(${i},event)">${i}</button>`;
  }

  if (currentPage < pages) btns += `<button class="pg-btn" onclick="goPage(${currentPage+1},event)">Sig. ›</button>`;
  container.innerHTML = btns;
  // Store data reference for pagination
  container._data = data;
}

function goPage(n, e) {
  currentPage = n;
  const data = e.currentTarget.parentElement._data;
  renderTable(data);
}

// ── Selección masiva ────────────────────────────────────────────────────────
function toggleAll(master) {
  document.querySelectorAll('.row-check').forEach(cb => cb.checked = master.checked);
}

// ── Exportar CSV ─────────────────────────────────────────────────────────────
function exportCSV() {
  const products = MYK.getProducts();
  const headers  = ['Código','Nombre','Categoría','Presentación','Existencias','Stock Mínimo','P. Compra','P. Venta','Estado'];
  const rows = products.map(p => [
    p.code, p.name, p.cat, p.pres, p.stock, p.min,
    p.buy, p.sell, p.stock <= p.min ? 'Bajo stock' : 'Disponible'
  ]);
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'productos-myk.csv'; a.click();
  URL.revokeObjectURL(url);
  showToast('Archivo CSV exportado correctamente', 'success');
}

// ── Eliminar ──────────────────────────────────────────────────────────────
function confirmDelete(code, name) {
  pendingDelete = code;
  const modal = document.getElementById('confirm-modal');
  document.getElementById('confirm-msg').textContent = `¿Eliminar "${name}"? Esta acción no se puede deshacer.`;
  modal.style.display = 'flex';
  document.getElementById('confirm-btn').onclick = () => {
    MYK.deleteProduct(pendingDelete);
    closeModal();
    updateCounts();
    applyFilters();
    showToast('Producto eliminado', 'success');
  };
}

function closeModal() {
  document.getElementById('confirm-modal').style.display = 'none';
  pendingDelete = null;
}
