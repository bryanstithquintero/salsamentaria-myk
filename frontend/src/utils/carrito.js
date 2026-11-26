/**
 * Estado del carrito del punto de venta, manejado con useReducer.
 * Es una función pura: recibe el estado actual y una acción, y devuelve el nuevo estado.
 */
export const carritoInicial = {
  items: [],
  cliente: null,
  medio_pago: 'efectivo',
  abono_inicial: 0,
  observacion: '',
};

export function carritoReducer(estado, accion) {
  switch (accion.type) {
    case 'agregar': {
      const p = accion.producto;
      const existe = estado.items.find((i) => i.producto_id === p.id);
      if (existe) {
        return {
          ...estado,
          items: estado.items.map((i) => (i.producto_id === p.id ? { ...i, cantidad: Math.min(i.cantidad + 1, i.stock) } : i)),
        };
      }
      if (p.stock <= 0) return estado;
      return {
        ...estado,
        items: [...estado.items, { producto_id: p.id, codigo: p.codigo, nombre: p.nombre, presentacion: p.presentacion, precio: p.precio_venta, stock: p.stock, cantidad: 1 }],
      };
    }
    case 'cantidad': {
      const cantidad = Math.floor(Number(accion.cantidad) || 0);
      return {
        ...estado,
        items: estado.items.map((i) => (i.producto_id === accion.id ? { ...i, cantidad: Math.max(1, Math.min(cantidad, i.stock)) } : i)),
      };
    }
    case 'quitar':
      return { ...estado, items: estado.items.filter((i) => i.producto_id !== accion.id) };
    case 'cliente':
      return { ...estado, cliente: accion.cliente, medio_pago: !accion.cliente && estado.medio_pago === 'credito' ? 'efectivo' : estado.medio_pago };
    case 'medio':
      return { ...estado, medio_pago: accion.medio, abono_inicial: accion.medio === 'credito' ? estado.abono_inicial : 0 };
    case 'abono':
      return { ...estado, abono_inicial: Math.max(0, Math.floor(Number(accion.valor) || 0)) };
    case 'observacion':
      return { ...estado, observacion: accion.texto };
    case 'limpiar':
      return carritoInicial;
    default:
      throw new Error(`Acción desconocida: ${accion.type}`);
  }
}

export const totalCarrito = (items) => items.reduce((s, i) => s + i.precio * i.cantidad, 0);
export const unidadesCarrito = (items) => items.reduce((s, i) => s + i.cantidad, 0);
