import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, ShoppingCart, DollarSign, TrendingUp, TrendingDown, 
  Calendar, User, Package, CheckCircle, XCircle, Clock,
  AlertTriangle, Download, Printer, CreditCard, Truck,
  BarChart3, ArrowRight, RefreshCw, Eye
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Badge } from '../../components/UI/Badge';
import { purchasesAPI } from '../../lib/api';
import { PurchaseDashboardStats, Purchase } from '../../types';
import { formatCurrency, formatDate } from '../../utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import toast from 'react-hot-toast';

export const PurchaseDashboard: React.FC = () => {
  const [stats, setStats] = useState<PurchaseDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'today' | 'week' | 'month' | 'year'>('month');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await purchasesAPI.getDashboard();
      setStats(response.data.data);
    } catch (error) {
      console.error('Failed to fetch purchases dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchDashboardData();
    toast.success('Dashboard data refreshed');
  };

  // Prepare chart data
  const getStatusData = () => {
    if (!stats) return [];
    
    return [
      { name: 'Draft', value: stats.statusCounts.draft, color: '#6B7280' },
      { name: 'Pending', value: stats.statusCounts.pending, color: '#F59E0B' },
      { name: 'Approved', value: stats.statusCounts.approved, color: '#3B82F6' },
      { name: 'Ordered', value: stats.statusCounts.ordered, color: '#8B5CF6' },
      { name: 'Partially Received', value: stats.statusCounts.partially_received, color: '#F59E0B' },
      { name: 'Received', value: stats.statusCounts.received, color: '#10B981' },
      { name: 'Cancelled', value: stats.statusCounts.cancelled, color: '#EF4444' }
    ];
  };

  const getPaymentStatusData = () => {
    if (!stats) return [];
    
    return [
      { name: 'Paid', value: stats.paymentStatusCounts.paid, color: '#10B981' },
      { name: 'Partially Paid', value: stats.paymentStatusCounts.partially_paid, color: '#F59E0B' },
      { name: 'Unpaid', value: stats.paymentStatusCounts.unpaid, color: '#6B7280' }
    ];
  };

  const getTimeframeData = () => {
    if (!stats) return [];
    
    switch (timeframe) {
      case 'today':
        return [{ name: 'Today', purchases: stats.counts.today, amount: stats.amounts.today }];
      case 'week':
        return [{ name: 'This Week', purchases: stats.counts.week, amount: stats.amounts.week }];
      case 'month':
        return stats.purchasesByMonth.slice(-1);
      case 'year':
      default:
        return stats.purchasesByMonth;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="default" className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Draft
        </Badge>;
      case 'pending':
        return <Badge variant="warning" className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Pending
        </Badge>;
      case 'approved':
        return <Badge variant="info" className="flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          Approved
        </Badge>;
      case 'ordered':
        return <Badge variant="info" className="flex items-center gap-1">
          <Truck className="w-3 h-3" />
          Ordered
        </Badge>;
      case 'partially_received':
        return <Badge variant="warning" className="flex items-center gap-1">
          <TrendingDown className="w-3 h-3" />
          Partially Received
        </Badge>;
      case 'received':
        return <Badge variant="success" className="flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          Received
        </Badge>;
      case 'cancelled':
        return <Badge variant="danger" className="flex items-center gap-1">
          <XCircle className="w-3 h-3" />
          Cancelled
        </Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="success" className="flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          Paid
        </Badge>;
      case 'partially_paid':
        return <Badge variant="warning" className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Partially Paid
        </Badge>;
      case 'unpaid':
        return <Badge variant="default" className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Unpaid
        </Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchases Dashboard</h1>
          <p className="text-gray-600">Overview of your purchase orders and procurement metrics</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Link to="/purchases/new">
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              New Purchase
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Purchases</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.counts.total || 0}</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600">
                    {stats?.counts.month || 0}
                  </span>
                  <span className="text-sm text-gray-500 ml-1">this month</span>
                </div>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <ShoppingCart className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Spent</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats?.amounts.total || 0)}</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600">
                    {formatCurrency(stats?.amounts.month || 0)}
                  </span>
                  <span className="text-sm text-gray-500 ml-1">this month</span>
                </div>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Paid Amount</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(stats?.amounts.paid || 0)}</p>
                <div className="flex items-center mt-1">
                  <span className="text-sm text-gray-600">
                    {((stats?.amounts.paid || 0) / (stats?.amounts.total || 1) * 100).toFixed(1)}% of total
                  </span>
                </div>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Unpaid Amount</p>
                <p className="text-2xl font-bold text-yellow-600">{formatCurrency(stats?.amounts.unpaid || 0)}</p>
                <div className="flex items-center mt-1">
                  <span className="text-sm text-gray-600">
                    {((stats?.amounts.unpaid || 0) / (stats?.amounts.total || 1) * 100).toFixed(1)}% of total
                  </span>
                </div>
              </div>
              <div className="p-3 rounded-full bg-yellow-100">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link to="/purchases/new">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="p-3 rounded-lg bg-blue-500">
                    <Plus className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">Create Purchase</h3>
                    <p className="text-sm text-gray-600 mt-1">Create a new purchase order</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
          
          <Link to="/purchases?status=pending">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="p-3 rounded-lg bg-yellow-500">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">Pending Approvals</h3>
                    <p className="text-sm text-gray-600 mt-1">View pending purchase orders</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
          
          <Link to="/purchases?status=ordered">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="p-3 rounded-lg bg-green-500">
                    <Truck className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">Ordered Items</h3>
                    <p className="text-sm text-gray-600 mt-1">View orders awaiting delivery</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
          
          <Link to="/reports/purchases">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="p-3 rounded-lg bg-purple-500">
                    <BarChart3 className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">Purchase Reports</h3>
                    <p className="text-sm text-gray-600 mt-1">View detailed purchase reports</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Purchases Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Monthly Purchases</CardTitle>
              <div className="flex items-center space-x-2">
                <Button 
                  variant={timeframe === 'month' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setTimeframe('month')}
                >
                  Month
                </Button>
                <Button 
                  variant={timeframe === 'year' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setTimeframe('year')}
                >
                  Year
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={getTimeframeData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" orientation="left" stroke="#3B82F6" />
                  <YAxis yAxisId="right" orientation="right" stroke="#10B981" />
                  <Tooltip formatter={(value) => typeof value === 'number' ? 
                    value.toString().includes('.') ? formatCurrency(value) : value : value} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="count" name="Number of Purchases" fill="#3B82F6" />
                  <Bar yAxisId="right" dataKey="total" name="Amount Spent" fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Purchase Distribution</CardTitle>
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setTimeframe(prev => prev === 'today' ? 'month' : 'today')}
                >
                  {timeframe === 'today' ? 'Show Monthly' : 'Show Today'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 h-80">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-4 text-center">Status Distribution</h4>
                <ResponsiveContainer width="100%" height="90%">
                  <PieChart>
                    <Pie
                      data={getStatusData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {getStatusData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [value, 'Count']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-4 text-center">Payment Status</h4>
                <ResponsiveContainer width="100%" height="90%">
                  <PieChart>
                    <Pie
                      data={getPaymentStatusData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {getPaymentStatusData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [value, 'Count']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Suppliers and Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Suppliers */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <Truck className="w-5 h-5 mr-2" />
                Top Suppliers
              </CardTitle>
              <Link to="/suppliers">
                <Button variant="ghost" size="sm">
                  <Eye className="w-4 h-4 mr-2" />
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.topSuppliers && stats.topSuppliers.length > 0 ? (
                stats.topSuppliers.map((supplier, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Truck className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{supplier.supplierName}</p>
                        <p className="text-sm text-gray-500">{supplier.supplierEmail}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{formatCurrency(supplier.total)}</p>
                      <p className="text-sm text-gray-600">{supplier.count} orders</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Truck className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No supplier data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <Package className="w-5 h-5 mr-2" />
                Top Purchased Products
              </CardTitle>
              <Link to="/products">
                <Button variant="ghost" size="sm">
                  <Eye className="w-4 h-4 mr-2" />
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.topProducts && stats.topProducts.length > 0 ? (
                stats.topProducts.map((product, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {product.productImage ? (
                        <img
                          src={product.productImage.url}
                          alt={product.productName}
                          className="w-10 h-10 rounded object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                          <Package className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{product.productName}</p>
                        <p className="text-sm text-gray-500">{product.productSku}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{formatCurrency(product.total)}</p>
                      <p className="text-sm text-gray-600">{product.quantity} units purchased</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No product data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Purchases */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Recent Purchases
            </CardTitle>
            <Link to="/purchases">
              <Button variant="ghost" size="sm">
                <Eye className="w-4 h-4 mr-2" />
                View All
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats?.recentPurchases && stats.recentPurchases.length > 0 ? (
              stats.recentPurchases.map((purchase: Purchase) => (
                <div key={purchase._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <ShoppingCart className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{purchase.purchaseOrderNumber}</p>
                      <p className="text-sm text-gray-500">
                        {typeof purchase.supplier === 'object' ? purchase.supplier.name : 'Unknown Supplier'}
                      </p>
                      <p className="text-xs text-gray-500">{formatDate(purchase.orderDate)}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <p className="font-medium text-gray-900">{formatCurrency(purchase.grandTotal)}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      {getStatusBadge(purchase.status)}
                      {getPaymentStatusBadge(purchase.paymentStatus)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No recent purchases</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};