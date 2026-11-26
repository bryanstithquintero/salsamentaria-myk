/**
 * Gráfica de barras de ventas (Chart.js). Se registran solo los módulos necesarios
 * de Chart.js para reducir el tamaño del paquete.
 */
import { BarController, BarElement, CategoryScale, Chart, LinearScale, Tooltip } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { useMemo } from 'react';
import { fmtMoneda } from '../utils/formato';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

export default function GraficaVentas({ etiquetas, valores, color = '#AD7930' }) {
  const datos = useMemo(() => ({
    labels: etiquetas,
    datasets: [{
      data: valores,
      backgroundColor: valores.map((_, i) => (i === valores.length - 1 ? '#161614' : `${color}CC`)),
      borderRadius: 5,
      maxBarThickness: 38,
    }],
  }), [etiquetas, valores, color]);

  const opciones = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 350 },
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => fmtMoneda(c.parsed.y) } } },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#7A7670', font: { size: 11 }, maxRotation: 0, autoSkipPadding: 8 } },
      y: {
        grid: { color: '#ECE8E0' },
        border: { display: false },
        ticks: { color: '#7A7670', font: { size: 11 }, callback: (v) => (v >= 1000000 ? `$${(v / 1000000).toFixed(1)} M` : `$${Math.round(v / 1000)} mil`) },
      },
    },
  }), []);

  return <Bar data={datos} options={opciones} aria-label="Gráfica de ventas" role="img" />;
}
