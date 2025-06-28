import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Package, Search, Filter, Download, Printer, RefreshCw, 
  ArrowLeft, AlertTriangle, XCircle, CheckCircle, Calendar,
  SortAsc, SortDesc, Warehouse, Tag, ArrowUp, ArrowDown,
  ArrowUpDown, Clock, BarChart3, Layers, Eye
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import { Select } from '../../components/UI/Select';
import { Badge } from '../../components/UI/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/UI/Table';
import { reportsAPI, categoriesAPI, inventoryAPI } from '../../lib/api';
import { formatCurrency, formatDate, debounce } from '../../utils';
import toast from 'react-hot-toast';

export const InventoryReport: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  
  const [products, setProducts] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  
  const [filters, setFilters] = useState({
    category: queryParams.get('category') || '',
    status: queryParams.get('status') || '',
    location: queryParams.get('location') || '',
    startDate: queryParams.get('startDate') || '',
    endDate: queryParams.get('endDate') || '',
    sortBy: queryParams.get('sortBy') || 'name',
    sortOrder: queryParams.get('sortOrder') || 'asc'
  });

  // Debounced search function
  const debouncedSearch = debounce((searchTerm: string) => {
    if (!searchTerm) {
      setFilteredProducts(products);
      return;
    }
    
    const filtered = products.filter(product => 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (typeof product.category === 'object' && product.category.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    
    setFilteredProducts(filtered);
  }, 300);

  useEffect(() => {
    fetchCategories();
    fetchLocations();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [filters]);

  useEffect(() => {
    debouncedSearch(searchTerm);
  }, [searchTerm, products]);

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getAll({ limit: 100 });
      setCategories(response.data.data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await inventoryAPI.getLocations({ limit: 100 });
      setLocations(response.data.data);
    } catch (error) {
      console.error('Failed to fetch locations:', error);
    }
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      const response = await reportsAPI.getInventoryReport(filters);
      setProducts(response.data.data.products);
      setFilteredProducts(response.data.data.products);
      setSummary(response.data.data.summary);
    } catch (error) {
      console.error('Failed to fetch inventory report:', error);
      toast.error('Failed to load inventory report');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await reportsAPI.exportReportData({
        reportType: 'inventory',
        format: 'csv',
        ...filters
      });
      
      // Convert to CSV and download
      const csvContent = [
        Object.keys(response.data.data[0]).join(','),
        ...response.data.data.map((row: any) => Object.values(row).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${response.data.fileName}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Report exported successfully');
    } catch (error) {
      toast.error('Failed to export report');
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    
    // Update URL query params
    const params = new URLSearchParams(location.search);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    navigate({ search: params.toString() });
  };

  const getStockStatusBadge = (product: any) => {
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
    } else {
      return <Badge variant="success" className="flex items-center gap-1">
        <CheckCircle className="w-3 h-3" />
        In Stock
      </Badge>;
    }
  };

  const getMovementBadge = (type: string, quantity: number) => {
    switch (type) {
      case 'in':
        return <Badge variant="success" className="flex items-center gap-1">
          <ArrowUp className="w-3 h-3" />
          {quantity}
        </Badge>;
      case 'out':
        return <Badge variant="danger" className="flex items-center gap-1">
          <ArrowDown className="w-3 h-3" />
          {quantity}
        </Badge>;
      case 'transfer':
        return <Badge variant="info" className="flex items-center gap-1">
          <ArrowUpDown className="w-3 h-3" />
          {quantity}
        </Badge>;
      case 'adjustment':
        return <Badge variant="warning" className="flex items-center gap-1">
          <RefreshCw className="w-3 h-3" />
          {quantity}
        </Badge>;
      default:
        return <Badge variant="default">{quantity}</Badge>;
    }
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
    { value: 'currentStock', label: 'Stock Level' },
    { value: 'costPrice', label: 'Cost Price' },
    { value: 'sellingPrice', label: 'Selling Price' },
    { value: 'stockValue', label: 'Stock Value' },
    { value: 'lastStockUpdate', label: 'Last Updated' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => navigate('/reports')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inventory Report</h1>
            <p className="text-gray-600">
              Analyze your inventory status and stock levels
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" onClick={() => fetchReport()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Products</p>
                  <p className="text-2xl font-bold">{summary.totalProducts}</p>
                </div>
                <Package className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Value</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalValue)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Low Stock Items</p>
                  <p className="text-2xl font-bold text-yellow-600">{summary.lowStockItems}</p>
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
                  <p className="text-2xl font-bold text-red-600">{summary.outOfStockItems}</p>
                </div>
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select
              options={[
                { value: '', label: 'All Categories' },
                ...categories.map(cat => ({ value: cat._id, label: cat.name }))
              ]}
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              placeholder="Filter by category"
            />
            
            <Select
              options={statusOptions}
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              placeholder="Filter by status"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <Select
              options={[
                { value: '', label: 'All Locations' },
                ...locations.map(loc => ({ value: loc._id, label: loc.name }))
              ]}
              value={filters.location}
              onChange={(e) => handleFilterChange('location', e.target.value)}
              placeholder="Filter by location"
            />
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex justify-between items-center mt-4 pt-4 border-t">
            <div className="flex items-center space-x-2">
              <Select
                options={sortOptions}
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="w-40"
              />
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleFilterChange('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {filters.sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
              </Button>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFilters({
                  category: '',
                  status: '',
                  location: '',
                  startDate: '',
                  endDate: '',
                  sortBy: 'name',
                  sortOrder: 'asc'
                });
                navigate('/reports/inventory');
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Package className="w-5 h-5 mr-2" />
            Inventory Items ({filteredProducts.length})
          </CardTitle>
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
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900">No products found</h3>
              <p className="text-gray-600 mt-2">
                Try adjusting your filters or search criteria
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Current Stock</TableHead>
                  <TableHead>Min. Stock</TableHead>
                  <TableHead>Cost Price</TableHead>
                  <TableHead>Selling Price</TableHead>
                  <TableHead>Stock Value</TableHead>
                  {summary?.movementStats && (
                    <>
                      <TableHead>Stock In</TableHead>
                      <TableHead>Stock Out</TableHead>
                    </>
                  )}
                  <TableHead>Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product._id}>
                    <TableCell>
                      <div className="flex items-center">
                        {product.images && product.images[0] ? (
                          <img
                            src={product.images[0].url}
                            alt={product.name}
                            className="w-8 h-8 rounded object-cover mr-2"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center mr-2">
                            <Package className="w-4 h-4 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-xs text-gray-500">{product.sku}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {typeof product.category === 'object' ? product.category.name : ''}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{product.currentStock} {product.unit}</span>
                    </TableCell>
                    <TableCell>
                      <span>{product.minimumStock} {product.unit}</span>
                    </TableCell>
                    <TableCell>
                      <span>{formatCurrency(product.costPrice)}</span>
                    </TableCell>
                    <TableCell>
                      <span>{formatCurrency(product.sellingPrice)}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{formatCurrency(product.currentStock * product.costPrice)}</span>
                    </TableCell>
                    {summary?.movementStats && (
                      <>
                        <TableCell>
                          {product.movements?.in ? getMovementBadge('in', product.movements.in) : '-'}
                        </TableCell>
                        <TableCell>
                          {product.movements?.out ? getMovementBadge('out', product.movements.out) : '-'}
                        </TableCell>
                      </>
                    )}
                    <TableCell>
                      {getStockStatusBadge(product)}
                    </TableCell>
                    <TableCell>
                      {product.lastStockUpdate ? formatDate(product.lastStockUpdate) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Movement Summary */}
      {summary?.movementStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ArrowUpDown className="w-5 h-5 mr-2" />
              Stock Movement Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-green-50 rounded-lg text-center">
                <div className="flex items-center justify-center mb-2">
                  <ArrowUp className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-2xl font-bold text-green-600">{summary.movementStats.totalIn}</p>
                <p className="text-sm text-green-600">Total Stock In</p>
              </div>
              
              <div className="p-4 bg-red-50 rounded-lg text-center">
                <div className="flex items-center justify-center mb-2">
                  <ArrowDown className="w-5 h-5 text-red-600" />
                </div>
                <p className="text-2xl font-bold text-red-600">{summary.movementStats.totalOut}</p>
                <p className="text-sm text-red-600">Total Stock Out</p>
              </div>
              
              <div className="p-4 bg-blue-50 rounded-lg text-center">
                <div className="flex items-center justify-center mb-2">
                  <ArrowUpDown className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-blue-600">{summary.movementStats.totalTransfer}</p>
                <p className="text-sm text-blue-600">Total Transfers</p>
              </div>
              
              <div className="p-4 bg-yellow-50 rounded-lg text-center">
                <div className="flex items-center justify-center mb-2">
                  <RefreshCw className="w-5 h-5 text-yellow-600" />
                </div>
                <p className="text-2xl font-bold text-yellow-600">{summary.movementStats.totalAdjustment}</p>
                <p className="text-sm text-yellow-600">Total Adjustments</p>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t text-center">
              <p className="text-sm text-gray-600 mb-2">
                Stock movement data for period: {filters.startDate || 'All time'} to {filters.endDate || 'Present'}
              </p>
              <Button variant="outline" size="sm" onClick={() => navigate('/reports/stock-movements')}>
                <Layers className="w-4 h-4 mr-2" />
                View Detailed Movement Report
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};