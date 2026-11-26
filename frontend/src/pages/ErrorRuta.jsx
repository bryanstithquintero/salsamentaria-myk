import { Link, useRouteError } from 'react-router-dom';

/** Se muestra si una página falla al cargar o al renderizar (límite de error del enrutador). */
export default function ErrorRuta() {
  const error = useRouteError();
  console.error(error);
  return (
    <div className="pantalla-error" role="alert">
      <h1>Algo salió mal</h1>
      <p>La página no se pudo mostrar. Si el problema continúa, recargue la aplicación.</p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        <button type="button" className="btn btn-outline" onClick={() => window.location.reload()}>Recargar</button>
        <Link to="/" className="btn btn-primary">Ir al panel</Link>
      </div>
    </div>
  );
}
