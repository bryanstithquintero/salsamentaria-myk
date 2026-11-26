/**
 * Cliente HTTP con Axios.
 * - baseURL tomada de la variable de entorno VITE_API_URL.
 * - Interceptor de solicitud: agrega el token JWT a cada petición.
 * - Interceptor de respuesta: normaliza los errores y cierra la sesión si el token expiró.
 */
import axios from 'axios';

// En desarrollo apunta a la API local; en producción, a la API publicada en Render.
// Se puede cambiar con la variable de entorno VITE_API_URL (archivo .env.local).
export const API_URL = import.meta.env.VITE_API_URL
  || (import.meta.env.PROD ? 'https://myk-api-8twu.onrender.com/api' : 'http://localhost:4000/api');
const CLAVE_TOKEN = 'myk_token';

export const almacenToken = {
  leer: () => localStorage.getItem(CLAVE_TOKEN),
  guardar: (t) => localStorage.setItem(CLAVE_TOKEN, t),
  borrar: () => localStorage.removeItem(CLAVE_TOKEN),
};

const api = axios.create({
  baseURL: API_URL,
  timeout: 70000, // el plan gratuito del servidor puede tardar hasta un minuto en "despertar"
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = almacenToken.leer();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/** Funciones que se ejecutan cuando la sesión deja de ser válida (las registra AuthContext). */
const alExpirar = new Set();
export const suscribirExpiracion = (fn) => {
  alExpirar.add(fn);
  return () => alExpirar.delete(fn);
};

/** Error de la API con un mensaje listo para mostrar al usuario. */
export class ErrorApi extends Error {
  constructor({ status, codigo, mensaje, detalles }) {
    super(mensaje);
    this.status = status;
    this.codigo = codigo;
    this.detalles = detalles || [];
  }

  /** Convierte los detalles de validación en { campo: mensaje } para los formularios. */
  get porCampo() {
    return Object.fromEntries(this.detalles.filter((d) => d.campo).map((d) => [d.campo, d.mensaje]));
  }
}

api.interceptors.response.use(
  (respuesta) => respuesta,
  (error) => {
    if (axios.isCancel(error)) return Promise.reject(error);
    if (!error.response) {
      const mensaje = error.code === 'ECONNABORTED'
        ? 'El servidor tardó demasiado en responder. Intente de nuevo.'
        : 'No hay conexión con el servidor. Verifique su conexión a internet.';
      return Promise.reject(new ErrorApi({ status: 0, codigo: 'SIN_CONEXION', mensaje }));
    }
    const { status, data } = error.response;
    const cuerpo = data?.error || {};
    if (status === 401 && error.config?.url !== '/auth/login') {
      alExpirar.forEach((fn) => fn(cuerpo.mensaje));
    }
    return Promise.reject(new ErrorApi({
      status,
      codigo: cuerpo.codigo || 'ERROR',
      mensaje: cuerpo.mensaje || 'Ocurrió un error inesperado',
      detalles: cuerpo.detalles,
    }));
  },
);

export default api;
