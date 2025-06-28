import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, AlertTriangle, XCircle, Calendar, Package, 
  Eye, Edit, RefreshCw, Download, Filter, Search,
  Clock, TrendingDown, Zap, Bell
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import { Select } from '../../components/UI/Select';
import { Badge } from '../../components/UI/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/UI/Table';
import { productsAPI } from '../../lib/api';
import { Product } from '../../types';
import { formatCurrency, formatDate } from '../../utils';
import toast from 'react-hot-toast';

export const ProductAlerts: React.FC = () => {
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [outOfStockProducts, setOutOfStockProducts] = useState<Product[]>([]);
  const [expiryAlerts, setExpiryAlerts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'low_stock' | 'out_of_stock' | 'expiry'>('low_stock');
  const [searchTerm, setSearchTerm] = useState('');
  const [expiryDays, setExpiryDays] = useState(30);

  useEffect(() => {
    fetchAlerts();
  }, [expiryDays]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const [lowStockResponse, outOfStockResponse, expiryResponse] = await Promise.all([
        productsAPI.getLowStock(),
        productsAPI.getOutOfStock(),
        productsAPI.getExpiryAlerts(expiryDays)
      ]);

      setLowStockProducts(lowStockResponse.data.data);
      setOutOfStockProducts(outOfStockResponse.data.data);
      setExpiryAlerts(expiryResponse.data.data);
    } catch (error) {
      toast.error('Failed to fetch product alerts');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchAlerts();
    toast.success('Alerts refreshed');
  };

  const handleExport = async (type: string) => {
    try {
      let data: Product[] = [];
      let filename = '';

      switch (type) {
        case 'low_stock':
          data = lowStockProducts;
          filename = 'low-stock-products';
          break;
        case 'out_of_stock':
          data = outOfStockProducts;
          filename = 'out-of-stock-products';
          break;
        case 'expiry':
          data = expiryAlerts;
          filename = 'expiry-alerts';
          break;
      }

      const csvContent = [
        ['Name', 'SKU', 'Category', 'Current Stock', 'Minimum Stock', 'Stock Value', 'Expiry Date'].join(','),
        ...data.map(product => [
          product.name,
          product.sku,
          typeof product.category === 'object' ? product.category.name : product.category,
          product.currentStock,
          product.minimumStock,
          product.currentStock * product.costPrice,
          product.expiryDate ? formatDate(product.expiryDate) : ''
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Alerts exported successfully');
    } catch (error) {
      toast.error('Failed to export alerts');
    }
  };

  const getFilteredProducts = (products: Product[]) => {
    if (!searchTerm) return products;
    
    return products.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.brand.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const getStockStatusBadge = (product: Product) => {
    if (product.currentStock === 0) {
      return <Badge variant="danger" className="flex items-center gap-1">
        <XCircle className="w-3 h-3" />
        Out of Stock
      </Badge>;
    } else if (product.currentStock <= product.minimumStock) {
      return <Badge variant="warning" className="flex items-center gap-1">
        <AlertTriangle className="w-3 h-3" />
        Low Stock
      </Badge>;
    }
    return null;
  };

  const getExpiryBadge = (expiryDate: string) => {
    const daysUntilExpiry = Math.ceil((new Date(expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) {
      return <Badge variant="danger" className="flex items-center gap-1">
        <XCircle className="w-3 h-3" />
        Expired
      </Badge>;
    } else if (daysUntilExpiry <= 7) {
      return <Badge variant="danger" className="flex items-center gap-1">
        <AlertTriangle className="w-3 h-3" />
        {daysUntilExpiry} days
      </Badge>;
    } else if (daysUntilExpiry <= 30) {
      return <Badge variant="warning" className="flex items-center gap-1">
        <Clock className="w-3 h-3" />
        {daysUntilExpiry} days
      </Badge>;
    }
    
    return <Badge variant="info">{daysUntilExpiry} days</Badge>;
  };

  const tabs = [
    {
      id: 'low_stock' as const,
      label: 'Low Stock',
      count: lowStockProducts.length,
      icon: AlertTriangle,
      color: 'text-yellow-600'
    },
    {
      id: 'out_of_stock' as const,
      label: 'Out of Stock',
      count: outOfStockProducts.length,
      icon: XCircle,
      color: 'text-red-600'
    },
    {
      id: 'expiry' as const,
      label: 'Expiry Alerts',
      count: expiryAlerts.length,
      icon: Calendar,
      color: 'text-orange-600'
    }
  ];

  const getCurrentProducts = () => {
    switch (activeTab) {
      case 'low_stock':
        return getFilteredProducts(lowStockProducts);
      case 'out_of_stock':
        return getFilteredProducts(outOfStockProducts);
      case 'expiry':
        return getFilteredProducts(expiryAlerts);
      default:
        return [];
    }
  };

  const currentProducts = getCurrentProducts();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/products">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Products
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Product Alerts</h1>
            <p className="text-gray-600">Monitor stock levels and product expiry dates</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport(activeTab)}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Alert Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Card 
              key={tab.id}
              className={`cursor-pointer transition-all duration-200 ${
                activeTab === tab.id ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-md'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{tab.label}</p>
                    <p className={`text-3xl font-bold ${tab.color}`}>{tab.count}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {tab.id === 'expiry' ? `Next ${expiryDays} days` : 'Products'}
                    </p>
                  </div>
                  <div className={`p-3 rounded-full bg-gray-100`}>
                    <Icon className={`w-8 h-8 ${tab.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            {activeTab === 'expiry' && (
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Alert Period:</label>
                <Select
                  options={[
                    { value: '7', label: '7 days' },
                    { value: '15', label: '15 days' },
                    { value: '30', label: '30 days' },
                    { value: '60', label: '60 days' },
                    { value: '90', label: '90 days' }
                  ]}
                  value={expiryDays.toString()}
                  onChange={(e) => setExpiryDays(parseInt(e.target.value))}
                  className="w-32"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              {(() => {
                const currentTab = tabs.find(tab => tab.id === activeTab);
                const Icon = currentTab?.icon || Package;
                return (
                  <>
                    <Icon className={`w-5 h-5 mr-2 ${currentTab?.color}`} />
                    {currentTab?.label} ({currentProducts.length})
                  </>
                );
              })()}
            </CardTitle>
            
            {currentProducts.length > 0 && (
              <div className="flex items-center space-x-2">
                <Badge variant="warning" className="flex items-center gap-1">
                  <Bell className="w-3 h-3" />
                  Action Required
                </Badge>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6">
              <div className="animate-pulse space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          ) : currentProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900">No alerts found</h3>
              <p className="text-gray-600 mt-2">
                {searchTerm 
                  ? 'No products match your search criteria'
                  : `No ${tabs.find(tab => tab.id === activeTab)?.label.toLowerCase()} alerts at this time`
                }
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Current Stock</TableHead>
                  <TableHead>Minimum Stock</TableHead>
                  {activeTab === 'expiry' && <TableHead>Expiry Date</TableHead>}
                  <TableHead>Stock Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentProducts.map((product) => (
                  <TableRow key={product._id}>
                    <TableCell>
                      <div className="flex items-center">
                        {product.primaryImage || product.images?.[0] ? (
                          <img
                            src={product.primaryImage?.url || product.images[0].url}
                            alt={product.name}
                            className="w-10 h-10 rounded-lg object-cover mr-3"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center mr-3">
                            <Package className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{product.name}</p>
                          <p className="text-sm text-gray-500">{product.brand}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{product.sku}</span>
                    </TableCell>
                    <TableCell>
                      {typeof product.category === 'object' ? product.category.name : product.category}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <span className={`font-medium ${
                          product.currentStock === 0 ? 'text-red-600' : 
                          product.currentStock <= product.minimumStock ? 'text-yellow-600' : 'text-gray-900'
                        }`}>
                          {product.currentStock} {product.unit}
                        </span>
                        {product.currentStock <= product.minimumStock && (
                          <TrendingDown className="w-4 h-4 text-red-500 ml-1" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-gray-600">{product.minimumStock} {product.unit}</span>
                    </TableCell>
                    {activeTab === 'expiry' && (
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm">{formatDate(product.expiryDate!)}</span>
                          {getExpiryBadge(product.expiryDate!)}
                        </div>
                      </TableCell>
                    )}
                    <TableCell>
                      <span className="font-medium">
                        {formatCurrency(product.currentStock * product.costPrice)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {activeTab === 'expiry' 
                        ? getExpiryBadge(product.expiryDate!)
                        : getStockStatusBadge(product)
                      }
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Link to={`/products/${product._id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Link to={`/products/${product._id}/edit`}>
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </Link>
                        {(activeTab === 'low_stock' || activeTab === 'out_of_stock') && (
                          <Button variant="ghost" size="sm">
                            <Zap className="w-4 h-4 text-blue-500" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Action Recommendations */}
      {currentProducts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Zap className="w-5 h-5 mr-2 text-blue-500" />
              Recommended Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeTab === 'low_stock' && (
                <div className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-900">Low Stock Alert</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      {lowStockProducts.length} products are running low on stock. Consider creating purchase orders to replenish inventory.
                    </p>
                  </div>
                </div>
              )}
              
              {activeTab === 'out_of_stock' && (
                <div className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg">
                  <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-red-900">Out of Stock Alert</h4>
                    <p className="text-sm text-red-700 mt-1">
                      {outOfStockProducts.length} products are completely out of stock. Immediate restocking is required to avoid lost sales.
                    </p>
                  </div>
                </div>
              )}
              
              {activeTab === 'expiry' && (
                <div className="flex items-start space-x-3 p-3 bg-orange-50 rounded-lg">
                  <Calendar className="w-5 h-5 text-orange-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-orange-900">Expiry Alert</h4>
                    <p className="text-sm text-orange-700 mt-1">
                      {expiryAlerts.length} products will expire within {expiryDays} days. Consider promotional pricing or returns to suppliers.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};