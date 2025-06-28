import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  BarChart3, FileText, Package, Users, Truck, DollarSign, 
  TrendingUp, TrendingDown, Calendar, Download, Printer,
  Clock, Filter, RefreshCw, ArrowRight, ChevronRight,
  AlertTriangle, CheckCircle, XCircle, ShoppingCart, 
  Activity, CreditCard, Search, Star, Layers
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Badge } from '../../components/UI/Badge';
import { reportsAPI } from '../../lib/api';
import { formatCurrency, formatDate } from '../../utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import toast from 'react-hot-toast';

export const ReportsDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await reportsAPI.getDashboardStats();
      setStats(response.data.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
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
  const inventoryData = stats ? [
    { name: 'In Stock', value: stats.totalProducts - stats.lowStockProducts - stats.outOfStockProducts, color: '#10B981' },
    { name: 'Low Stock', value: stats.lowStockProducts, color: '#F59E0B' },
    { name: 'Out of Stock', value: stats.outOfStockProducts, color: '#EF4444' }
  ] : [];

  const revenueData = [
    { month: 'Jan', revenue: 12000, profit: 3000 },
    { month: 'Feb', revenue: 15000, profit: 4500 },
    { month: 'Mar', revenue: 18000, profit: 5400 },
    { month: 'Apr', revenue: 22000, profit: 6600 },
    { month: 'May', revenue: 25000, profit: 7500 },
    { month: 'Jun', revenue: 28000, profit: 8400 }
  ];

  const reportTypes = [
    {
      title: 'Inventory Reports',
      description: 'Track stock levels, movements, and valuation',
      icon: <Package className="w-6 h-6 text-white" />,
      color: 'bg-blue-500',
      link: '/reports/inventory',
      reports: [
        { name: 'Current Inventory', link: '/reports/inventory' },
        { name: 'Stock Movements', link: '/reports/stock-movements' },
        { name: 'Low Stock Items', link: '/reports/inventory?status=low_stock' },
        { name: 'Inventory Valuation', link: '/reports/inventory?sortBy=stockValue' }
      ]
    },
    {
      title: 'Sales Reports',
      description: 'Analyze sales performance and trends',
      icon: <FileText className="w-6 h-6 text-white" />,
      color: 'bg-green-500',
      link: '/reports/sales',
      reports: [
        { name: 'Sales Summary', link: '/reports/sales' },
        { name: 'Sales by Customer', link: '/reports/sales?groupBy=customer' },
        { name: 'Sales by Product', link: '/reports/sales?groupBy=product' },
        { name: 'Payment Status', link: '/reports/sales?groupBy=payment' }
      ]
    },
    {
      title: 'Purchase Reports',
      description: 'Track purchase orders and supplier performance',
      icon: <ShoppingCart className="w-6 h-6 text-white" />,
      color: 'bg-purple-500',
      link: '/reports/purchases',
      reports: [
        { name: 'Purchase Summary', link: '/reports/purchases' },
        { name: 'Purchases by Supplier', link: '/reports/purchases?groupBy=supplier' },
        { name: 'Purchases by Product', link: '/reports/purchases?groupBy=product' },
        { name: 'Pending Orders', link: '/reports/purchases?status=pending' }
      ]
    },
    {
      title: 'Financial Reports',
      description: 'Monitor revenue, expenses, and profitability',
      icon: <DollarSign className="w-6 h-6 text-white" />,
      color: 'bg-yellow-500',
      link: '/reports/financial',
      reports: [
        { name: 'Profit & Loss', link: '/reports/financial' },
        { name: 'Revenue Analysis', link: '/reports/financial?period=month' },
        { name: 'Expense Analysis', link: '/reports/financial?includeExpenses=true' },
        { name: 'Tax Summary', link: '/reports/financial?groupBy=tax' }
      ]
    },
    {
      title: 'Customer Reports',
      description: 'Analyze customer behavior and performance',
      icon: <Users className="w-6 h-6 text-white" />,
      color: 'bg-indigo-500',
      link: '/reports/customer-analysis',
      reports: [
        { name: 'Customer Analysis', link: '/reports/customer-analysis' },
        { name: 'Top Customers', link: '/reports/customer-analysis?sortBy=revenue' },
        { name: 'Customer Segments', link: '/reports/customer-analysis?groupBy=group' },
        { name: 'Customer Lifetime Value', link: '/reports/customer-analysis?sortBy=clv' }
      ]
    },
    {
      title: 'Supplier Reports',
      description: 'Evaluate supplier performance and reliability',
      icon: <Truck className="w-6 h-6 text-white" />,
      color: 'bg-orange-500',
      link: '/reports/supplier-analysis',
      reports: [
        { name: 'Supplier Analysis', link: '/reports/supplier-analysis' },
        { name: 'Top Suppliers', link: '/reports/supplier-analysis?sortBy=amount' },
        { name: 'Delivery Performance', link: '/reports/supplier-analysis?sortBy=ontime' },
        { name: 'Supplier Ratings', link: '/reports/supplier-analysis?sortBy=rating' }
      ]
    },
    {
      title: 'Product Reports',
      description: 'Analyze product performance and profitability',
      icon: <Package className="w-6 h-6 text-white" />,
      color: 'bg-red-500',
      link: '/reports/product-performance',
      reports: [
        { name: 'Product Performance', link: '/reports/product-performance' },
        { name: 'Best Sellers', link: '/reports/product-performance?sortBy=sales' },
        { name: 'Most Profitable', link: '/reports/product-performance?sortBy=profit' },
        { name: 'Inventory Turnover', link: '/reports/product-performance?sortBy=turnover' }
      ]
    },
    {
      title: 'Activity Logs',
      description: 'Track user actions and system changes',
      icon: <Activity className="w-6 h-6 text-white" />,
      color: 'bg-gray-500',
      link: '/reports/activity-logs',
      reports: [
        { name: 'User Activity', link: '/reports/activity-logs' },
        { name: 'System Changes', link: '/reports/activity-logs?action=update' },
        { name: 'Login History', link: '/reports/activity-logs?action=login' },
        { name: 'Export History', link: '/reports/activity-logs?action=export' }
      ]
    }
  ];

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
          <h1 className="text-2xl font-bold text-gray-900">Reports Dashboard</h1>
          <p className="text-gray-600">Comprehensive analytics and insights for your business</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Inventory Value</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats?.inventoryValue || 0)}</p>
                <div className="flex items-center mt-1">
                  <span className="text-sm text-gray-600">
                    {stats?.totalProducts || 0} products
                  </span>
                </div>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats?.monthlyRevenue || 0)}</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600">
                    +12.5%
                  </span>
                  <span className="text-sm text-gray-500 ml-1">vs last month</span>
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
                <p className="text-sm font-medium text-gray-600">Monthly Profit</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(stats?.monthlyProfit || 0)}</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600">
                    +8.3%
                  </span>
                  <span className="text-sm text-gray-500 ml-1">vs last month</span>
                </div>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Orders</p>
                <p className="text-2xl font-bold text-yellow-600">{stats?.pendingPurchases || 0}</p>
                <div className="flex items-center mt-1">
                  <span className="text-sm text-gray-600">
                    Awaiting approval
                  </span>
                </div>
              </div>
              <div className="p-3 rounded-full bg-yellow-100">
                <ShoppingCart className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {reportTypes.map((reportType, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start space-x-4 mb-4">
                <div className={`p-3 rounded-lg ${reportType.color}`}>
                  {reportType.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{reportType.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{reportType.description}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                {reportType.reports.map((report, idx) => (
                  <Link key={idx} to={report.link} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors">
                    <span className="text-sm text-gray-700">{report.name}</span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </Link>
                ))}
              </div>
              
              <div className="mt-4 pt-4 border-t">
                <Link to={reportType.link}>
                  <Button variant="outline" size="sm" className="w-full">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    View All Reports
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inventory Status Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Package className="w-5 h-5 mr-2" />
              Inventory Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={inventoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {inventoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [value, 'Count']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-lg font-bold text-green-600">{stats?.totalProducts - stats?.lowStockProducts - stats?.outOfStockProducts || 0}</p>
                <p className="text-sm text-green-600">In Stock</p>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <p className="text-lg font-bold text-yellow-600">{stats?.lowStockProducts || 0}</p>
                <p className="text-sm text-yellow-600">Low Stock</p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <p className="text-lg font-bold text-red-600">{stats?.outOfStockProducts || 0}</p>
                <p className="text-sm text-red-600">Out of Stock</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue & Profit Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Revenue & Profit Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2} name="Revenue" />
                  <Line type="monotone" dataKey="profit" stroke="#10B981" strokeWidth={2} name="Profit" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-lg font-bold text-blue-600">{formatCurrency(stats?.monthlyRevenue || 0)}</p>
                <p className="text-sm text-blue-600">Monthly Revenue</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-lg font-bold text-green-600">{formatCurrency(stats?.monthlyProfit || 0)}</p>
                <p className="text-sm text-green-600">Monthly Profit</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Customer & Supplier Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-lg font-bold text-blue-600">{stats?.totalCustomers || 0}</p>
                <p className="text-sm text-blue-600">Total Customers</p>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <p className="text-lg font-bold text-purple-600">{stats?.totalSuppliers || 0}</p>
                <p className="text-sm text-purple-600">Total Suppliers</p>
              </div>
            </div>
            
            <div className="mt-4">
              <Link to="/reports/customer-analysis">
                <Button variant="outline" size="sm" className="w-full mb-2">
                  <Users className="w-4 h-4 mr-2" />
                  Customer Analysis
                </Button>
              </Link>
              <Link to="/reports/supplier-analysis">
                <Button variant="outline" size="sm" className="w-full">
                  <Truck className="w-4 h-4 mr-2" />
                  Supplier Analysis
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Package className="w-5 h-5 mr-2" />
              Inventory Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Inventory Value:</span>
                <span className="font-medium">{formatCurrency(stats?.inventoryValue || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Products:</span>
                <span className="font-medium">{stats?.totalProducts || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Low Stock Alert:</span>
                <Badge variant="warning">{stats?.lowStockProducts || 0} items</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Out of Stock:</span>
                <Badge variant="danger">{stats?.outOfStockProducts || 0} items</Badge>
              </div>
            </div>
            
            <div className="mt-4">
              <Link to="/reports/inventory">
                <Button variant="outline" size="sm" className="w-full">
                  <Package className="w-4 h-4 mr-2" />
                  Inventory Report
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Sales & Purchases
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Recent Sales:</span>
                <span className="font-medium">{stats?.recentSales || 0} orders</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Pending Purchases:</span>
                <span className="font-medium">{stats?.pendingPurchases || 0} orders</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Monthly Revenue:</span>
                <span className="font-medium">{formatCurrency(stats?.monthlyRevenue || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Profit Margin:</span>
                <span className="font-medium">
                  {stats?.monthlyRevenue ? 
                    ((stats.monthlyProfit / stats.monthlyRevenue) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
            
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link to="/reports/sales">
                <Button variant="outline" size="sm" className="w-full">
                  <FileText className="w-4 h-4 mr-2" />
                  Sales Report
                </Button>
              </Link>
              <Link to="/reports/purchases">
                <Button variant="outline" size="sm" className="w-full">
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Purchase Report
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};