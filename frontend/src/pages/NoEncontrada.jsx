import { Link } from 'react-router-dom';
import { Vacio } from '../components/Comunes';

export default function NoEncontrada() {
  return (
    <Vacio titulo="Página no encontrada" texto="La dirección no existe o fue movida." icono="alerta">
      <Link to="/" className="btn btn-primary btn-sm">Volver al panel</Link>
    </Vacio>
  );
}
