/**
 * Hook para consultar la API desde un componente (useState + useEffect).
 * - Cancela la petición anterior si cambian los parámetros o se desmonta el componente.
 * - Expone cargando, error, datos y una función recargar().
 * - Marca "lento" si la respuesta tarda más de 4 s (el servidor gratuito puede estar despertando).
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export default function useApi(funcion, dependencias = [], { inmediato = true } = {}) {
  const [estado, setEstado] = useState({ datos: null, cargando: inmediato, error: null, lento: false });
  const [version, setVersion] = useState(0);
  const funcionRef = useRef(funcion);
  funcionRef.current = funcion;

  useEffect(() => {
    if (!inmediato && version === 0) return undefined;
    const controlador = new AbortController();
    const temporizador = setTimeout(() => setEstado((e) => ({ ...e, lento: true })), 4000);
    setEstado((e) => ({ ...e, cargando: true, error: null }));

    funcionRef.current({ signal: controlador.signal })
      .then((datos) => setEstado({ datos, cargando: false, error: null, lento: false }))
      .catch((error) => {
        if (controlador.signal.aborted) return;
        setEstado((e) => ({ ...e, cargando: false, error, lento: false }));
      })
      .finally(() => clearTimeout(temporizador));

    return () => {
      controlador.abort();
      clearTimeout(temporizador);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencias, version]);

  const recargar = useCallback(() => setVersion((v) => v + 1), []);
  const setDatos = useCallback((fn) => setEstado((e) => ({ ...e, datos: typeof fn === 'function' ? fn(e.datos) : fn })), []);

  return { ...estado, recargar, setDatos };
}
