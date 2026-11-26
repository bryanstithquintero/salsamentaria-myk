import { useEffect, useState } from 'react';

/** Retrasa la actualización de un valor (p. ej. el texto de búsqueda) para no consultar la API en cada tecla. */
export default function useDebounce(valor, espera = 350) {
  const [retrasado, setRetrasado] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setRetrasado(valor), espera);
    return () => clearTimeout(t);
  }, [valor, espera]);
  return retrasado;
}
