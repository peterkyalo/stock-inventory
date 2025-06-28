import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Package, Search, Filter, Download, Printer, RefreshCw, 
  ArrowLeft, Calendar, DollarSign, Tag, Star, 
  SortAsc, SortDesc, BarChart3, PieChart, TrendingUp, TrendingDown,
  ShoppingCart, Eye, ArrowUpDown, Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import { Select } from '../../components/UI/Select';
import { Badge } from '../../components/UI/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/UI/Table';
import { reportsAPI, categoriesAPI } from '../../lib/api';
import { formatCurrency, formatDate, debounce } from '../../utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import toast from 'react-hot-toast';

export const ProductPerformanceReport: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  
  const [products, setProducts] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  
  const [filters, setFilters] = useState({
    startDate: queryParams.get('startDate') || '',
    endDate: queryParams.get('endDate') || '',
    category: queryParams.get('category') || '',
    brand: queryParams.get('brand') || '',
    sortBy: queryParams.get('sortBy') || 'sales',
    limit: queryParams.get('limit') || '20'
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
  }, []);

  useEffect(() => {
    fetchReport();
  }, [filters]);

  useEffect(() => {
    debouncedSearch(searchTerm);
  }, [searchTerm, products]);

  useEffect(() => {
    // Extract unique brands from products
    if (products.length > 0) {
      const uniqueBrands = [...new Set(products.map(product => product.brand))];
      setBrands(uniqueBrands);
    }
  }, [products]);

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getAll({ limit: 100 });
      setCategories(response.data.data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      const response = await reportsAPI.getProductPerformanceReport(filters);
      setProducts(response.data.data.products);
      setFilteredProducts(response.data.data.products);
      setSummary(response.data.data.summary);
    } catch (error) {
      console.error('Failed to fetch product performance report:', error);
      toast.error('Failed to load product performance report');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await reportsAPI.exportReportData({
        reportType: 'product-performance',
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

  const sortByOptions = [
    { value: 'sales', label: 'Sales Quantity' },
    { value: 'revenue', label: 'Revenue' },
    { value: 'profit', label: 'Profit' },
    { value: 'margin', label: 'Profit Margin' },
    { value: 'turnover', label: 'Inventory Turnover' }
  ];

  const limitOptions = [
    { value: '10', label: 'Top 10' },
    { value: '20', label: 'Top 20' },
    { value: '50', label: 'Top 50' },
    { value: '100', label: 'Top 100' }
  ];

  // Prepare chart data
  const getTopProductsChartData = () => {
    if (!products || products.length === 0) return [];
    
    return products.slice(0, 10).map(product => ({
      name: product.name,
      sales: product.quantitySold,
      revenue: product.revenue,
      profit: product.profit
    }));
  };

  const getCategoryChartData = () => {
    if (!products || products.length === 0) return [];
    
    const categoryData: Record<string, { name: string, sales: number, revenue: number, profit: number }> = {};
    
    products.forEach(product => {
      const categoryName = typeof product.category === 'object' ? product.category.name : 'Uncategorized';
      
      if (!categoryData[categoryName]) {
        categoryData[categoryName] = {
          name: categoryName,
          sales: 0,
          revenue: 0,
          profit: 0
        };
      }
      
      categoryData[categoryName].sales += product.quantitySold;
      categoryData[categoryName].revenue += product.revenue;
      categoryData[categoryName].profit += product.profit;
    });
    
    return Object.values(categoryData).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  };

  const getBrandChartData = () => {
    if (!products || products.length === 0) return [];
    
    const brandData: Record<string, { name: string, sales: number, revenue: number, profit: number }> = {};
    
    products.forEach(product => {
      const brandName = product.brand || 'Unbranded';
      
      if (!brandData[brandName]) {
        brandData[brandName] = {
          name: brandName,
          sales: 0,
          revenue: 0,
          profit: 0
        };
      }
      
      brandData[brandName].sales += product.quantitySold;
      brandData[brandName].revenue += product.revenue;
      brandData[brandName].profit += product.profit;
    });
    
    return Object.values(brandData).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  };

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
            <h1 className="text-2xl font-bold text-gray-900">Product Performance Report</h1>
            <p className="text-gray-600">
              Analyze product sales, revenue, and profitability
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
                  <p className="text-sm text-gray-600">Total Sales</p>
                  <p className="text-2xl font-bold text-green-600">{summary.totalSales} units</p>
                </div>
                <ShoppingCart className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(summary.totalRevenue)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Profit</p>
                  <p className="text-2xl font-bold text-purple-600">{formatCurrency(summary.totalProfit)}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-500" />
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
              options={[
                { value: '', label: 'All Brands' },
                ...brands.map(brand => ({ value: brand, label: brand }))
              ]}
              value={filters.brand}
              onChange={(e) => handleFilterChange('brand', e.target.value)}
              placeholder="Filter by brand"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
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
            
            <div className="flex items-end space-x-2">
              <Select
                label="Sort By"
                options={sortByOptions}
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="flex-1"
              />
              
              <Select
                options={limitOptions}
                value={filters.limit}
                onChange={(e) => handleFilterChange('limit', e.target.value)}
                className="w-24"
              />
            </div>
          </div>
          
          <div className="flex justify-end items-center mt-4 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFilters({
                  startDate: '',
                  endDate: '',
                  category: '',
                  brand: '',
                  sortBy: 'sales',
                  limit: '20'
                });
                navigate('/reports/product-performance');
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Top 10 Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={getTopProductsChartData()} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => 
                    typeof value === 'number' && value > 100 ? formatCurrency(value) : value
                  } />
                  <Legend />
                  <Bar dataKey="sales" name="Units Sold" fill="#3B82F6" />
                  <Bar dataKey="revenue" name="Revenue" fill="#10B981" />
                  <Bar dataKey="profit" name="Profit" fill="#8B5CF6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category & Brand Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Tag className="w-5 h-5 mr-2" />
              Category & Brand Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-4">Top Categories by Revenue</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={getCategoryChartData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Bar dataKey="revenue" name="Revenue" fill="#3B82F6" />
                    <Bar dataKey="profit" name="Profit" fill="#10B981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-4">Top Brands by Revenue</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={getBrandChartData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Bar dataKey="revenue" name="Revenue" fill="#8B5CF6" />
                    <Bar dataKey="profit" name="Profit" fill="#F59E0B" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Package className="w-5 h-5 mr-2" />
            Product Performance ({filteredProducts.length})
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
                  <TableHead>Quantity Sold</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Profit</TableHead>
                  <TableHead>Profit Margin</TableHead>
                  <TableHead>Current Stock</TableHead>
                  <TableHead>Inventory Turnover</TableHead>
                  <TableHead>Actions</TableHead>
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
                      <span className="font-medium">{product.quantitySold}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-blue-600">{formatCurrency(product.revenue)}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-green-600">{formatCurrency(product.profit)}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <span className="font-medium">{product.profitMargin.toFixed(1)}%</span>
                        {product.profitMargin > 30 ? (
                          <TrendingUp className="w-4 h-4 text-green-500 ml-1" />
                        ) : product.profitMargin < 10 ? (
                          <TrendingDown className="w-4 h-4 text-red-500 ml-1" />
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span>{product.currentStock}</span>
                    </TableCell>
                    <TableCell>
                      <span>{product.inventoryTurnover.toFixed(2)}</span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/products/${product._id}`)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Performance Insights */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Info className="w-5 h-5 mr-2" />
              Performance Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">Top Performers</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Top Selling Product:</span>
                    <span className="font-medium">{summary.topPerformer}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Average Profit Margin:</span>
                    <span className="font-medium">{summary.averageProfitMargin.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Products Analyzed:</span>
                    <span className="font-medium">{summary.totalProducts}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">Performance Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Sales:</span>
                    <span className="font-medium">{summary.totalSales} units</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Revenue:</span>
                    <span className="font-medium">{formatCurrency(summary.totalRevenue)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Profit:</span>
                    <span className="font-medium">{formatCurrency(summary.totalProfit)}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900">Performance Analysis</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      This report shows product performance for the period from {filters.startDate || 'all time'} to {filters.endDate || 'present'}.
                      {summary.averageProfitMargin >= 30 ? (
                        <span> Your average profit margin is excellent at {summary.averageProfitMargin.toFixed(1)}%, indicating strong pricing power.</span>
                      ) : summary.averageProfitMargin >= 15 ? (
                        <span> Your average profit margin is good at {summary.averageProfitMargin.toFixed(1)}%, showing healthy profitability.</span>
                      ) : (
                        <span> Your average profit margin is {summary.averageProfitMargin.toFixed(1)}%, which may indicate pricing or cost issues.</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};