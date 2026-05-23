# Salsamentaria MYK — Sistema de Gestión Web

Sistema de control de inventario y ventas para la Salsamentaria MYK, una tienda especializada en productos cárnicos, lácteos y artesanales ubicada en Neiva, Huila, Colombia.

Desarrollado como proyecto universitario con tecnologías web puras (sin frameworks ni backend), desplegable directamente en GitHub Pages.

---

## Demostración

**URL:** `https://TU-USUARIO.github.io/salsamentaria-myk/`

**Credenciales de acceso:**

| Campo | Valor |
|---|---|
| Usuario | `admin` |
| Contraseña | `admin123` |

---

## Características

- **Dashboard** con estadísticas del día (ventas, ingresos, productos en stock, alertas)
- **Gestión de productos** — crear, editar, eliminar con cálculo automático de margen de ganancia
- **Inventario** con alertas de bajo stock y filtrado por categoría
- **Historial de ventas** con filtros por estado (pagada, pendiente, anulada) y búsqueda por cliente o ticket
- **Gráfico de ventas** con periodos de 7, 30 y 90 días (Chart.js)
- **Exportación CSV** del inventario
- **Sesión de usuario** con autenticación básica
- **Diseño responsivo** con sidebar de navegación persistente
- **Persistencia local** — todos los datos se guardan en el navegador vía `localStorage`

---

## Tecnologías

| Capa | Tecnología |
|---|---|
| Marcado | HTML5 |
| Estilos | CSS3 con variables personalizadas |
| Lógica | JavaScript ES6+ (Vanilla, sin frameworks) |
| Gráficas | [Chart.js 4.4.0](https://www.chartjs.org/) via CDN |
| Fuentes | Google Fonts — Cormorant Garamond + DM Sans |
| Almacenamiento | `localStorage` + `sessionStorage` |
| Despliegue | GitHub Pages (sitio estático, sin servidor) |

---

## Estructura del proyecto

```
salsamentaria-myk/
├── index.html            # Página de login
├── dashboard.html        # Panel principal con estadísticas
├── productos.html        # Lista de inventario con búsqueda y filtros
├── nuevo-producto.html   # Formulario para crear o editar productos
├── historial.html        # Historial de ventas
├── acerca.html           # Información del sistema y glosario
├── css/
│   └── main.css          # Todos los estilos (diseño, componentes, responsive)
└── js/
    ├── data.js           # Modelo de datos y persistencia (localStorage)
    ├── app.js            # Autenticación, sidebar y utilidades globales
    ├── dashboard.js      # Lógica del panel principal y gráficas
    ├── productos.js      # Lista, paginación, búsqueda y exportación CSV
    ├── nuevo-producto.js # Formulario con cálculo de margen
    └── historial.js      # Historial con filtros y registro de ventas
```

---

## Modelo de datos

Los datos se almacenan en `localStorage` bajo las claves `myk_productos` y `myk_ventas`.

**Producto:**
```json
{
  "id": 1,
  "code": "CAR001",
  "name": "Chorizo Campesino",
  "cat": "Cárnicos",
  "pres": "500g",
  "unit": "paquete",
  "stock": 24,
  "min": 5,
  "buy": 8500,
  "sell": 12000,
  "provider": "Proveedor Principal",
  "desc": "Descripción del producto"
}
```

**Venta:**
```json
{
  "id": 1,
  "date": "2025-05-20",
  "time": "09:15",
  "client": "María García",
  "prods": "Chorizo Campesino x2",
  "qty": 2,
  "total": 24000,
  "status": "pagada"
}
```

---

## Instalación y uso local

No requiere instalación ni servidor. Basta con clonar el repositorio y abrir `index.html` en el navegador:

```bash
git clone https://github.com/TU-USUARIO/salsamentaria-myk.git
cd salsamentaria-myk
```

Luego abre `index.html` directamente en tu navegador, o usa la extensión **Live Server** de VS Code para una mejor experiencia de desarrollo.

---

## Despliegue en GitHub Pages

1. Sube el proyecto a un repositorio público en GitHub.
2. Ve a **Settings → Pages**.
3. En **Source**, selecciona branch `main` y carpeta `/ (root)`.
4. Guarda y espera 1-2 minutos.
5. Tu sitio estará disponible en `https://TU-USUARIO.github.io/salsamentaria-myk/`.

---

## Funcionalidades planeadas

- Gestión de clientes
- Gestión de proveedores
- Punto de venta (registro de ventas en tiempo real)
- Reportes avanzados con exportación a PDF

---

## Capturas de pantalla

> Agrega aquí imágenes del sistema una vez desplegado.

---

## Autor

Desarrollado por **Bryan** como proyecto universitario — Universidad Iberoamericana, 2025.
