import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, Package, AlertTriangle, XCircle, Warehouse, ArrowUpDown, 
  ArrowUp, ArrowDown, MapPin, BarChart3, Download,
  TrendingUp, TrendingDown, Truck, Calendar, Clock, Filter,
  RefreshCw, Layers, Move, Archive, Box, Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Badge } from '../../components/UI/Badge';
import { inventoryAPI, productsAPI } from '../../lib/api';
import { formatCurrency, formatDate } from '../../utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import toast from 'react-hot-toast';

export const InventoryDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [recentMovements, setRecentMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsResponse, lowStockResponse, movementsResponse] = await Promise.all([
        inventoryAPI.getStats(),
        productsAPI.getLowStock(),
        inventoryAPI.getMovements({ limit: 5 })
      ]);

      setStats(statsResponse.data.data);
      setLowStockProducts(lowStockResponse.data.data.slice(0, 5));
      setRecentMovements(movementsResponse.data.data);
    } catch (error) {
      console.error('Failed to fetch inventory dashboard data:', error);
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
  const getMovementTypeData = () => {
    if (!stats?.movementTrends) return [];
    
    return stats.movementTrends.map((trend: any) => ({
      name: trend._id.charAt(0).toUpperCase() + trend._id.slice(1),
      value: trend.totalQuantity,
      count: trend.count
    }));
  };

  const getTopProductsData = () => {
    if (!stats?.topMovedProducts) return [];
    
    return stats.topMovedProducts.map((product: any) => ({
      name: product.productName || 'Unknown',
      quantity: product.totalQuantity
    }));
  };

  const getTopLocationsData = () => {
    if (!stats?.topMovedLocations) return [];
    
    return stats.topMovedLocations.map((location: any) => ({
      name: location.locationName || 'Unknown',
      quantity: location.totalQuantity
    }));
  };

  const getMovementTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'in': return '#10B981'; // green
      case 'out': return '#EF4444'; // red
      case 'transfer': return '#3B82F6'; // blue
      case 'adjustment': return '#F59E0B'; // yellow
      default: return '#6B7280'; // gray
    }
  };

  const getStockStatusBadge = (status: string) => {
    switch (status) {
      case 'out_of_stock':
        return <Badge variant="danger" className="flex items-center gap-1">
          <XCircle className="w-3 h-3" />
          Out of Stock
        </Badge>;
      case 'low_stock':
        return <Badge variant="warning" className="flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Low Stock
        </Badge>;
      default:
        return <Badge variant="success">In Stock</Badge>;
    }
  };

  const getMovementTypeBadge = (type: string) => {
    const variants = {
      in: 'success',
      out: 'danger',
      transfer: 'info',
      adjustment: 'warning'
    } as const;
    
    const icons = {
      in: ArrowUp,
      out: ArrowDown,
      transfer: ArrowUpDown,
      adjustment: RefreshCw
    } as const;
    
    const Icon = icons[type as keyof typeof icons] || ArrowUpDown;
    
    return <Badge variant={variants[type as keyof typeof variants] || 'default'} className="flex items-center gap-1">
      <Icon className="w-3 h-3" />
      {type.toUpperCase()}
    </Badge>;
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
          <h1 className="text-2xl font-bold text-gray-900">Inventory Dashboard</h1>
          <p className="text-gray-600">Overview of your inventory status and recent activities</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Link to="/inventory/movements/new">
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              New Movement
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
                <p className="text-sm text-gray-600">Total Products</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.totalProducts || 0}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Low Stock Items</p>
                <p className="text-2xl font-bold text-yellow-600">{stats?.lowStockProducts || 0}</p>
                <Link to="/products/alerts/low-stock" className="text-xs text-blue-600 hover:underline">View all</Link>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Out of Stock</p>
                <p className="text-2xl font-bold text-red-600">{stats?.outOfStockProducts || 0}</p>
                <Link to="/products/alerts/out-of-stock" className="text-xs text-blue-600 hover:underline">View all</Link>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Stock Value</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(stats?.stockValue || 0)}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link to="/inventory/movements/new">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="p-3 rounded-lg bg-blue-500">
                    <ArrowUpDown className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">Stock Movement</h3>
                    <p className="text-sm text-gray-600 mt-1">Record stock ins, outs, and adjustments</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
          
          <Link to="/inventory/transfer">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="p-3 rounded-lg bg-green-500">
                    <Move className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">Transfer Stock</h3>
                    <p className="text-sm text-gray-600 mt-1">Move inventory between locations</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
          
          <Link to="/inventory/locations">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="p-3 rounded-lg bg-purple-500">
                    <Warehouse className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">Manage Locations</h3>
                    <p className="text-sm text-gray-600 mt-1">View and manage storage locations</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
          
          <Link to="/inventory/movements">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="p-3 rounded-lg bg-orange-500">
                    <BarChart3 className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">Movement History</h3>
                    <p className="text-sm text-gray-600 mt-1">View all inventory movements</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Movement Types Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ArrowUpDown className="w-5 h-5 mr-2" />
              Stock Movement by Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={getMovementTypeData()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {getMovementTypeData().map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={getMovementTypeColor(entry.name)} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} units`, 'Quantity']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Products Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Package className="w-5 h-5 mr-2" />
              Top Moved Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={getTopProductsData()}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="quantity" fill="#3B82F6" name="Quantity Moved" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alerts and Recent Movements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alerts */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-yellow-500 mr-2" />
                Low Stock Alerts
              </CardTitle>
              <Link to="/products/alerts/low-stock">
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {lowStockProducts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No low stock alerts</p>
              </div>
            ) : (
              <div className="space-y-3">
                {lowStockProducts.map((product) => (
                  <div key={product._id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-center space-x-3">
                      {product.primaryImage || product.images?.[0] ? (
                        <img
                          src={product.primaryImage?.url || product.images[0].url}
                          alt={product.name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                          <Package className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{product.name}</p>
                        <p className="text-sm text-gray-600">SKU: {product.sku}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-yellow-600">{product.currentStock} / {product.minimumStock}</p>
                      <p className="text-sm text-gray-600">{product.unit}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Movements */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                Recent Stock Movements
              </CardTitle>
              <Link to="/inventory/movements">
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentMovements.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <ArrowUpDown className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No recent movements</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentMovements.map((movement) => (
                  <div key={movement._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        {getMovementTypeBadge(movement.type)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {typeof movement.product === 'object' ? movement.product.name : 'Unknown Product'}
                        </p>
                        <p className="text-sm text-gray-600">
                          {movement.quantity} {typeof movement.product === 'object' ? movement.product.unit : 'units'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-900">{formatDate(movement.movementDate)}</p>
                      <p className="text-xs text-gray-600">
                        {typeof movement.performedBy === 'object' 
                          ? `${movement.performedBy.firstName} ${movement.performedBy.lastName}`
                          : 'Unknown User'
                        }
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Locations Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Warehouse className="w-5 h-5 mr-2" />
              Locations Overview
            </CardTitle>
            <Link to="/inventory/locations">
              <Button variant="outline" size="sm">
                <MapPin className="w-4 h-4 mr-2" />
                Manage Locations
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-blue-900">Warehouses</h3>
                <Warehouse className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-blue-600">
                {stats?.totalLocations ? 
                  stats.topMovedLocations?.filter((loc: any) => loc.locationType === 'warehouse').length || 0 
                  : 0}
              </p>
              <p className="text-sm text-blue-600 mt-1">Primary storage</p>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-green-900">Stores</h3>
                <Archive className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-600">
                {stats?.totalLocations ? 
                  stats.topMovedLocations?.filter((loc: any) => loc.locationType === 'store').length || 0 
                  : 0}
              </p>
              <p className="text-sm text-green-600 mt-1">Retail locations</p>
            </div>
            
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-purple-900">Factories</h3>
                <Box className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-purple-600">
                {stats?.totalLocations ? 
                  stats.topMovedLocations?.filter((loc: any) => loc.locationType === 'factory').length || 0 
                  : 0}
              </p>
              <p className="text-sm text-purple-600 mt-1">Production sites</p>
            </div>
            
            <div className="p-4 bg-orange-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-orange-900">Other Locations</h3>
                <MapPin className="w-5 h-5 text-orange-600" />
              </div>
              <p className="text-2xl font-bold text-orange-600">
                {stats?.totalLocations ? 
                  stats.topMovedLocations?.filter((loc: any) => 
                    !['warehouse', 'store', 'factory'].includes(loc.locationType)
                  ).length || 0 
                  : 0}
              </p>
              <p className="text-sm text-orange-600 mt-1">Additional storage</p>
            </div>
          </div>
          
          {stats?.topMovedLocations && stats.topMovedLocations.length > 0 ? (
            <div className="mt-6">
              <h3 className="font-medium text-gray-900 mb-3">Top Active Locations</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats.topMovedLocations.slice(0, 3).map((location: any) => (
                  <Link key={location._id} to={`/inventory/locations/${location._id}`}>
                    <div className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{location.locationName || 'Unknown'}</h4>
                        <Badge variant="default" className="capitalize">{location.locationType || 'unknown'}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600">{location.count} movements</p>
                        <p className="text-sm font-medium">{location.totalQuantity} units</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
};