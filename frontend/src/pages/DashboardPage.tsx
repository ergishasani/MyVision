import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { toast } from '../components/Toast';
import { DollarSign, FileText, AlertCircle, TrendingUp, Calendar, Eye, Send, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

interface DashboardData {
  summary: {
    totalRevenue: number;
    unpaidAmount: number;
    overdueAmount: number;
    totalVATAmount: number;
    vatExposure: number;
    totalSubtotal: number;
  };
  counts: {
    total: number;
    invoices: number;
    quotes: number;
    proformas: number;
    paid: number;
    unpaid: number;
    overdue: number;
  };
  statusCounts: {
    draft: number;
    sent: number;
    viewed: number;
    paid: number;
    overdue: number;
    cancelled: number;
  };
  recentDocuments: Array<{
    id: string;
    documentNumber: string;
    title: string;
    type: string;
    status: string;
    total: number;
    currency: string;
    createdAt: string;
    clientName: string | null;
  }>;
  revenueTrend: Array<{
    month: string;
    revenue: number;
  }>;
  period: string;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month' | 'year' | 'all'>('month');

  useEffect(() => {
    fetchDashboardData();
  }, [period]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/dashboard?period=${period}`);
      setData(response.data.data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-100 text-green-800';
      case 'SENT':
        return 'bg-blue-100 text-blue-800';
      case 'VIEWED':
        return 'bg-purple-100 text-purple-800';
      case 'OVERDUE':
        return 'bg-red-100 text-red-800';
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'INVOICE':
        return 'text-blue-600';
      case 'QUOTE':
        return 'text-green-600';
      case 'PROFORMA':
        return 'text-purple-600';
      default:
        return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8">
        <p className="text-gray-600">No data available</p>
      </div>
    );
  }

  const maxRevenue = Math.max(...data.revenueTrend.map(t => t.revenue), 1);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="flex gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as any)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="week">Last Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
            <option value="all">All Time</option>
          </select>
          <Link
            to="/documents/new"
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            New Document
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
              <p className="text-2xl font-bold text-green-600">
                €{data.summary.totalRevenue.toFixed(2)}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Unpaid Invoices</p>
              <p className="text-2xl font-bold text-orange-600">
                €{data.summary.unpaidAmount.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 mt-1">{data.counts.unpaid} invoices</p>
            </div>
            <div className="bg-orange-100 p-3 rounded-full">
              <FileText className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Overdue</p>
              <p className="text-2xl font-bold text-red-600">
                €{data.summary.overdueAmount.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 mt-1">{data.counts.overdue} invoices</p>
            </div>
            <div className="bg-red-100 p-3 rounded-full">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">VAT Exposure</p>
              <p className="text-2xl font-bold text-purple-600">
                €{data.summary.vatExposure.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Total VAT: €{data.summary.totalVATAmount.toFixed(2)}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Revenue Trend */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Revenue Trend</h2>
          <div className="space-y-4">
            {data.revenueTrend.map((item, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="w-20 text-sm text-gray-600">{item.month}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-4">
                      <div
                        className="bg-primary-600 h-4 rounded-full"
                        style={{ width: `${(item.revenue / maxRevenue) * 100}%` }}
                      />
                    </div>
                    <div className="w-24 text-right text-sm font-medium">
                      €{item.revenue.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Document Status */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Document Status</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Draft</span>
              <span className="font-semibold">{data.statusCounts.draft}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Sent</span>
              <span className="font-semibold">{data.statusCounts.sent}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Viewed</span>
              <span className="font-semibold">{data.statusCounts.viewed}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Paid</span>
              <span className="font-semibold text-green-600">{data.statusCounts.paid}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Overdue</span>
              <span className="font-semibold text-red-600">{data.statusCounts.overdue}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Cancelled</span>
              <span className="font-semibold">{data.statusCounts.cancelled}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Documents */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Recent Documents</h2>
          <Link to="/documents" className="text-primary-600 hover:text-primary-700 text-sm">
            View All
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Document</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Client</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Type</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Amount</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.recentDocuments.map((doc) => (
                <tr key={doc.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <Link
                      to={`/documents/${doc.id}`}
                      className="font-medium text-primary-600 hover:text-primary-700"
                    >
                      {doc.documentNumber}
                    </Link>
                    <p className="text-sm text-gray-500">{doc.title}</p>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {doc.clientName || '—'}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-sm font-medium ${getTypeColor(doc.type)}`}>
                      {doc.type}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(doc.status)}`}>
                      {doc.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-medium">
                    {doc.currency} {doc.total.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {format(new Date(doc.createdAt), 'MMM dd, yyyy')}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      to={`/documents/${doc.id}`}
                      className="text-primary-600 hover:text-primary-700 text-sm"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.recentDocuments.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No documents yet. <Link to="/documents/new" className="text-primary-600 hover:text-primary-700">Create your first document</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
