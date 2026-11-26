/**
 * nuevo-producto.js — Formulario crear / editar producto
 */

let editCode = null;  // null = nuevo; string = código del producto a editar

// ── Init ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.requireAuth()) return;
  renderSidebar('nuevo-producto');

  const params = new URLSearchParams(window.location.search);
  const code   = params.get('edit');

  if (code) {
    const product = MYK.getProduct(code);
    if (product) {
      editCode = code;
      document.getElementById('form-title').textContent = 'Editar producto';
      document.getElementById('bc-label').textContent   = 'Editar';
      document.getElementById('save-btn').innerHTML =
        `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Guardar cambios`;
      populateForm(product);
    }
  }
});

// ── Precargar datos de edición ─────────────────────────────────────────────
function populateForm(p) {
  document.getElementById('f-name').value   = p.name;
  document.getElementById('f-code').value   = p.code;
  document.getElementById('f-pres').value   = p.pres;
  document.getElementById('f-stock').value  = p.stock;
  document.getElementById('f-min').value    = p.min;
  document.getElementById('f-buy').value    = p.buy;
  document.getElementById('f-sell').value   = p.sell;
  document.getElementById('f-desc').value   = p.desc || '';

  // Selects
  setSelectValue('f-cat',  p.cat);
  setSelectValue('f-unit', p.unit);
  setSelectValue('f-prov', p.provider || '');

  // Calcular margen
  if (p.buy > 0) {
    const margin = Math.round(((p.sell - p.buy) / p.buy) * 100);
    document.getElementById('f-margin').value = margin;
  }
  updateGananciaPreview();
}

function setSelectValue(id, val) {
  const el = document.getElementById(id);
  for (const opt of el.options) {
    if (opt.value === val || opt.text === val) { el.value = opt.value; break; }
  }
}

// ── Cálculo automático precio de venta ────────────────────────────────────
function calcSellPrice() {
  const buy    = parseFloat(document.getElementById('f-buy').value) || 0;
  const margin = parseFloat(document.getElementById('f-margin').value) || 0;
  if (buy > 0 && margin > 0) {
    document.getElementById('f-sell').value = Math.round(buy * (1 + margin / 100));
  }
  updateGananciaPreview();
}

function updateGananciaPreview() {
  const buy  = parseFloat(document.getElementById('f-buy').value)  || 0;
  const sell = parseFloat(document.getElementById('f-sell').value) || 0;
  const prev = document.getElementById('margin-preview');
  if (buy > 0 && sell > 0) {
    const ganancia = sell - buy;
    const pct = Math.round((ganancia / buy) * 100);
    document.getElementById('ganancia').textContent = MYK.fmt(ganancia) + ` (${pct}% de margen)`;
    prev.style.display = 'block';
    prev.style.color = ganancia >= 0 ? 'var(--ok)' : 'var(--err)';
  } else {
    prev.style.display = 'none';
  }
}

// Escuchar cambio manual en precio de venta
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('f-sell').addEventListener('input', updateGananciaPreview);
});

// ── Validación ─────────────────────────────────────────────────────────────
function validateForm() {
  const required = [
    { id: 'f-name',  label: 'Nombre del producto' },
    { id: 'f-code',  label: 'Código / SKU' },
    { id: 'f-cat',   label: 'Categoría' },
    { id: 'f-pres',  label: 'Presentación' },
    { id: 'f-stock', label: 'Existencias' },
    { id: 'f-buy',   label: 'Precio de compra' },
    { id: 'f-sell',  label: 'Precio de venta' },
  ];

  for (const field of required) {
    const el  = document.getElementById(field.id);
    const val = el.value.trim();
    el.style.borderColor = '';
    if (!val || val === '') {
      el.style.borderColor = 'var(--err)';
      el.focus();
      showToast(`"${field.label}" es obligatorio`, 'error');
      return false;
    }
  }

  const code = document.getElementById('f-code').value.trim().toUpperCase();
  if (!editCode) {
    const exists = MYK.getProduct(code);
    if (exists) {
      const el = document.getElementById('f-code');
      el.style.borderColor = 'var(--err)';
      el.focus();
      showToast(`El código "${code}" ya existe`, 'error');
      return false;
    }
  }

  return true;
}

// ── Guardar ────────────────────────────────────────────────────────────────
function saveProduct() {
  if (!validateForm()) return;

  const data = {
    code:     document.getElementById('f-code').value.trim().toUpperCase(),
    name:     document.getElementById('f-name').value.trim(),
    cat:      document.getElementById('f-cat').value,
    pres:     document.getElementById('f-pres').value.trim(),
    unit:     document.getElementById('f-unit').value,
    stock:    parseInt(document.getElementById('f-stock').value) || 0,
    min:      parseInt(document.getElementById('f-min').value)   || 0,
    buy:      parseFloat(document.getElementById('f-buy').value)  || 0,
    sell:     parseFloat(document.getElementById('f-sell').value) || 0,
    provider: document.getElementById('f-prov').value,
    desc:     document.getElementById('f-desc').value.trim(),
  };

  const btn = document.getElementById('save-btn');
  btn.disabled = true;
  btn.textContent = 'Guardando…';

  setTimeout(() => {
    if (editCode) {
      MYK.updateProduct(editCode, data);
      showToast('Producto actualizado correctamente', 'success');
    } else {
      MYK.addProduct(data);
      showToast('Producto creado correctamente', 'success');
    }
    setTimeout(() => window.location.href = './productos.html', 1000);
  }, 400);
}
