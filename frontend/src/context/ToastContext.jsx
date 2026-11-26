/**
 * Notificaciones (toasts) globales con Context API + useReducer.
 */
import { createContext, useCallback, useContext, useMemo, useReducer } from 'react';

const ToastContext = createContext(null);

function reducer(estado, accion) {
  switch (accion.type) {
    case 'agregar':
      return [...estado.slice(-3), accion.toast]; // máximo 4 visibles
    case 'quitar':
      return estado.filter((t) => t.id !== accion.id);
    default:
      return estado;
  }
}

let siguienteId = 1;

export function ToastProvider({ children }) {
  const [toasts, dispatch] = useReducer(reducer, []);

  const notificar = useCallback((mensaje, tipo = 'info', duracion = 3800) => {
    const id = siguienteId++;
    dispatch({ type: 'agregar', toast: { id, mensaje, tipo } });
    setTimeout(() => dispatch({ type: 'quitar', id }), duracion);
  }, []);

  const valor = useMemo(() => ({
    exito: (m) => notificar(m, 'success'),
    error: (m) => notificar(m, 'error', 5500),
    info: (m) => notificar(m, 'info'),
  }), [notificar]);

  return (
    <ToastContext.Provider value={valor}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast-item ${t.tipo}`}>
            <span aria-hidden="true">{t.tipo === 'success' ? '✓' : t.tipo === 'error' ? '✕' : 'ℹ'}</span>
            {t.mensaje}
            <button type="button" aria-label="Cerrar" onClick={() => dispatch({ type: 'quitar', id: t.id })}>×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>');
  return ctx;
}
