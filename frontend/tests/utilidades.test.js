import { describe, expect, test } from 'vitest';
import { fmtMoneda, iniciales, sumarDias } from '../src/utils/formato';
import { filasAProductos, parsearCsv } from '../src/utils/csv';

describe('formato', () => {
  test('moneda colombiana sin decimales', () => {
    expect(fmtMoneda(482500)).toMatch(/482\.500/);
  });
  test('suma días entre meses', () => {
    expect(sumarDias('2026-11-30', 1)).toBe('2026-12-01');
  });
  test('iniciales del usuario', () => {
    expect(iniciales('Bryan Quintero')).toBe('BQ');
  });
});

describe('lectura de CSV para importar productos', () => {
  test('separador punto y coma, comillas y tildes en el encabezado', () => {
    const csv = '﻿Código;Nombre;Categoría;Presentación;Precio compra\r\nCHO-020;"Chorizo ""especial""";Cárnicos;500 g;4.800\r\n';
    const filas = parsearCsv(csv);
    expect(filas).toHaveLength(1);
    expect(filas[0].nombre).toBe('Chorizo "especial"');
    const [p] = filasAProductos(filas);
    expect(p).toMatchObject({ codigo: 'CHO-020', categoria: 'Cárnicos', precio_compra: 4800, margen: 30 });
  });
});
