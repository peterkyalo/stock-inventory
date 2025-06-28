import React, { useEffect, useState } from 'react';
import {
  Package,
  AlertTriangle,
  XCircle,
  Users,
  Truck,
  ShoppingCart,
  FileText,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/UI/Card';
import { Badge } from '../components/UI/Badge';
import { Button } from '../components/UI/Button';
import { reportsAPI } from '../lib/api';
import { DashboardStats } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { formatCurrency, formatDate } from '../utils';
import { Link } from 'react-router-dom';

const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: { value: number; isPositive: boolean };
  color: string;
  href?: string;
}> = ({ title, value, icon, trend, color, href }) => {
  const CardWrapper = href ? Link : 'div';
  
  return (
    <CardWrapper to={href || ''} className={href ? 'block' : ''}>
      <Card className={href ? 'hover:shadow-md transition-shadow cursor-pointer' : ''}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">{title}</p>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              {trend && (
                <div className="flex items-center mt-1">
                  {trend.isPositive ? (
                    <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                  )}
                  <span className={`text-sm ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                    {trend.value}%
                  </span>
                  <span className="text-sm text-gray-500 ml-1">vs last month</span>
                </div>
              )}
            </div>
            <div className={`p-3 rounded-full ${color}`}>
              {icon}
            </div>
          </div>
        </CardContent>
      </Card>
    </CardWrapper>
  );
};

const QuickActionCard: React.FC<{
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color: string;
}> = ({ title, description, icon, href, color }) => (
  <Link to={href}>
    <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
      <CardContent className="p-6">
        <div className="flex items-start space-x-4">
          <div className={`p-3 rounded-lg ${color}`}>
            {icon}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600 mt-1">{description}</p>
            <div className="flex items-center mt-3 text-blue-600">
              <span className="text-sm font-medium">Get started</span>
              <ArrowUpRight className="w-4 h-4 ml-1" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </Link>
);

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [recentSales, setRecentSales] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch all dashboard data
        const [statsResponse, activityResponse, lowStockResponse, salesResponse] = await Promise.allSettled([
          reportsAPI.getDashboardStats(),
          // Mock recent activity for now
          Promise.resolve({ data: { data: [] } }),
          // Mock low stock products for now
          Promise.resolve({ data: { data: mockLowStockProducts } }),
          // Mock recent sales for now
          Promise.resolve({ data: { data: mockRecentSales } })
        ]);

        if (statsResponse.status === 'fulfilled') {
          setStats(statsResponse.value.data.data);
        }

        if (lowStockResponse.status === 'fulfilled') {
          setLowStockProducts(lowStockResponse.value.data.data);
        }

        if (salesResponse.status === 'fulfilled') {
          setRecentSales(salesResponse.value.data.data);
        }

      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Mock data for demonstration
  const mockLowStockProducts = [
    { _id: '1', name: 'iPhone 14 Pro', sku: 'IPH-14-PRO', currentStock: 5, minimumStock: 10, category: { name: 'Electronics' } },
    { _id: '2', name: 'Samsung Galaxy S23', sku: 'SAM-S23', currentStock: 3, minimumStock: 15, category: { name: 'Electronics' } },
    { _id: '3', name: 'MacBook Air M2', sku: 'MBA-M2', currentStock: 2, minimumStock: 8, category: { name: 'Computers' } },
  ];

  const mockRecentSales = [
    { _id: '1', invoiceNumber: 'INV-001234', customer: { name: 'John Doe' }, grandTotal: 1250, status: 'paid', saleDate: new Date() },
    { _id: '2', invoiceNumber: 'INV-001235', customer: { name: 'Jane Smith' }, grandTotal: 890, status: 'pending', saleDate: new Date() },
    { _id: '3', invoiceNumber: 'INV-001236', customer: { name: 'Bob Johnson' }, grandTotal: 2100, status: 'paid', saleDate: new Date() },
  ];

  const salesData = [
    { month: 'Jan', sales: 4000, purchases: 2400 },
    { month: 'Feb', sales: 3000, purchases: 1398 },
    { month: 'Mar', sales: 2000, purchases: 9800 },
    { month: 'Apr', sales: 2780, purchases: 3908 },
    { month: 'May', sales: 1890, purchases: 4800 },
    { month: 'Jun', sales: 2390, purchases: 3800 },
  ];

  const inventoryData = [
    { name: 'In Stock', value: 400, color: '#10B981' },
    { name: 'Low Stock', value: 50, color: '#F59E0B' },
    { name: 'Out of Stock', value: 20, color: '#EF4444' },
  ];

  const revenueData = [
    { month: 'Jan', revenue: 12000, profit: 3000 },
    { month: 'Feb', revenue: 15000, profit: 4500 },
    { month: 'Mar', revenue: 18000, profit: 5400 },
    { month: 'Apr', revenue: 22000, profit: 6600 },
    { month: 'May', revenue: 25000, profit: 7500 },
    { month: 'Jun', revenue: 28000, profit: 8400 },
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
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back! Here's what's happening with your inventory.</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" size="sm">
            <FileText className="w-4 h-4 mr-2" />
            Export Report
          </Button>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Quick Sale
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Products"
          value={stats?.totalProducts || 0}
          icon={<Package className="w-6 h-6 text-white" />}
          color="bg-blue-500"
          trend={{ value: 12, isPositive: true }}
          href="/products"
        />
        <StatCard
          title="Low Stock Items"
          value={stats?.lowStockProducts || 0}
          icon={<AlertTriangle className="w-6 h-6 text-white" />}
          color="bg-yellow-500"
          href="/products?status=low_stock"
        />
        <StatCard
          title="Out of Stock"
          value={stats?.outOfStockProducts || 0}
          icon={<XCircle className="w-6 h-6 text-white" />}
          color="bg-red-500"
          href="/products?status=out_of_stock"
        />
        <StatCard
          title="Total Suppliers"
          value={stats?.totalSuppliers || 0}
          icon={<Truck className="w-6 h-6 text-white" />}
          color="bg-green-500"
          href="/suppliers"
        />
        <StatCard
          title="Total Customers"
          value={stats?.totalCustomers || 0}
          icon={<Users className="w-6 h-6 text-white" />}
          color="bg-purple-500"
          href="/customers"
        />
        <StatCard
          title="Pending Purchases"
          value={stats?.pendingPurchases || 0}
          icon={<ShoppingCart className="w-6 h-6 text-white" />}
          color="bg-orange-500"
          href="/purchases?status=pending"
        />
        <StatCard
          title="Recent Sales"
          value={stats?.recentSales || 0}
          icon={<FileText className="w-6 h-6 text-white" />}
          color="bg-indigo-500"
          href="/sales"
        />
        <StatCard
          title="Inventory Value"
          value={formatCurrency(stats?.inventoryValue || 0)}
          icon={<DollarSign className="w-6 h-6 text-white" />}
          color="bg-emerald-500"
          trend={{ value: 8, isPositive: true }}
          href="/inventory"
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickActionCard
            title="Add Product"
            description="Add new products to your inventory"
            icon={<Package className="w-5 h-5 text-white" />}
            href="/products/new"
            color="bg-blue-500"
          />
          <QuickActionCard
            title="Create Sale"
            description="Process a new customer sale"
            icon={<FileText className="w-5 h-5 text-white" />}
            href="/sales/new"
            color="bg-green-500"
          />
          <QuickActionCard
            title="Purchase Order"
            description="Create a new purchase order"
            icon={<ShoppingCart className="w-5 h-5 text-white" />}
            href="/purchases/new"
            color="bg-orange-500"
          />
          <QuickActionCard
            title="Stock Movement"
            description="Adjust inventory levels"
            icon={<ArrowUpRight className="w-5 h-5 text-white" />}
            href="/inventory/movements/new"
            color="bg-purple-500"
          />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales vs Purchases Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Sales vs Purchases</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Bar dataKey="sales" fill="#3B82F6" name="Sales" />
                <Bar dataKey="purchases" fill="#10B981" name="Purchases" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Inventory Status Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Inventory Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={inventoryData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {inventoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue & Profit Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Line type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2} name="Revenue" />
                <Line type="monotone" dataKey="profit" stroke="#10B981" strokeWidth={2} name="Profit" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Top Selling Products</CardTitle>
              <Link to="/reports/products">
                <Button variant="ghost" size="sm">
                  <Eye className="w-4 h-4 mr-2" />
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: 'iPhone 14 Pro', sales: 45, revenue: 45000 },
                { name: 'Samsung Galaxy S23', sales: 32, revenue: 28800 },
                { name: 'MacBook Air M2', sales: 18, revenue: 21600 },
                { name: 'iPad Pro', sales: 25, revenue: 20000 },
              ].map((product, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-600">{product.sales} units sold</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatCurrency(product.revenue)}</p>
                    <div className="flex items-center text-green-600">
                      <TrendingUp className="w-4 h-4 mr-1" />
                      <span className="text-sm">+12%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alerts */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-yellow-500 mr-2" />
                Low Stock Alerts
              </CardTitle>
              <Link to="/products?status=low_stock">
                <Button variant="ghost" size="sm">
                  <Eye className="w-4 h-4 mr-2" />
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lowStockProducts.slice(0, 3).map((product) => (
                <div key={product._id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-600">SKU: {product.sku}</p>
                    <p className="text-sm text-gray-600">
                      Current: {product.currentStock} | Minimum: {product.minimumStock}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="warning">Low Stock</Badge>
                    <Link to={`/products/${product._id}`}>
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
              {lowStockProducts.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No low stock alerts</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Sales */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 text-blue-500 mr-2" />
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
            <div className="space-y-3">
              {recentSales.slice(0, 3).map((sale) => (
                <div key={sale._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{sale.invoiceNumber}</p>
                    <p className="text-sm text-gray-600">{sale.customer.name}</p>
                    <p className="text-sm text-gray-500">{formatDate(sale.saleDate)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{formatCurrency(sale.grandTotal)}</p>
                    <Badge variant={sale.status === 'paid' ? 'success' : 'warning'}>
                      {sale.status}
                    </Badge>
                  </div>
                </div>
              ))}
              {recentSales.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No recent sales</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(28000)}</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600">+15.3%</span>
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
                <p className="text-sm font-medium text-gray-600">Profit Margin</p>
                <p className="text-2xl font-bold text-gray-900">30%</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600">+2.1%</span>
                  <span className="text-sm text-gray-500 ml-1">vs last month</span>
                </div>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg. Order Value</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(1380)}</p>
                <div className="flex items-center mt-1">
                  <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                  <span className="text-sm text-red-600">-3.2%</span>
                  <span className="text-sm text-gray-500 ml-1">vs last month</span>
                </div>
              </div>
              <div className="p-3 rounded-full bg-purple-100">
                <ShoppingCart className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};