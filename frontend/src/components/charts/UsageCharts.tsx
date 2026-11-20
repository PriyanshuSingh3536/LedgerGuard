import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import type { UsagePoint } from '../../types';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler);

export function TransactionsLine({ data }: { data: UsagePoint[] }) {
  return (
    <Line
      data={{
        labels: data.map((d) => d.date.slice(5)),
        datasets: [{
          label: 'Transactions',
          data: data.map((d) => d.transactions),
          borderColor: '#3b6cf6',
          backgroundColor: 'rgba(59,108,246,.15)',
          fill: true,
          tension: 0.3,
        }],
      }}
      options={{ responsive: true, plugins: { legend: { display: false } } }}
    />
  );
}

export function RevenueBar({ data }: { data: UsagePoint[] }) {
  return (
    <Bar
      data={{
        labels: data.map((d) => d.date.slice(5)),
        datasets: [{
          label: 'Amount (INR)',
          data: data.map((d) => d.amount / 100),
          backgroundColor: '#22a559',
        }],
      }}
      options={{ responsive: true, plugins: { legend: { display: false } } }}
    />
  );
}