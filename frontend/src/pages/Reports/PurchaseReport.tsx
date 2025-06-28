import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  ShoppingCart, Search, Filter, Download, Printer, RefreshCw, 
  ArrowLeft, Calendar, DollarSign, Truck, Package, 
  SortAsc, SortDesc, CheckCircle, XCircle, Clock, AlertTriangle,
  BarChart3, PieChart, TrendingUp, TrendingDown, Eye
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import { Select } from '../../components/UI/Select';
import { Badge } from '../../components/UI/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/UI/Table';
import { reportsAPI, suppliersAPI } from '../../lib/api';
import { formatCurrency, formatDate, debounce } from '../../utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import toast from 'react-hot-toast';

export const PurchaseReport: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  
  const [purchases, setPurchases] = useState<any[]>([]);
  const [groupedPurchases, setGroupedPurchases] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredPurchases, setFilteredPurchases] = useState<any[]>([]);
  
  const [filters, setFilters] = useState({
    startDate: queryParams.get('startDate') || '',
    endDate: queryParams.get('endDate') || '',
    supplier: queryParams.get('supplier') || '',
    status: queryParams.get('status') || '',
    paymentStatus: queryParams.get('paymentStatus') || '',
    groupBy: queryParams.get('groupBy') || 'day'
  });

  // Debounced search function
  const debouncedSearch = debounce((searchTerm: string) => {
    if (!searchTerm) {
      setFilteredPurchases(purchases);
      return;
    }
    
    const filtered = purchases.filter(purchase => 
      purchase.purchaseOrderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (typeof purchase.supplier === 'object' && purchase.supplier.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    
    setFilteredPurchases(filtered);
  }, 300);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [filters]);

  useEffect(() => {
    debouncedSearch(searchTerm);
  }, [searchTerm, purchases]);

  const fetchSuppliers = async () => {
    try {
      const response = await suppliersAPI.getAll({ limit: 100 });
      setSuppliers(response.data.data);
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    }
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      const response = await reportsAPI.getPurchaseReport(filters);
      setPurchases(response.data.data.purchases);
      setGroupedPurchases(response.data.data.groupedPurchases);
      setSummary(response.data.data.summary);
      setFilteredPurchases(response.data.data.purchases);
    } catch (error) {
      console.error('Failed to fetch purchase report:', error);
      toast.error('Failed to load purchase report');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await reportsAPI.exportReportData({
        reportType: 'purchases',
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

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'draft', label: 'Draft' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'ordered', label: 'Ordered' },
    { value: 'partially_received', label: 'Partially Received' },
    { value: 'received', label: 'Received' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  const paymentStatusOptions = [
    { value: '', label: 'All Payment Status' },
    { value: 'paid', label: 'Paid' },
    { value: 'partially_paid', label: 'Partially Paid' },
    { value: 'unpaid', label: 'Unpaid' }
  ];

  const groupByOptions = [
    { value: 'day', label: 'Group by Day' },
    { value: 'week', label: 'Group by Week' },
    { value: 'month', label: 'Group by Month' },
    { value: 'supplier', label: 'Group by Supplier' },
    { value: 'product', label: 'Group by Product' }
  ];

  // Prepare chart data
  const getStatusChartData = () => {
    if (!summary) return [];
    
    return [
      { name: 'Draft', value: summary.statusCounts.draft, color: '#6B7280' },
      { name: 'Pending', value: summary.statusCounts.pending, color: '#F59E0B' },
      { name: 'Approved', value: summary.statusCounts.approved, color: '#3B82F6' },
      { name: 'Ordered', value: summary.statusCounts.ordered, color: '#8B5CF6' },
      { name: 'Partially Received', value: summary.statusCounts.partially_received, color: '#F59E0B' },
      { name: 'Received', value: summary.statusCounts.received, color: '#10B981' },
      { name: 'Cancelled', value: summary.statusCounts.cancelled, color: '#EF4444' }
    ];
  };

  const getPaymentStatusChartData = () => {
    if (!summary) return [];
    
    return [
      { name: 'Paid', value: summary.paymentStatusCounts.paid, color: '#10B981' },
      { name: 'Partially Paid', value: summary.paymentStatusCounts.partially_paid, color: '#F59E0B' },
      { name: 'Unpaid', value: summary.paymentStatusCounts.unpaid, color: '#6B7280' }
    ];
  };

  const getGroupedChartData = () => {
    if (!groupedPurchases || groupedPurchases.length === 0) return [];
    
    if (filters.groupBy === 'day' || filters.groupBy === 'week' || filters.groupBy === 'month') {
      return groupedPurchases.map((item: any) => ({
        name: item[filters.groupBy] || item.date || item.weekStart || item.month,
        amount: item.amount,
        count: item.count
      }));
    } else if (filters.groupBy === 'supplier') {
      return groupedPurchases.slice(0, 10).map((item: any) => ({
        name: item.supplierName,
        amount: item.amount,
        count: item.count
      }));
    } else if (filters.groupBy === 'product') {
      return groupedPurchases.slice(0, 10).map((item: any) => ({
        name: item.productName,
        amount: item.amount,
        quantity: item.quantity
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
            <h1 className="text-2xl font-bold text-gray-900">Purchase Report</h1>
            <p className="text-gray-600">
              Analyze your purchase orders and supplier performance
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
                  <p className="text-sm text-gray-600">Total Purchases</p>
                  <p className="text-2xl font-bold">{summary.totalPurchases}</p>
                </div>
                <ShoppingCart className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Amount</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalAmount)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Average Order</p>
                  <p className="text-2xl font-bold text-purple-600">{formatCurrency(summary.averageOrderValue)}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Discount</p>
                  <p className="text-2xl font-bold text-orange-600">{formatCurrency(summary.totalDiscount)}</p>
                </div>
                <TrendingDown className="w-8 h-8 text-orange-500" />
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
                placeholder="Search purchases..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select
              options={[
                { value: '', label: 'All Suppliers' },
                ...suppliers.map(supplier => ({ value: supplier._id, label: supplier.name }))
              ]}
              value={filters.supplier}
              onChange={(e) => handleFilterChange('supplier', e.target.value)}
              placeholder="Filter by supplier"
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
              options={paymentStatusOptions}
              value={filters.paymentStatus}
              onChange={(e) => handleFilterChange('paymentStatus', e.target.value)}
              placeholder="Filter by payment status"
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
                  supplier: '',
                  status: '',
                  paymentStatus: '',
                  groupBy: 'day'
                });
                navigate('/reports/purchases');
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Purchase Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Purchase Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={getGroupedChartData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="left" orientation="left" stroke="#3B82F6" />
                  <YAxis yAxisId="right" orientation="right" stroke="#10B981" />
                  <Tooltip formatter={(value) => typeof value === 'number' ? 
                    value.toString().includes('.') ? formatCurrency(value) : value : value} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="count" name="Number of Purchases" fill="#3B82F6" />
                  <Bar yAxisId="right" dataKey="amount" name="Amount" fill="#10B981" />
                  {filters.groupBy === 'product' && (
                    <Bar yAxisId="left" dataKey="quantity" name="Quantity Purchased" fill="#F59E0B" />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChart className="w-5 h-5 mr-2" />
              Purchase Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 h-80">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-4 text-center">Status Distribution</h4>
                <ResponsiveContainer width="100%" height="90%">
                  <PieChart>
                    <Pie
                      data={getStatusChartData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {getStatusChartData().map((entry, index) => (
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
                      data={getPaymentStatusChartData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {getPaymentStatusChartData().map((entry, index) => (
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

      {/* Grouped Data Table */}
      {groupedPurchases.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              {filters.groupBy === 'day' && 'Purchases by Day'}
              {filters.groupBy === 'week' && 'Purchases by Week'}
              {filters.groupBy === 'month' && 'Purchases by Month'}
              {filters.groupBy === 'supplier' && 'Purchases by Supplier'}
              {filters.groupBy === 'product' && 'Purchases by Product'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  {filters.groupBy === 'day' && <TableHead>Date</TableHead>}
                  {filters.groupBy === 'week' && <TableHead>Week Starting</TableHead>}
                  {filters.groupBy === 'month' && <TableHead>Month</TableHead>}
                  {filters.groupBy === 'supplier' && <TableHead>Supplier</TableHead>}
                  {filters.groupBy === 'product' && <TableHead>Product</TableHead>}
                  
                  {filters.groupBy !== 'product' && <TableHead>Orders</TableHead>}
                  {filters.groupBy === 'product' && <TableHead>Quantity</TableHead>}
                  
                  <TableHead>Amount</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Tax</TableHead>
                  
                  {filters.groupBy === 'supplier' && (
                    <>
                      <TableHead>Email</TableHead>
                    </>
                  )}
                  
                  {filters.groupBy === 'product' && (
                    <>
                      <TableHead>SKU</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedPurchases.map((item, index) => (
                  <TableRow key={index}>
                    {filters.groupBy === 'day' && <TableCell>{item.date}</TableCell>}
                    {filters.groupBy === 'week' && <TableCell>{item.weekStart}</TableCell>}
                    {filters.groupBy === 'month' && <TableCell>{item.month}</TableCell>}
                    {filters.groupBy === 'supplier' && <TableCell>{item.supplierName}</TableCell>}
                    {filters.groupBy === 'product' && <TableCell>{item.productName}</TableCell>}
                    
                    {filters.groupBy !== 'product' && <TableCell>{item.count}</TableCell>}
                    {filters.groupBy === 'product' && <TableCell>{item.quantity}</TableCell>}
                    
                    <TableCell>{formatCurrency(item.amount)}</TableCell>
                    <TableCell>{formatCurrency(item.discount || 0)}</TableCell>
                    <TableCell>{formatCurrency(item.tax || 0)}</TableCell>
                    
                    {filters.groupBy === 'supplier' && (
                      <>
                        <TableCell>{item.supplierEmail}</TableCell>
                      </>
                    )}
                    
                    {filters.groupBy === 'product' && (
                      <>
                        <TableCell>{item.productSku}</TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Purchases Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ShoppingCart className="w-5 h-5 mr-2" />
            Purchase Transactions ({filteredPurchases.length})
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
          ) : filteredPurchases.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900">No purchases found</h3>
              <p className="text-gray-600 mt-2">
                Try adjusting your filters or search criteria
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPurchases.map((purchase) => (
                  <TableRow key={purchase._id}>
                    <TableCell>
                      <span className="font-medium">{purchase.purchaseOrderNumber}</span>
                    </TableCell>
                    <TableCell>
                      {formatDate(purchase.orderDate)}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {typeof purchase.supplier === 'object' ? purchase.supplier.name : 'Unknown'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {typeof purchase.supplier === 'object' ? purchase.supplier.email : ''}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span>{purchase.items.length}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{formatCurrency(purchase.grandTotal)}</span>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(purchase.status)}
                    </TableCell>
                    <TableCell>
                      {getPaymentStatusBadge(purchase.paymentStatus)}
                    </TableCell>
                    <TableCell>
                      {typeof purchase.createdBy === 'object' ? 
                        `${purchase.createdBy.firstName} ${purchase.createdBy.lastName}` : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/purchases/${purchase._id}`)}
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
    </div>
  );
};