import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  ArrowUpDown, Search, Filter, Download, Printer, RefreshCw, 
  ArrowLeft, Calendar, Package, Warehouse, ArrowUp, ArrowDown,
  SortAsc, SortDesc, BarChart3, PieChart, User, Clock,
  Info, CheckCircle, XCircle, Eye
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import { Select } from '../../components/UI/Select';
import { Badge } from '../../components/UI/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/UI/Table';
import { reportsAPI, productsAPI, inventoryAPI } from '../../lib/api';
import { formatCurrency, formatDate, debounce } from '../../utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import toast from 'react-hot-toast';

export const StockMovementReport: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  
  const [movements, setMovements] = useState<any[]>([]);
  const [groupedMovements, setGroupedMovements] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredMovements, setFilteredMovements] = useState<any[]>([]);
  
  const [filters, setFilters] = useState({
    startDate: queryParams.get('startDate') || '',
    endDate: queryParams.get('endDate') || '',
    product: queryParams.get('product') || '',
    type: queryParams.get('type') || '',
    reason: queryParams.get('reason') || '',
    location: queryParams.get('location') || '',
    groupBy: queryParams.get('groupBy') || 'day'
  });

  // Debounced search function
  const debouncedSearch = debounce((searchTerm: string) => {
    if (!searchTerm) {
      setFilteredMovements(movements);
      return;
    }
    
    const filtered = movements.filter(movement => 
      (typeof movement.product === 'object' && movement.product.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (typeof movement.product === 'object' && movement.product.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (movement.notes && movement.notes.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    
    setFilteredMovements(filtered);
  }, 300);

  useEffect(() => {
    fetchProducts();
    fetchLocations();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [filters]);

  useEffect(() => {
    debouncedSearch(searchTerm);
  }, [searchTerm, movements]);

  const fetchProducts = async () => {
    try {
      const response = await productsAPI.getAll({ limit: 100 });
      setProducts(response.data.data);
    } catch (error) {
      console.error('Failed to fetch products:', error);
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
      const response = await reportsAPI.getStockMovementReport(filters);
      setMovements(response.data.data.movements);
      setGroupedMovements(response.data.data.groupedMovements);
      setSummary(response.data.data.summary);
      setFilteredMovements(response.data.data.movements);
    } catch (error) {
      console.error('Failed to fetch stock movement report:', error);
      toast.error('Failed to load stock movement report');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await reportsAPI.exportReportData({
        reportType: 'stock-movements',
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

  const getMovementTypeBadge = (type: string) => {
    switch (type) {
      case 'in':
        return <Badge variant="success" className="flex items-center gap-1">
          <ArrowUp className="w-3 h-3" />
          In
        </Badge>;
      case 'out':
        return <Badge variant="danger" className="flex items-center gap-1">
          <ArrowDown className="w-3 h-3" />
          Out
        </Badge>;
      case 'transfer':
        return <Badge variant="info" className="flex items-center gap-1">
          <ArrowUpDown className="w-3 h-3" />
          Transfer
        </Badge>;
      case 'adjustment':
        return <Badge variant="warning" className="flex items-center gap-1">
          <RefreshCw className="w-3 h-3" />
          Adjustment
        </Badge>;
      default:
        return <Badge variant="default">{type}</Badge>;
    }
  };

  const getReasonBadge = (reason: string) => {
    const variants = {
      purchase: 'success',
      sale: 'info',
      return: 'warning',
      damage: 'danger',
      loss: 'danger',
      theft: 'danger',
      transfer: 'info',
      adjustment: 'warning',
      opening_stock: 'success',
      manufacturing: 'success'
    } as const;
    
    return <Badge variant={variants[reason as keyof typeof variants] || 'default'}>
      {reason.replace('_', ' ').toUpperCase()}
    </Badge>;
  };

  const typeOptions = [
    { value: '', label: 'All Types' },
    { value: 'in', label: 'Stock In' },
    { value: 'out', label: 'Stock Out' },
    { value: 'transfer', label: 'Transfer' },
    { value: 'adjustment', label: 'Adjustment' }
  ];

  const reasonOptions = [
    { value: '', label: 'All Reasons' },
    { value: 'purchase', label: 'Purchase' },
    { value: 'sale', label: 'Sale' },
    { value: 'return', label: 'Return' },
    { value: 'damage', label: 'Damage' },
    { value: 'loss', label: 'Loss' },
    { value: 'theft', label: 'Theft' },
    { value: 'transfer', label: 'Transfer' },
    { value: 'adjustment', label: 'Adjustment' },
    { value: 'opening_stock', label: 'Opening Stock' },
    { value: 'manufacturing', label: 'Manufacturing' }
  ];

  const groupByOptions = [
    { value: 'day', label: 'Group by Day' },
    { value: 'week', label: 'Group by Week' },
    { value: 'month', label: 'Group by Month' },
    { value: 'product', label: 'Group by Product' },
    { value: 'type', label: 'Group by Type' },
    { value: 'reason', label: 'Group by Reason' }
  ];

  // Prepare chart data
  const getTypeChartData = () => {
    if (!summary) return [];
    
    return [
      { name: 'In', value: summary.inMovements, color: '#10B981' },
      { name: 'Out', value: summary.outMovements, color: '#EF4444' },
      { name: 'Transfer', value: summary.transferMovements, color: '#3B82F6' },
      { name: 'Adjustment', value: summary.adjustmentMovements, color: '#F59E0B' }
    ];
  };

  const getReasonChartData = () => {
    if (!summary) return [];
    
    return Object.entries(summary.reasonCounts).map(([reason, count]) => ({
      name: reason.replace('_', ' ').toUpperCase(),
      value: count,
      color: reason === 'purchase' ? '#10B981' :
             reason === 'sale' ? '#3B82F6' :
             reason === 'return' ? '#F59E0B' :
             reason === 'damage' || reason === 'loss' || reason === 'theft' ? '#EF4444' :
             reason === 'transfer' ? '#8B5CF6' :
             reason === 'adjustment' ? '#F59E0B' :
             reason === 'opening_stock' ? '#10B981' :
             reason === 'manufacturing' ? '#10B981' : '#6B7280'
    }));
  };

  const getGroupedChartData = () => {
    if (!groupedMovements || groupedMovements.length === 0) return [];
    
    if (filters.groupBy === 'day' || filters.groupBy === 'week' || filters.groupBy === 'month') {
      return groupedMovements.map((item: any) => ({
        name: item[filters.groupBy] || item.date || item.weekStart || item.month,
        in: item.in,
        out: item.out,
        transfer: item.transfer,
        adjustment: item.adjustment,
        total: item.total
      }));
    } else if (filters.groupBy === 'product') {
      return groupedMovements.slice(0, 10).map((item: any) => ({
        name: item.productName,
        in: item.in,
        out: item.out,
        transfer: item.transfer,
        adjustment: item.adjustment,
        total: item.total
      }));
    } else if (filters.groupBy === 'type') {
      return groupedMovements.map((item: any) => ({
        name: item.type.toUpperCase(),
        quantity: item.quantity,
        value: item.value
      }));
    } else if (filters.groupBy === 'reason') {
      return groupedMovements.map((item: any) => ({
        name: item.reason.replace('_', ' ').toUpperCase(),
        quantity: item.quantity,
        value: item.value
      }));
    }
    
    return [];
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
            <h1 className="text-2xl font-bold text-gray-900">Stock Movement Report</h1>
            <p className="text-gray-600">
              Analyze inventory movements and stock changes
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
                  <p className="text-sm text-gray-600">Total Movements</p>
                  <p className="text-2xl font-bold">{summary.totalMovements}</p>
                </div>
                <ArrowUpDown className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Stock In</p>
                  <p className="text-2xl font-bold text-green-600">{summary.totalQuantityIn} units</p>
                </div>
                <ArrowUp className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Stock Out</p>
                  <p className="text-2xl font-bold text-red-600">{summary.totalQuantityOut} units</p>
                </div>
                <ArrowDown className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Value</p>
                  <p className="text-2xl font-bold text-purple-600">{formatCurrency(summary.totalValue)}</p>
                </div>
                <Package className="w-8 h-8 text-purple-500" />
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
                placeholder="Search movements..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select
              options={[
                { value: '', label: 'All Products' },
                ...products.map(product => ({ value: product._id, label: `${product.name} (${product.sku})` }))
              ]}
              value={filters.product}
              onChange={(e) => handleFilterChange('product', e.target.value)}
              placeholder="Filter by product"
            />
            
            <Select
              options={typeOptions}
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              placeholder="Filter by type"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <Select
              options={reasonOptions}
              value={filters.reason}
              onChange={(e) => handleFilterChange('reason', e.target.value)}
              placeholder="Filter by reason"
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
                options={[
                  { value: '', label: 'All Locations' },
                  ...locations.map(location => ({ value: location._id, label: location.name }))
                ]}
                value={filters.location}
                onChange={(e) => handleFilterChange('location', e.target.value)}
                placeholder="Filter by location"
                className="w-48"
              />
              
              <Select
                options={groupByOptions}
                value={filters.groupBy}
                onChange={(e) => handleFilterChange('groupBy', e.target.value)}
                className="w-48"
              />
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFilters({
                  startDate: '',
                  endDate: '',
                  product: '',
                  type: '',
                  reason: '',
                  location: '',
                  groupBy: 'day'
                });
                navigate('/reports/stock-movements');
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Movement Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Movement Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={getGroupedChartData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {filters.groupBy === 'type' || filters.groupBy === 'reason' ? (
                    <>
                      <Bar dataKey="quantity" name="Quantity" fill="#3B82F6" />
                      <Bar dataKey="value" name="Value" fill="#10B981" />
                    </>
                  ) : (
                    <>
                      <Bar dataKey="in" name="In" stackId="a" fill="#10B981" />
                      <Bar dataKey="out" name="Out" stackId="a" fill="#EF4444" />
                      <Bar dataKey="transfer" name="Transfer" stackId="a" fill="#3B82F6" />
                      <Bar dataKey="adjustment" name="Adjustment" stackId="a" fill="#F59E0B" />
                    </>
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Movement Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChart className="w-5 h-5 mr-2" />
              Movement Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 h-80">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-4 text-center">By Type</h4>
                <ResponsiveContainer width="100%" height="90%">
                  <PieChart>
                    <Pie
                      data={getTypeChartData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {getTypeChartData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [value, 'Count']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-4 text-center">By Reason</h4>
                <ResponsiveContainer width="100%" height="90%">
                  <PieChart>
                    <Pie
                      data={getReasonChartData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => 
                        percent > 0.05 ? `${name}: ${(percent * 100).toFixed(0)}%` : ''
                      }
                    >
                      {getReasonChartData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [value, 'Count']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grouped Data Table */}
      {groupedMovements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              {filters.groupBy === 'day' && 'Movements by Day'}
              {filters.groupBy === 'week' && 'Movements by Week'}
              {filters.groupBy === 'month' && 'Movements by Month'}
              {filters.groupBy === 'product' && 'Movements by Product'}
              {filters.groupBy === 'type' && 'Movements by Type'}
              {filters.groupBy === 'reason' && 'Movements by Reason'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  {filters.groupBy === 'day' && <TableHead>Date</TableHead>}
                  {filters.groupBy === 'week' && <TableHead>Week Starting</TableHead>}
                  {filters.groupBy === 'month' && <TableHead>Month</TableHead>}
                  {filters.groupBy === 'product' && <TableHead>Product</TableHead>}
                  {filters.groupBy === 'type' && <TableHead>Type</TableHead>}
                  {filters.groupBy === 'reason' && <TableHead>Reason</TableHead>}
                  
                  {(filters.groupBy === 'day' || filters.groupBy === 'week' || filters.groupBy === 'month' || filters.groupBy === 'product') && (
                    <>
                      <TableHead>In</TableHead>
                      <TableHead>Out</TableHead>
                      <TableHead>Transfer</TableHead>
                      <TableHead>Adjustment</TableHead>
                    </>
                  )}
                  
                  <TableHead>Total Quantity</TableHead>
                  <TableHead>Total Value</TableHead>
                  
                  {filters.groupBy === 'product' && (
                    <>
                      <TableHead>SKU</TableHead>
                    </>
                  )}
                  
                  {filters.groupBy === 'type' || filters.groupBy === 'reason' && (
                    <>
                      <TableHead>Count</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedMovements.map((item, index) => (
                  <TableRow key={index}>
                    {filters.groupBy === 'day' && <TableCell>{item.date}</TableCell>}
                    {filters.groupBy === 'week' && <TableCell>{item.weekStart}</TableCell>}
                    {filters.groupBy === 'month' && <TableCell>{item.month}</TableCell>}
                    {filters.groupBy === 'product' && <TableCell>{item.productName}</TableCell>}
                    {filters.groupBy === 'type' && <TableCell>{getMovementTypeBadge(item.type)}</TableCell>}
                    {filters.groupBy === 'reason' && <TableCell>{getReasonBadge(item.reason)}</TableCell>}
                    
                    {(filters.groupBy === 'day' || filters.groupBy === 'week' || filters.groupBy === 'month' || filters.groupBy === 'product') && (
                      <>
                        <TableCell>{item.in}</TableCell>
                        <TableCell>{item.out}</TableCell>
                        <TableCell>{item.transfer}</TableCell>
                        <TableCell>{item.adjustment}</TableCell>
                      </>
                    )}
                    
                    <TableCell>
                      <span className="font-medium">
                        {filters.groupBy === 'type' || filters.groupBy === 'reason' ? item.quantity : item.total}
                      </span>
                    </TableCell>
                    <TableCell>{formatCurrency(item.value)}</TableCell>
                    
                    {filters.groupBy === 'product' && (
                      <>
                        <TableCell>{item.productSku}</TableCell>
                      </>
                    )}
                    
                    {(filters.groupBy === 'type' || filters.groupBy === 'reason') && (
                      <>
                        <TableCell>{item.count}</TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Movements Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ArrowUpDown className="w-5 h-5 mr-2" />
            Stock Movements ({filteredMovements.length})
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
          ) : filteredMovements.length === 0 ? (
            <div className="text-center py-12">
              <ArrowUpDown className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900">No movements found</h3>
              <p className="text-gray-600 mt-2">
                Try adjusting your filters or search criteria
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Previous Stock</TableHead>
                  <TableHead>New Stock</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Performed By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMovements.map((movement) => (
                  <TableRow key={movement._id}>
                    <TableCell>
                      {formatDate(movement.movementDate)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        {typeof movement.product === 'object' && movement.product.images && movement.product.images[0] ? (
                          <img
                            src={movement.product.images[0].url}
                            alt={movement.product.name}
                            className="w-8 h-8 rounded object-cover mr-2"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center mr-2">
                            <Package className="w-4 h-4 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">
                            {typeof movement.product === 'object' ? movement.product.name : 'Unknown Product'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {typeof movement.product === 'object' ? movement.product.sku : ''}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getMovementTypeBadge(movement.type)}
                    </TableCell>
                    <TableCell>
                      {getReasonBadge(movement.reason)}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        {movement.quantity} {typeof movement.product === 'object' ? movement.product.unit : ''}
                      </span>
                    </TableCell>
                    <TableCell>
                      {movement.previousStock}
                    </TableCell>
                    <TableCell>
                      {movement.newStock}
                    </TableCell>
                    <TableCell>
                      {movement.type === 'transfer' ? (
                        <div>
                          <p className="text-xs text-gray-500">From:</p>
                          <p className="text-sm">
                            {typeof movement.location.from === 'object' 
                              ? movement.location.from.name 
                              : 'Unknown'
                            }
                          </p>
                          <p className="text-xs text-gray-500 mt-1">To:</p>
                          <p className="text-sm">
                            {typeof movement.location.to === 'object' 
                              ? movement.location.to.name 
                              : 'Unknown'
                            }
                          </p>
                        </div>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {typeof movement.performedBy === 'object' 
                        ? `${movement.performedBy.firstName} ${movement.performedBy.lastName}`
                        : 'Unknown User'
                      }
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};