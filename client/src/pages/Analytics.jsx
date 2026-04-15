import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend,
  ArcElement, PointElement, LineElement, Filler
} from 'chart.js';
import { Bar, Pie, Line, Doughnut } from 'react-chartjs-2';
import { BarChart3, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import { useFetch } from '../hooks/useApi';
import LoadingSpinner from '../components/LoadingSpinner';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend,
  ArcElement, PointElement, LineElement, Filler
);

const CHART_COLORS = [
  'rgba(59, 130, 246, 0.8)',   // blue
  'rgba(249, 115, 22, 0.8)',   // orange
  'rgba(34, 197, 94, 0.8)',    // green
  'rgba(239, 68, 68, 0.8)',    // red
  'rgba(168, 85, 247, 0.8)',   // purple
  'rgba(234, 179, 8, 0.8)',    // yellow
  'rgba(20, 184, 166, 0.8)',   // teal
  'rgba(236, 72, 153, 0.8)',   // pink
];

const CHART_BORDERS = CHART_COLORS.map(c => c.replace('0.8', '1'));

const chartOptions = (title) => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true, font: { size: 11 } } },
    title: { display: false },
    tooltip: { backgroundColor: '#1a2847', titleFont: { size: 12 }, bodyFont: { size: 11 }, padding: 10, cornerRadius: 8 },
  },
  scales: title ? {
    y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 11 } }, grid: { color: 'rgba(0,0,0,0.05)' } },
    x: { ticks: { font: { size: 11 } }, grid: { display: false } },
  } : undefined,
});

export default function Analytics() {
  const { data, loading, error } = useFetch('/api/complaints/analytics');

  if (loading) return <LoadingSpinner message="Loading analytics..." />;
  if (error) return <div className="text-center py-16 text-red-600">{error}</div>;
  if (!data) return null;

  const { byProduct, byIssueType, bySource, bySeverity, byMonth, byLot, totalOpen, totalAll, totalResolved, avgResolutionDays } = data;

  // Product pie chart
  const productData = {
    labels: byProduct.map(p => `${p.product_sku || ''} ${p.product_name || 'Unknown Product'}`.trim()),
    datasets: [{
      data: byProduct.map(p => p.count),
      backgroundColor: CHART_COLORS.slice(0, byProduct.length),
      borderColor: CHART_BORDERS.slice(0, byProduct.length),
      borderWidth: 2,
    }],
  };

  // Issue type bar chart
  const issueData = {
    labels: byIssueType.map(i => i.issue_type || 'Unspecified'),
    datasets: [{
      label: 'Complaints',
      data: byIssueType.map(i => i.count),
      backgroundColor: CHART_COLORS[0],
      borderColor: CHART_BORDERS[0],
      borderWidth: 1,
      borderRadius: 6,
    }],
  };

  // Source bar chart
  const sourceData = {
    labels: bySource.map(s => s.source || 'Unknown'),
    datasets: [{
      label: 'Complaints',
      data: bySource.map(s => s.count),
      backgroundColor: CHART_COLORS[4],
      borderColor: CHART_BORDERS[4],
      borderWidth: 1,
      borderRadius: 6,
    }],
  };

  // Monthly trend line
  const trendData = {
    labels: byMonth.map(m => {
      const [y, mo] = m.month.split('-');
      return new Date(y, mo - 1).toLocaleString('default', { month: 'short', year: '2-digit' });
    }),
    datasets: [{
      label: 'Complaints',
      data: byMonth.map(m => m.count),
      borderColor: 'rgba(59, 130, 246, 1)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      fill: true,
      tension: 0.3,
      pointBackgroundColor: 'rgba(59, 130, 246, 1)',
      pointRadius: 4,
      pointHoverRadius: 6,
    }],
  };

  // Severity doughnut
  const severityColors = { low: 'rgba(156, 163, 175, 0.8)', medium: 'rgba(245, 158, 11, 0.8)', high: 'rgba(249, 115, 22, 0.8)', critical: 'rgba(239, 68, 68, 0.8)' };
  const severityData = {
    labels: bySeverity.map(s => s.severity.charAt(0).toUpperCase() + s.severity.slice(1)),
    datasets: [{
      data: bySeverity.map(s => s.count),
      backgroundColor: bySeverity.map(s => severityColors[s.severity] || severityColors.low),
      borderColor: bySeverity.map(s => (severityColors[s.severity] || severityColors.low).replace('0.8', '1')),
      borderWidth: 2,
    }],
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <p className="text-sm text-gray-500 font-medium">Quality Analytics</p>
        <h1 className="text-3xl font-bold text-gray-900">Complaint Analytics</h1>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Complaints', value: totalAll, icon: AlertCircle, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Open', value: totalOpen, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Resolved', value: totalResolved, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Avg Resolution (days)', value: avgResolutionDays ?? 'N/A', icon: BarChart3, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center gap-3">
              <div className={`${card.bg} p-2.5 rounded-lg`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <div>
                <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                <p className="text-xs text-gray-500">{card.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Monthly Trend */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Complaint Trend</h3>
          <div className="h-64">
            <Line data={trendData} options={chartOptions(true)} />
          </div>
        </div>

        {/* By Product */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Complaints by Product</h3>
          <div className="h-64">
            <Pie data={productData} options={chartOptions()} />
          </div>
        </div>

        {/* By Severity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Severity Distribution</h3>
          <div className="h-64">
            <Doughnut data={severityData} options={chartOptions()} />
          </div>
        </div>

        {/* By Issue Type */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Complaints by Issue Type</h3>
          <div className="h-64">
            <Bar data={issueData} options={chartOptions(true)} />
          </div>
        </div>

        {/* By Source */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Complaints by Source / Distributor</h3>
          <div className="h-64">
            <Bar data={sourceData} options={chartOptions(true)} />
          </div>
        </div>
      </div>

      {/* Lot Analysis Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Lot Analysis — Most Affected Lots</h3>
        {byLot.length === 0 ? (
          <p className="text-sm text-gray-400">No lot data available</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Lot Number</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Complaints</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Complaint IDs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {byLot.map(lot => (
                  <tr key={lot.lot_number} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono font-medium text-gray-900">{lot.lot_number}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{lot.product_sku} {lot.product_name}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        lot.count >= 3 ? 'bg-red-100 text-red-700' : lot.count >= 2 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {lot.count}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 font-mono">{lot.complaint_numbers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
