import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, Search, Filter, Edit, Trash2, Eye, Package, 
  Grid, List, SortAsc, SortDesc, Download, Upload,
  AlertTriangle, XCircle, CheckCircle, Tag, Star,
  TrendingUp, TrendingDown, MoreVertical, Image as ImageIcon,
  Copy, BarChart3, Zap, RefreshCw, Settings, Archive
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import { Select } from '../../components/UI/Select';
import { Badge } from '../../components/UI/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/UI/Table';
import { Modal } from '../../components/UI/Modal';
import { productsAPI, categoriesAPI, suppliersAPI } from '../../lib/api';
import { Product, Category, Supplier, ProductFilters } from '../../types';
import { formatCurrency, formatDate, debounce } from '../../utils';
import toast from 'react-hot-toast';

export const ProductList: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);

  const [filters, setFilters] = useState<ProductFilters>({
    search: '',
    category: '',
    brand: '',
    supplier: '',
    status: undefined,
    minPrice: undefined,
    maxPrice: undefined,
    tags: [],
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  const [bulkPriceData, setBulkPriceData] = useState({
    type: 'percentage' as 'percentage' | 'fixed',
    value: 0
  });

  const [stockUpdateData, setStockUpdateData] = useState({
    operation: 'set' as 'set' | 'add' | 'subtract',
    quantity: '',
    reason: 'adjustment',
    notes: ''
  });

  // Debounced search function
  const debouncedSearch = debounce((searchTerm: string) => {
    setFilters(prev => ({ ...prev, search: searchTerm }));
    setCurrentPage(1);
  }, 500);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchSuppliers();
  }, [currentPage, filters]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 12,
        ...filters,
        tags: filters.tags?.join(',')
      };

      const response = await productsAPI.getAll(params);
      setProducts(response.data.data);
      setTotalPages(response.data.pagination?.pages || 1);
      setTotalProducts(response.data.pagination?.total || 0);
    } catch (error) {
      toast.error('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getAll({ limit: 100 });
      setCategories(response.data.data);
    } catch (error) {
      console.error('Failed to fetch categories');
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await suppliersAPI.getAll({ limit: 100 });
      setSuppliers(response.data.data);
    } catch (error) {
      console.error('Failed to fetch suppliers');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await productsAPI.delete(id);
        toast.success('Product deleted successfully');
        fetchProducts();
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Failed to delete product');
      }
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await productsAPI.duplicate(id);
      toast.success('Product duplicated successfully');
      fetchProducts();
    } catch (error) {
      toast.error('Failed to duplicate product');
    }
  };

  const handleBulkPriceUpdate = async () => {
    if (selectedProducts.length === 0) {
      toast.error('Please select products to update');
      return;
    }

    try {
      await productsAPI.bulkUpdatePrices({
        productIds: selectedProducts,
        priceAdjustment: bulkPriceData
      });
      
      toast.success(`Updated prices for ${selectedProducts.length} products`);
      setShowBulkModal(false);
      setSelectedProducts([]);
      fetchProducts();
    } catch (error) {
      toast.error('Failed to update prices');
    }
  };

  const handleStockUpdate = async () => {
    if (!selectedProductId || !stockUpdateData.quantity) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await productsAPI.updateStock(selectedProductId, {
        quantity: parseInt(stockUpdateData.quantity),
        operation: stockUpdateData.operation,
        reason: stockUpdateData.reason,
        notes: stockUpdateData.notes
      });
      
      toast.success('Stock updated successfully');
      setShowStockModal(false);
      setStockUpdateData({
        operation: 'set',
        quantity: '',
        reason: 'adjustment',
        notes: ''
      });
      setSelectedProductId('');
      fetchProducts();
    } catch (error) {
      toast.error('Failed to update stock');
    }
  };

  const handleExport = async () => {
    try {
      const response = await productsAPI.export({ format: 'csv', filters });
      
      // Convert to CSV and download
      const csvContent = [
        Object.keys(response.data.data[0]).join(','),
        ...response.data.data.map((row: any) => Object.values(row).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `products-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Products exported successfully');
    } catch (error) {
      toast.error('Failed to export products');
    }
  };

  const handleSelectProduct = (productId: string) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleSelectAll = () => {
    if (selectedProducts.length === products.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(products.map(p => p._id));
    }
  };

  const getStockStatusBadge = (product: Product) => {
    const status = product.stockStatus || 
      (product.currentStock === 0 ? 'out_of_stock' : 
       product.currentStock <= product.minimumStock ? 'low_stock' : 'in_stock');

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
        return <Badge variant="success" className="flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          In Stock
        </Badge>;
    }
  };

  const getProfitTrend = (profitMargin: number) => {
    if (profitMargin > 30) {
      return <TrendingUp className="w-4 h-4 text-green-500" />;
    } else if (profitMargin < 10) {
      return <TrendingDown className="w-4 h-4 text-red-500" />;
    }
    return null;
  };

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'in_stock', label: 'In Stock' },
    { value: 'low_stock', label: 'Low Stock' },
    { value: 'out_of_stock', label: 'Out of Stock' }
  ];

  const sortOptions = [
    { value: 'name', label: 'Name' },
    { value: 'sku', label: 'SKU' },
    { value: 'brand', label: 'Brand' },
    { value: 'costPrice', label: 'Cost Price' },
    { value: 'sellingPrice', label: 'Selling Price' },
    { value: 'currentStock', label: 'Stock Level' },
    { value: 'createdAt', label: 'Date Created' }
  ];

  const stockOperationOptions = [
    { value: 'set', label: 'Set Stock Level' },
    { value: 'add', label: 'Add Stock' },
    { value: 'subtract', label: 'Remove Stock' }
  ];

  const stockReasonOptions = [
    { value: 'adjustment', label: 'Stock Adjustment' },
    { value: 'damage', label: 'Damaged Goods' },
    { value: 'loss', label: 'Stock Loss' },
    { value: 'return', label: 'Customer Return' },
    { value: 'transfer', label: 'Stock Transfer' }
  ];

  const ProductCard: React.FC<{ product: Product }> = ({ product }) => (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <input
            type="checkbox"
            checked={selectedProducts.includes(product._id)}
            onChange={() => handleSelectProduct(product._id)}
            className="rounded border-gray-300"
          />
          <div className="flex items-center space-x-1">
            {product.averageRating && (
              <div className="flex items-center">
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                <span className="text-sm text-gray-600 ml-1">{product.averageRating}</span>
              </div>
            )}
            <div className="relative">
              <Button variant="ghost" size="sm">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="aspect-square bg-gray-100 rounded-lg mb-3 overflow-hidden">
          {product.primaryImage || product.images?.[0] ? (
            <img
              src={product.primaryImage?.url || product.images[0].url}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-12 h-12 text-gray-400" />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-start justify-between">
            <h3 className="font-semibold text-gray-900 line-clamp-2">{product.name}</h3>
            {getProfitTrend(parseFloat(product.profitMargin || '0'))}
          </div>
          
          <p className="text-sm text-gray-600">{product.brand}</p>
          <p className="text-xs font-mono text-gray-500">{product.sku}</p>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(product.sellingPrice)}</p>
              <p className="text-sm text-gray-500">Cost: {formatCurrency(product.costPrice)}</p>
              <p className="text-xs text-green-600">Margin: {product.profitMargin}%</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">{product.currentStock} {product.unit}</p>
              <p className="text-xs text-gray-500">Min: {product.minimumStock}</p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            {getStockStatusBadge(product)}
            <div className="flex items-center space-x-1">
              {product.tags?.slice(0, 2).map((tag, index) => (
                <Badge key={index} variant="default" size="sm">
                  <Tag className="w-3 h-3 mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedProductId(product._id);
                setShowStockModal(true);
              }}
            >
              <Archive className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDuplicate(product._id)}
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(product._id)}
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-600">
            Manage your product inventory ({totalProducts} products)
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Link to="/products/alerts/low-stock">
            <Button variant="outline" size="sm">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Alerts
            </Button>
          </Link>
          <Link to="/products/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Products</p>
                <p className="text-2xl font-bold">{totalProducts}</p>
              </div>
              <Package className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Low Stock</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {products.filter(p => p.stockStatus === 'low_stock').length}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Out of Stock</p>
                <p className="text-2xl font-bold text-red-600">
                  {products.filter(p => p.stockStatus === 'out_of_stock').length}
                </p>
              </div>
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Value</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(products.reduce((sum, p) => sum + (p.stockValue || 0), 0))}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search products by name, SKU, brand..."
                  onChange={(e) => debouncedSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Select
                options={categories.map(cat => ({ value: cat._id, label: cat.name }))}
                value={filters.category}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                placeholder="Category"
              />
              
              <Select
                options={suppliers.map(sup => ({ value: sup._id, label: sup.name }))}
                value={filters.supplier}
                onChange={(e) => setFilters(prev => ({ ...prev, supplier: e.target.value }))}
                placeholder="Supplier"
              />
              
              <Select
                options={statusOptions}
                value={filters.status || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any }))}
                placeholder="Status"
              />
              
              <Select
                options={sortOptions}
                value={filters.sortBy}
                onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as any }))}
              />
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters(prev => ({ 
                  ...prev, 
                  sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc' 
                }))}
              >
                {filters.sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
              
              <div className="flex items-center border rounded-lg">
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-r-none"
                >
                  <List className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-l-none"
                >
                  <Grid className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                type="number"
                placeholder="Min Price"
                value={filters.minPrice || ''}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  minPrice: e.target.value ? parseFloat(e.target.value) : undefined 
                }))}
              />
              <Input
                type="number"
                placeholder="Max Price"
                value={filters.maxPrice || ''}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  maxPrice: e.target.value ? parseFloat(e.target.value) : undefined 
                }))}
              />
              <Input
                placeholder="Brand"
                value={filters.brand}
                onChange={(e) => setFilters(prev => ({ ...prev, brand: e.target.value }))}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedProducts.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {selectedProducts.length} product(s) selected
              </p>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBulkModal(true)}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Update Prices
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedProducts([])}
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Products Display */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="animate-pulse space-y-4">
                  <div className="aspect-square bg-gray-200 rounded-lg"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <Package className="w-5 h-5 mr-2" />
                Products
              </CardTitle>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedProducts.length === products.length && products.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-600">Select All</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Select</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Profit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product._id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedProducts.includes(product._id)}
                        onChange={() => handleSelectProduct(product._id)}
                        className="rounded border-gray-300"
                      />
                    </TableCell>
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
                          {product.tags?.length > 0 && (
                            <div className="flex items-center space-x-1 mt-1">
                              {product.tags.slice(0, 2).map((tag, index) => (
                                <Badge key={index} variant="default" size="sm">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
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
                      <div>
                        <p className="font-medium">{product.currentStock} {product.unit}</p>
                        <p className="text-sm text-gray-500">Min: {product.minimumStock}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{formatCurrency(product.sellingPrice)}</p>
                        <p className="text-sm text-gray-500">Cost: {formatCurrency(product.costPrice)}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <span className="text-sm font-medium">
                          {product.profitMargin}%
                        </span>
                        {getProfitTrend(parseFloat(product.profitMargin || '0'))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStockStatusBadge(product)}
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedProductId(product._id);
                            setShowStockModal(true);
                          }}
                        >
                          <Archive className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDuplicate(product._id)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(product._id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-700">
            Page {currentPage} of {totalPages} ({totalProducts} total products)
          </p>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Bulk Price Update Modal */}
      <Modal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        title="Bulk Price Update"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Update prices for {selectedProducts.length} selected products
          </p>
          
          <Select
            label="Adjustment Type"
            options={[
              { value: 'percentage', label: 'Percentage' },
              { value: 'fixed', label: 'Fixed Amount' }
            ]}
            value={bulkPriceData.type}
            onChange={(e) => setBulkPriceData(prev => ({ 
              ...prev, 
              type: e.target.value as 'percentage' | 'fixed' 
            }))}
          />
          
          <Input
            label={`${bulkPriceData.type === 'percentage' ? 'Percentage' : 'Amount'} Adjustment`}
            type="number"
            value={bulkPriceData.value}
            onChange={(e) => setBulkPriceData(prev => ({ 
              ...prev, 
              value: parseFloat(e.target.value) || 0 
            }))}
            placeholder={bulkPriceData.type === 'percentage' ? 'e.g., 10 for 10%' : 'e.g., 5.00'}
          />
          
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setShowBulkModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkPriceUpdate}>
              Update Prices
            </Button>
          </div>
        </div>
      </Modal>

      {/* Stock Update Modal */}
      <Modal
        isOpen={showStockModal}
        onClose={() => setShowStockModal(false)}
        title="Update Stock"
        size="md"
      >
        <div className="space-y-4">
          <Select
            label="Operation"
            options={stockOperationOptions}
            value={stockUpdateData.operation}
            onChange={(e) => setStockUpdateData(prev => ({ 
              ...prev, 
              operation: e.target.value as 'set' | 'add' | 'subtract' 
            }))}
          />
          
          <Input
            label="Quantity"
            type="number"
            value={stockUpdateData.quantity}
            onChange={(e) => setStockUpdateData(prev => ({ 
              ...prev, 
              quantity: e.target.value 
            }))}
            placeholder="Enter quantity"
          />
          
          <Select
            label="Reason"
            options={stockReasonOptions}
            value={stockUpdateData.reason}
            onChange={(e) => setStockUpdateData(prev => ({ 
              ...prev, 
              reason: e.target.value 
            }))}
          />
          
          <Input
            label="Notes (Optional)"
            value={stockUpdateData.notes}
            onChange={(e) => setStockUpdateData(prev => ({ 
              ...prev, 
              notes: e.target.value 
            }))}
            placeholder="Add notes about this stock update"
          />
          
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setShowStockModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleStockUpdate}>
              Update Stock
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};