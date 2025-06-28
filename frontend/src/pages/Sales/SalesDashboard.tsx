import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, FileText, DollarSign, TrendingUp, TrendingDown, 
  Calendar, User, Package, CheckCircle, XCircle, Clock,
  AlertTriangle, Download, Printer, CreditCard, Truck,
  BarChart3, ArrowRight, RefreshCw, ShoppingBag, Eye
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Badge } from '../../components/UI/Badge';
import { salesAPI } from '../../lib/api';
import { SalesDashboardStats, Sale } from '../../types';
import { formatCurrency, formatDate } from '../../utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import toast from 'react-hot-toast';

export const SalesDashboard: React.FC = () => {
  const [stats, setStats] = useState<SalesDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'today' | 'week' | 'month' | 'year'>('month');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await salesAPI.getDashboard();
      setStats(response.data.data);
    } catch (error) {
      console.error('Failed to fetch sales dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchDashboardData();
    toast.success('Dashboard data refreshed');
  };

  const handleCheckOverdue = async () => {
    try {
      const response = await salesAPI.checkOverdueInvoices();
      toast.success(response.data.message);
      fetchDashboardData();
    } catch (error) {
      toast.error('Failed to check overdue invoices');
    }
  };

  // Prepare chart data
  const getStatusData = () => {
    if (!stats) return [];
    
    return [
      { name: 'Draft', value: stats.statusCounts.draft, color: '#6B7280' },
      { name: 'Confirmed', value: stats.statusCounts.confirmed, color: '#3B82F6' },
      { name: 'Shipped', value: stats.statusCounts.shipped, color: '#F59E0B' },
      { name: 'Delivered', value: stats.statusCounts.delivered, color: '#10B981' },
      { name: 'Cancelled', value: stats.statusCounts.cancelled, color: '#EF4444' },
      { name: 'Returned', value: stats.statusCounts.returned, color: '#8B5CF6' }
    ];
  };

  const getPaymentStatusData = () => {
    if (!stats) return [];
    
    return [
      { name: 'Paid', value: stats.paymentStatusCounts.paid, color: '#10B981' },
      { name: 'Partially Paid', value: stats.paymentStatusCounts.partially_paid, color: '#F59E0B' },
      { name: 'Unpaid', value: stats.paymentStatusCounts.unpaid, color: '#6B7280' },
      { name: 'Overdue', value: stats.paymentStatusCounts.overdue, color: '#EF4444' }
    ];
  };

  const getTimeframeData = () => {
    if (!stats) return [];
    
    switch (timeframe) {
      case 'today':
        return [{ name: 'Today', sales: stats.counts.today, amount: stats.amounts.today }];
      case 'week':
        return [{ name: 'This Week', sales: stats.counts.week, amount: stats.amounts.week }];
      case 'month':
        return stats.salesByMonth.slice(-1);
      case 'year':
      default:
        return stats.salesByMonth;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="default" className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Draft
        </Badge>;
      case 'confirmed':
        return <Badge variant="info" className="flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          Confirmed
        </Badge>;
      case 'shipped':
        return <Badge variant="warning" className="flex items-center gap-1">
          <Truck className="w-3 h-3" />
          Shipped
        </Badge>;
      case 'delivered':
        return <Badge variant="success" className="flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          Delivered
        </Badge>;
      case 'cancelled':
        return <Badge variant="danger" className="flex items-center gap-1">
          <XCircle className="w-3 h-3" />
          Cancelled
        </Badge>;
      case 'returned':
        return <Badge variant="danger" className="flex items-center gap-1">
          <TrendingDown className="w-3 h-3" />
          Returned
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
      case 'overdue':
        return <Badge variant="danger" className="flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Overdue
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
          <h1 className="text-2xl font-bold text-gray-900">Sales Dashboard</h1>
          <p className="text-gray-600">Overview of your sales performance and metrics</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleCheckOverdue}>
            <AlertTriangle className="w-4 h-4 mr-2" />
            Check Overdue
          </Button>
          <Link to="/sales/new">
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              New Sale
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
                <p className="text-sm font-medium text-gray-600">Total Sales</p>
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
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
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
          <Link to="/sales/new">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="p-3 rounded-lg bg-blue-500">
                    <Plus className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">Create Sale</h3>
                    <p className="text-sm text-gray-600 mt-1">Create a new sales invoice</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
          
          <Link to="/sales?paymentStatus=overdue">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="p-3 rounded-lg bg-red-500">
                    <AlertTriangle className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">Overdue Invoices</h3>
                    <p className="text-sm text-gray-600 mt-1">View and manage overdue payments</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
          
          <Link to="/sales?status=confirmed">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="p-3 rounded-lg bg-green-500">
                    <Truck className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">Pending Shipments</h3>
                    <p className="text-sm text-gray-600 mt-1">View orders ready to ship</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
          
          <Link to="/reports/sales">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="p-3 rounded-lg bg-purple-500">
                    <BarChart3 className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">Sales Reports</h3>
                    <p className="text-sm text-gray-600 mt-1">View detailed sales reports</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Sales Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Monthly Sales</CardTitle>
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
                  <Bar yAxisId="left" dataKey="count" name="Number of Sales" fill="#3B82F6" />
                  <Bar yAxisId="right" dataKey="total" name="Revenue" fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Sales Distribution</CardTitle>
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

      {/* Top Customers and Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Customers */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <User className="w-5 h-5 mr-2" />
                Top Customers
              </CardTitle>
              <Link to="/customers">
                <Button variant="ghost" size="sm">
                  <Eye className="w-4 h-4 mr-2" />
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.topCustomers && stats.topCustomers.length > 0 ? (
                stats.topCustomers.map((customer, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        {customer.customerType === 'business' ? (
                          <ShoppingBag className="w-5 h-5 text-blue-600" />
                        ) : (
                          <User className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{customer.customerName}</p>
                        <p className="text-sm text-gray-500">{customer.customerEmail}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{formatCurrency(customer.total)}</p>
                      <p className="text-sm text-gray-600">{customer.count} orders</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <User className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No customer data available</p>
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
                Top Products
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
                      <p className="text-sm text-gray-600">{product.quantity} units sold</p>
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

      {/* Recent Sales */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Recent Sales
            </CardTitle>
            <Link to="/sales">
              <Button variant="ghost" size="sm">
                <Eye className="w-4 h-4 mr-2" />
                View All
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats?.recentSales && stats.recentSales.length > 0 ? (
              stats.recentSales.map((sale: Sale) => (
                <div key={sale._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{sale.invoiceNumber}</p>
                      <p className="text-sm text-gray-500">
                        {typeof sale.customer === 'object' ? sale.customer.name : 'Unknown Customer'}
                      </p>
                      <p className="text-xs text-gray-500">{formatDate(sale.saleDate)}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <p className="font-medium text-gray-900">{formatCurrency(sale.grandTotal)}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      {getStatusBadge(sale.status)}
                      {getPaymentStatusBadge(sale.paymentStatus)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No recent sales</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};