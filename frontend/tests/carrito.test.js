import { describe, expect, test } from 'vitest';
import { carritoInicial, carritoReducer, totalCarrito, unidadesCarrito } from '../src/utils/carrito';

const queso = { id: 3, codigo: 'QSO-014', nombre: 'Queso campesino', presentacion: 'Libra', precio_venta: 9800, stock: 4 };
const chorizo = { id: 1, codigo: 'CHO-001', nombre: 'Chorizo', presentacion: '500 g', precio_venta: 5600, stock: 10 };

describe('carritoReducer (useReducer del punto de venta)', () => {
  test('agrega un producto y suma cantidades si ya está en el carrito', () => {
    let e = carritoReducer(carritoInicial, { type: 'agregar', producto: queso });
    e = carritoReducer(e, { type: 'agregar', producto: queso });
    expect(e.items).toHaveLength(1);
    expect(e.items[0].cantidad).toBe(2);
  });

  test('no permite superar las existencias disponibles', () => {
    let e = carritoReducer(carritoInicial, { type: 'agregar', producto: queso });
    e = carritoReducer(e, { type: 'cantidad', id: 3, cantidad: 99 });
    expect(e.items[0].cantidad).toBe(4);
    e = carritoReducer(e, { type: 'cantidad', id: 3, cantidad: 0 });
    expect(e.items[0].cantidad).toBe(1);
  });

  test('no agrega productos sin stock', () => {
    const e = carritoReducer(carritoInicial, { type: 'agregar', producto: { ...queso, stock: 0 } });
    expect(e.items).toHaveLength(0);
  });

  test('calcula total y unidades', () => {
    let e = carritoReducer(carritoInicial, { type: 'agregar', producto: queso });
    e = carritoReducer(e, { type: 'agregar', producto: chorizo });
    e = carritoReducer(e, { type: 'cantidad', id: 1, cantidad: 3 });
    expect(totalCarrito(e.items)).toBe(9800 + 3 * 5600);
    expect(unidadesCarrito(e.items)).toBe(4);
  });

  test('al quitar el cliente, una venta a crédito vuelve a efectivo', () => {
    let e = carritoReducer(carritoInicial, { type: 'cliente', cliente: { id: 1, nombre: 'María' } });
    e = carritoReducer(e, { type: 'medio', medio: 'credito' });
    e = carritoReducer(e, { type: 'cliente', cliente: null });
    expect(e.medio_pago).toBe('efectivo');
  });

  test('acción desconocida lanza error', () => {
    expect(() => carritoReducer(carritoInicial, { type: 'otra' })).toThrow();
  });
});
