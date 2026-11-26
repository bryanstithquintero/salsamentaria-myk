/**
 * data.js — Datos compartidos de la Salsamentaria MYK
 * Simula la base de datos usando arrays en memoria + localStorage
 */

const MYK = (function () {

  // ── Productos ──────────────────────────────────────────────────────────
  const DEFAULT_PRODUCTS = [
    { id:1, code:'CHO-001', name:'Chorizo Santarrosano', cat:'Cárnicos', pres:'Paquete x 500 g', unit:'paquete', stock:3,  min:5,  buy:4200,  sell:5600,  provider:'Cárnicos del Huila S.A.', desc:'Chorizo artesanal de la región, empacado al vacío. Producto refrigerado.' },
    { id:2, code:'SAL-022', name:'Salchicha ranchera',   cat:'Cárnicos', pres:'Paquete x 6',     unit:'paquete', stock:2,  min:5,  buy:3800,  sell:5200,  provider:'Cárnicos del Huila S.A.', desc:'Salchicha de cerdo y res, lista para cocinar. Ideal para asados.' },
    { id:3, code:'QSO-014', name:'Queso campesino',      cat:'Lácteos',  pres:'Libra',            unit:'libra',   stock:4,  min:8,  buy:6500,  sell:9800,  provider:'Lácteos San Isidro',      desc:'Queso fresco artesanal, sabor suave y cremoso, sin conservantes.' },
    { id:4, code:'QSO-007', name:'Queso doble crema',    cat:'Lácteos',  pres:'250 g',            unit:'unidad',  stock:5,  min:10, buy:5400,  sell:7900,  provider:'Lácteos San Isidro',      desc:'Queso doble crema de alta calidad, suave y derretible.' },
    { id:5, code:'CHO-003', name:'Chorizo paisa',        cat:'Cárnicos', pres:'Paquete x 500 g',  unit:'paquete', stock:18, min:5,  buy:4100,  sell:5500,  provider:'Cárnicos del Huila S.A.', desc:'Chorizo paisa de primera selección, sabor ahumado característico.' },
    { id:6, code:'SAL-001', name:'Salchichón cervecero', cat:'Cárnicos', pres:'Libra',            unit:'libra',   stock:22, min:5,  buy:5900,  sell:7400,  provider:'Cárnicos del Huila S.A.', desc:'Salchichón de res y cerdo con especias seleccionadas.' },
    { id:7, code:'QSO-001', name:'Queso mozzarella',     cat:'Lácteos',  pres:'500 g',            unit:'unidad',  stock:14, min:5,  buy:7200,  sell:10500, provider:'Lácteos San Isidro',      desc:'Queso mozzarella fresco para pizzas, lasañas y gratinados.' },
    { id:8, code:'LCT-005', name:'Yogurt natural 1L',    cat:'Lácteos',  pres:'Botella 1L',       unit:'botella', stock:32, min:5,  buy:3400,  sell:4800,  provider:'Lácteos San Isidro',      desc:'Yogurt natural sin azúcar añadida, elaborado con leche entera.' },
    { id:9, code:'CHO-005', name:'Longaniza ahumada',    cat:'Cárnicos', pres:'Paquete x 500 g',  unit:'paquete', stock:12, min:5,  buy:4800,  sell:6200,  provider:'Cárnicos del Huila S.A.', desc:'Longaniza artesanal con proceso de ahumado tradicional.' },
    { id:10,code:'LCT-002', name:'Mantequilla casera',   cat:'Lácteos',  pres:'250 g',            unit:'unidad',  stock:8,  min:5,  buy:5200,  sell:7800,  provider:'Lácteos San Isidro',      desc:'Mantequilla de nata fresca, elaborada de forma artesanal.' },
    { id:11,code:'OTR-001', name:'Chicharrón prensado',  cat:'Otros',    pres:'Paquete 200 g',    unit:'paquete', stock:15, min:5,  buy:3200,  sell:4500,  provider:'Cárnicos del Huila S.A.', desc:'Chicharrón prensado tradicional, crujiente y sabroso.' },
  ];

  // ── Ventas ─────────────────────────────────────────────────────────────
  const DEFAULT_SALES = [
    { id:'V-0142', date:'2026-05-19', time:'11:24', client:'María L. Ortiz',        prods:'Chorizo Santarrosano',            qty:2, total:11200,  status:'pagada' },
    { id:'V-0141', date:'2026-05-19', time:'10:48', client:'Carlos Perdomo',         prods:'Queso campesino + Salchichón',    qty:3, total:28600,  status:'pagada' },
    { id:'V-0140', date:'2026-05-19', time:'09:02', client:'Cliente eventual',       prods:'Salchichón cervecero',            qty:1, total:7400,   status:'pagada' },
    { id:'V-0139', date:'2026-05-18', time:'17:30', client:'Ana Sofía Rojas',        prods:'Queso doble crema x2',            qty:2, total:15800,  status:'pagada' },
    { id:'V-0138', date:'2026-05-18', time:'14:12', client:'Restaurante La Cava',    prods:'Mix cárnicos surtido',            qty:8, total:92400,  status:'pagada' },
    { id:'V-0137', date:'2026-05-18', time:'11:00', client:'Cliente eventual',       prods:'Chorizo paisa',                   qty:4, total:22000,  status:'pagada' },
    { id:'V-0136', date:'2026-05-17', time:'19:24', client:'Jorge E. Lozano',        prods:'Yogurt natural 1L x3',            qty:3, total:14400,  status:'pagada' },
    { id:'V-0135', date:'2026-05-17', time:'16:50', client:'María L. Ortiz',         prods:'Queso mozzarella',                qty:1, total:10500,  status:'pendiente' },
    { id:'V-0134', date:'2026-05-17', time:'12:08', client:'Cliente eventual',       prods:'Salchicha ranchera',              qty:2, total:10400,  status:'pagada' },
    { id:'V-0133', date:'2026-05-16', time:'18:33', client:'Carlos Perdomo',         prods:'Queso campesino',                 qty:1, total:9800,   status:'pagada' },
    { id:'V-0132', date:'2026-05-16', time:'15:10', client:'Restaurante La Cava',    prods:'Longaniza ahumada x4',            qty:4, total:24800,  status:'pagada' },
    { id:'V-0131', date:'2026-05-15', time:'10:22', client:'Ana Sofía Rojas',        prods:'Mantequilla casera x2',           qty:2, total:15600,  status:'pagada' },
    { id:'V-0130', date:'2026-05-15', time:'08:45', client:'Jorge E. Lozano',        prods:'Chorizo Santarrosano',            qty:3, total:16800,  status:'pagada' },
    { id:'V-0129', date:'2026-05-14', time:'17:00', client:'Cliente eventual',       prods:'Chicharrón prensado x2',          qty:2, total:9000,   status:'anulada' },
    { id:'V-0128', date:'2026-05-14', time:'11:30', client:'María L. Ortiz',         prods:'Queso mozzarella + Mantequilla',  qty:2, total:18300,  status:'pagada' },
  ];

  // ── Persistencia en localStorage ──────────────────────────────────────
  function loadProducts() {
    try {
      const saved = localStorage.getItem('myk_products');
      return saved ? JSON.parse(saved) : DEFAULT_PRODUCTS;
    } catch { return DEFAULT_PRODUCTS; }
  }

  function saveProducts(list) {
    localStorage.setItem('myk_products', JSON.stringify(list));
  }

  function loadSales() {
    try {
      const saved = localStorage.getItem('myk_sales');
      return saved ? JSON.parse(saved) : DEFAULT_SALES;
    } catch { return DEFAULT_SALES; }
  }

  function saveSales(list) {
    localStorage.setItem('myk_sales', JSON.stringify(list));
  }

  // ── API pública ────────────────────────────────────────────────────────
  return {
    getProducts()         { return loadProducts(); },
    getSales()            { return loadSales(); },

    addProduct(p) {
      const list = loadProducts();
      p.id = Date.now();
      list.push(p);
      saveProducts(list);
      return p;
    },

    updateProduct(code, data) {
      const list = loadProducts();
      const idx = list.findIndex(p => p.code === code);
      if (idx === -1) return null;
      list[idx] = { ...list[idx], ...data };
      saveProducts(list);
      return list[idx];
    },

    deleteProduct(code) {
      const list = loadProducts().filter(p => p.code !== code);
      saveProducts(list);
    },

    getProduct(code) {
      return loadProducts().find(p => p.code === code) || null;
    },

    getLowStock() {
      return loadProducts().filter(p => p.stock <= p.min).sort((a,b) => a.stock - b.stock);
    },

    resetData() {
      localStorage.removeItem('myk_products');
      localStorage.removeItem('myk_sales');
    },

    // Datos del gráfico de ventas
    chartData: {
      '7d': {
        labels: ['13 may','14 may','15 may','16 may','17 may','18 may','Hoy'],
        values: [320000, 410000, 285000, 388000, 460000, 375000, 482500],
      },
      '30d': {
        labels: ['S1','S2','S3','S4'],
        values: [1820000, 2150000, 1960000, 2340000],
      },
      '90d': {
        labels: ['Mar','Abr','May'],
        values: [6200000, 7800000, 9100000],
      },
    },

    // Formato de moneda colombiana
    fmt(n) {
      return '$ ' + Number(n).toLocaleString('es-CO');
    },
  };
})();
