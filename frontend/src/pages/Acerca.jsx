import { API_URL } from '../api/cliente';
import { EncabezadoPagina } from '../components/Comunes';

const TECNOLOGIAS = [
  ['Interfaz', 'React 19 · React Router · Context API · Hooks · Vite'],
  ['Comunicación', 'Axios con interceptores (token JWT y manejo de errores)'],
  ['API', 'Node.js · Express 5 · REST · documentación Swagger (OpenAPI 3)'],
  ['Datos', 'Knex · PostgreSQL (producción) · SQLite (desarrollo)'],
  ['Seguridad', 'JWT · contraseñas con bcrypt · roles · Helmet · CORS · límite de intentos'],
  ['Calidad', 'Pruebas con node:test, Supertest, Vitest y Testing Library'],
  ['Despliegue', 'GitHub Pages (interfaz) · Render (API) · Neon (base de datos)'],
];

export default function Acerca() {
  const docs = API_URL.replace(/\/api\/?$/, '/api/docs');
  return (
    <>
      <EncabezadoPagina titulo="Acerca del sistema" subtitulo="MYK – Control de Ventas e Inventario · versión 2.0" />
      <div className="about-hero mb-24">
        <div className="about-hero-text">
          <h2>Salsamentaria MYK, <em>bajo control.</em></h2>
          <p>Aplicación web para registrar ventas, controlar el inventario por lotes y vencimientos, gestionar clientes y proveedores y consultar reportes del negocio.</p>
        </div>
        <div className="about-hero-mark">M</div>
      </div>
      <div className="grid-2 mb-24">
        <section className="about-card">
          <h3>Tecnologías</h3>
          {TECNOLOGIAS.map(([k, v]) => <div key={k} className="tech-row"><span className="tech-label">{k}</span><span>{v}</span></div>)}
        </section>
        <section className="about-card">
          <h3>Glosario</h3>
          <ul>
            <li><strong>FEFO</strong>: <em>First Expired, First Out</em>. Primero sale el lote que vence primero.</li>
            <li><strong>Lote</strong>: unidades de un producto que ingresaron juntas, con la misma fecha de vencimiento.</li>
            <li><strong>Stock mínimo</strong>: cantidad a partir de la cual el sistema alerta para reponer.</li>
            <li><strong>Crédito (fiado)</strong>: venta pendiente de pago que se salda con abonos.</li>
            <li><strong>Anulación</strong>: reversa una venta y devuelve las unidades a sus lotes.</li>
          </ul>
          <h3 style={{ marginTop: 18 }}>Enlaces</h3>
          <ul>
            <li><a href={docs} target="_blank" rel="noreferrer">Documentación de la API (Swagger)</a></li>
            <li><a href="https://github.com/bryanstithquintero/salsamentaria-myk" target="_blank" rel="noreferrer">Repositorio en GitHub</a></li>
          </ul>
        </section>
      </div>
      <p className="text-muted" style={{ fontSize: 12.5 }}>Desarrollado por Bryan Stith Quintero Guacary · Ingeniería de Software · Corporación Universitaria Iberoamericana, 2026.</p>
    </>
  );
}
