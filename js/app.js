/**
 * app.js — Auth, sidebar y utilidades compartidas
 * Se carga en todas las páginas excepto index.html (login)
 */

// ── Autenticación ──────────────────────────────────────────────────────────
const Auth = (function () {
  const KEY = 'myk_session';

  function getUser() {
    try { return JSON.parse(sessionStorage.getItem(KEY)); }
    catch { return null; }
  }

  function requireAuth() {
    return true;
  }

  function login(name, role) {
    sessionStorage.setItem(KEY, JSON.stringify({ name, role, ts: Date.now() }));
  }

  function logout() {
    sessionStorage.removeItem(KEY);
    window.location.href = './dashboard.html';
  }

  return { getUser, requireAuth, login, logout };
})();

// ── Sidebar ────────────────────────────────────────────────────────────────
function renderSidebar(activePage) {
  const user = Auth.getUser() || { name: 'Usuario', role: 'Admin' };
  const initials = user.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();

  const nav = [
    {
      section: 'Principal',
      items: [
        { id:'dashboard',    href:'./dashboard.html',       label:'Dashboard',
          icon:`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>` },
        { id:'productos',    href:'./productos.html',       label:'Productos',
          icon:`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><polyline points="16 3 12 7 8 3"/></svg>` },
        { id:'clientes',     href:'#',                      label:'Clientes',    disabled:true,
          icon:`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>` },
        { id:'proveedores',  href:'#',                      label:'Proveedores', disabled:true,
          icon:`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>` },
      ]
    },
    {
      section: 'Ventas',
      items: [
        { id:'nueva-venta',  href:'#',                      label:'Realizar venta', disabled:true,
          icon:`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>` },
        { id:'historial',    href:'./historial.html',       label:'Historial de ventas',
          icon:`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>` },
      ]
    },
    {
      section: 'Análisis',
      items: [
        { id:'reportes',     href:'#',                      label:'Reportes',    disabled:true,
          icon:`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>` },
      ]
    },
    {
      section: 'Sistema',
      items: [
        { id:'acerca',       href:'./acerca.html',          label:'Acerca del sistema',
          icon:`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>` },
      ]
    },
  ];

  const sectionHTML = nav.map(sec => {
    const items = sec.items.map(item => {
      const isActive = item.id === activePage || (activePage === 'nuevo-producto' && item.id === 'productos');
      const badge = item.disabled ? `<span class="nav-badge">próx.</span>` : '';
      return `<a href="${item.href}" class="nav-item${isActive ? ' active' : ''}${item.disabled ? ' disabled' : ''}" ${item.disabled ? 'onclick="return false"' : ''}>
        ${item.icon}
        ${item.label}
        ${badge}
      </a>`;
    }).join('');
    return `<span class="sb-section">${sec.section}</span>${items}`;
  }).join('');

  const html = `
    <div class="sb-brand">
      <div class="sb-logo">
        <div class="sb-logo-icon">M</div>
        <div>
          <div class="sb-logo-name">MYK</div>
          <div class="sb-logo-sub">Salsamentaria</div>
        </div>
      </div>
    </div>
    <nav class="sb-nav">${sectionHTML}</nav>
    <div class="sb-footer">
      <div class="sb-avatar">${initials}</div>
      <div>
        <div class="sb-uname">${user.name}</div>
        <div class="sb-urole">${user.role}</div>
      </div>
      <button onclick="Auth.logout()" title="Cerrar sesión"
        style="margin-left:auto;background:none;border:none;cursor:pointer;color:var(--sb-muted);padding:4px;"
        onmouseover="this.style.color='rgba(255,255,255,.7)'" onmouseout="this.style.color='var(--sb-muted)'">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
      </button>
    </div>`;

  const container = document.getElementById('sidebar');
  if (container) container.innerHTML = html;
}

// ── Toast notification ────────────────────────────────────────────────────
function showToast(msg, type = '') {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.className = `toast ${type}`;
  t.innerHTML = (type === 'success' ? '✓ ' : type === 'error' ? '✕ ' : '') + msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 3200);
}

// ── Helpers ────────────────────────────────────────────────────────────────
function statusBadge(status) {
  const map = {
    pagada:    ['badge-ok',   'Pagada'],
    pendiente: ['badge-warn', 'Pendiente'],
    anulada:   ['badge-muted','Anulada'],
    bajo:      ['badge-err',  'Bajo stock'],
    ok:        ['badge-ok',   'Disponible'],
  };
  const [cls, label] = map[status] || ['badge-muted', status];
  return `<span class="badge ${cls}">${label}</span>`;
}

function catDot(cat) {
  const cls = cat === 'Cárnicos' ? 'cat-carnico' : cat === 'Lácteos' ? 'cat-lacteo' : 'cat-otro';
  return `<span class="cat-dot ${cls}"></span>`;
}

function fmtDate(dateStr, timeStr) {
  const today = new Date().toISOString().slice(0,10);
  if (dateStr === today) return `Hoy · ${timeStr}`;
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getDate()} ${['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'][d.getMonth()]} · ${timeStr}`;
}

// ── Estilos extra para nav-item disabled ────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const style = document.createElement('style');
  style.textContent = `.nav-item.disabled { opacity:.42; cursor:not-allowed; }`;
  document.head.appendChild(style);
});
