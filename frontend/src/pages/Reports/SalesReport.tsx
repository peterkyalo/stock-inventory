import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  FileText, Search, Filter, Download, Printer, RefreshCw, 
  ArrowLeft, Calendar, DollarSign, User, Package, 
  SortAsc, SortDesc, CheckCircle, XCircle, Clock, AlertTriangle,
  Truck, BarChart3, PieChart, TrendingUp, TrendingDown, Eye
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import { Select } from '../../components/UI/Select';
import { Badge } from '../../components/UI/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/UI/Table';
import { reportsAPI, customersAPI, usersAPI } from '../../lib/api';
import { formatCurrency, formatDate, debounce } from '../../utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import toast from 'react-hot-toast';

export const SalesReport: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  
  const [sales, setSales] = useState<any[]>([]);
  const [groupedSales, setGroupedSales] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredSales, setFilteredSales] = useState<any[]>([]);
  
  const [filters, setFilters] = useState({
    startDate: queryParams.get('startDate') || '',
    endDate: queryParams.get('endDate') || '',
    customer: queryParams.get('customer') || '',
    status: queryParams.get('status') || '',
    paymentStatus: queryParams.get('paymentStatus') || '',
    salesPerson: queryParams.get('salesPerson') || '',
    groupBy: queryParams.get('groupBy') || 'day'
  });

  // Debounced search function
  const debouncedSearch = debounce((searchTerm: string) => {
    if (!searchTerm) {
      setFilteredSales(sales);
      return;
    }
    
    const filtered = sales.filter(sale => 
      sale.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (typeof sale.customer === 'object' && sale.customer.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    
    setFilteredSales(filtered);
  }, 300);

  useEffect(() => {
    fetchCustomers();
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [filters]);

  useEffect(() => {
    debouncedSearch(searchTerm);
  }, [searchTerm, sales]);

  const fetchCustomers = async () => {
    try {
      const response = await customersAPI.getAll({ limit: 100 });
      setCustomers(response.data.data);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await usersAPI.getAll({ limit: 100 });
      setUsers(response.data.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      const response = await reportsAPI.getSalesReport(filters);
      setSales(response.data.data.sales);
      setGroupedSales(response.data.data.groupedSales);
      setSummary(response.data.data.summary);
      setFilteredSales(response.data.data.sales);
    } catch (error) {
      console.error('Failed to fetch sales report:', error);
      toast.error('Failed to load sales report');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await reportsAPI.exportReportData({
        reportType: 'sales',
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

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'draft', label: 'Draft' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'returned', label: 'Returned' }
  ];

  const paymentStatusOptions = [
    { value: '', label: 'All Payment Status' },
    { value: 'paid', label: 'Paid' },
    { value: 'partially_paid', label: 'Partially Paid' },
    { value: 'unpaid', label: 'Unpaid' },
    { value: 'overdue', label: 'Overdue' }
  ];

  const groupByOptions = [
    { value: 'day', label: 'Group by Day' },
    { value: 'week', label: 'Group by Week' },
    { value: 'month', label: 'Group by Month' },
    { value: 'customer', label: 'Group by Customer' },
    { value: 'product', label: 'Group by Product' }
  ];

  // Prepare chart data
  const getStatusChartData = () => {
    if (!summary) return [];
    
    return [
      { name: 'Draft', value: summary.statusCounts.draft, color: '#6B7280' },
      { name: 'Confirmed', value: summary.statusCounts.confirmed, color: '#3B82F6' },
      { name: 'Shipped', value: summary.statusCounts.shipped, color: '#F59E0B' },
      { name: 'Delivered', value: summary.statusCounts.delivered, color: '#10B981' },
      { name: 'Cancelled', value: summary.statusCounts.cancelled, color: '#EF4444' },
      { name: 'Returned', value: summary.statusCounts.returned, color: '#8B5CF6' }
    ];
  };

  const getPaymentStatusChartData = () => {
    if (!summary) return [];
    
    return [
      { name: 'Paid', value: summary.paymentStatusCounts.paid, color: '#10B981' },
      { name: 'Partially Paid', value: summary.paymentStatusCounts.partially_paid, color: '#F59E0B' },
      { name: 'Unpaid', value: summary.paymentStatusCounts.unpaid, color: '#6B7280' },
      { name: 'Overdue', value: summary.paymentStatusCounts.overdue, color: '#EF4444' }
    ];
  };

  const getGroupedChartData = () => {
    if (!groupedSales || groupedSales.length === 0) return [];
    
    if (filters.groupBy === 'day' || filters.groupBy === 'week' || filters.groupBy === 'month') {
      return groupedSales.map((item: any) => ({
        name: item[filters.groupBy] || item.date || item.weekStart || item.month,
        revenue: item.revenue,
        count: item.count
      }));
    } else if (filters.groupBy === 'customer') {
      return groupedSales.slice(0, 10).map((item: any) => ({
        name: item.customerName,
        revenue: item.revenue,
        count: item.count
      }));
    } else if (filters.groupBy === 'product') {
      return groupedSales.slice(0, 10).map((item: any) => ({
        name: item.productName,
        revenue: item.revenue,
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
            <h1 className="text-2xl font-bold text-gray-900">Sales Report</h1>
            <p className="text-gray-600">
              Analyze your sales performance and trends
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
                  <p className="text-sm text-gray-600">Total Sales</p>
                  <p className="text-2xl font-bold">{summary.totalSales}</p>
                </div>
                <FileText className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalRevenue)}</p>
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
                placeholder="Search sales..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select
              options={[
                { value: '', label: 'All Customers' },
                ...customers.map(customer => ({ value: customer._id, label: customer.name }))
              ]}
              value={filters.customer}
              onChange={(e) => handleFilterChange('customer', e.target.value)}
              placeholder="Filter by customer"
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
                  customer: '',
                  status: '',
                  paymentStatus: '',
                  salesPerson: '',
                  groupBy: 'day'
                });
                navigate('/reports/sales');
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Sales Trend
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
                  <Bar yAxisId="left" dataKey="count" name="Number of Sales" fill="#3B82F6" />
                  <Bar yAxisId="right" dataKey="revenue" name="Revenue" fill="#10B981" />
                  {filters.groupBy === 'product' && (
                    <Bar yAxisId="left" dataKey="quantity" name="Quantity Sold" fill="#F59E0B" />
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
              Sales Distribution
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
      {groupedSales.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              {filters.groupBy === 'day' && 'Sales by Day'}
              {filters.groupBy === 'week' && 'Sales by Week'}
              {filters.groupBy === 'month' && 'Sales by Month'}
              {filters.groupBy === 'customer' && 'Sales by Customer'}
              {filters.groupBy === 'product' && 'Sales by Product'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  {filters.groupBy === 'day' && <TableHead>Date</TableHead>}
                  {filters.groupBy === 'week' && <TableHead>Week Starting</TableHead>}
                  {filters.groupBy === 'month' && <TableHead>Month</TableHead>}
                  {filters.groupBy === 'customer' && <TableHead>Customer</TableHead>}
                  {filters.groupBy === 'product' && <TableHead>Product</TableHead>}
                  
                  {filters.groupBy !== 'product' && <TableHead>Orders</TableHead>}
                  {filters.groupBy === 'product' && <TableHead>Quantity</TableHead>}
                  
                  <TableHead>Revenue</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Tax</TableHead>
                  
                  {filters.groupBy === 'customer' && (
                    <>
                      <TableHead>Customer Type</TableHead>
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
                {groupedSales.map((item, index) => (
                  <TableRow key={index}>
                    {filters.groupBy === 'day' && <TableCell>{item.date}</TableCell>}
                    {filters.groupBy === 'week' && <TableCell>{item.weekStart}</TableCell>}
                    {filters.groupBy === 'month' && <TableCell>{item.month}</TableCell>}
                    {filters.groupBy === 'customer' && <TableCell>{item.customerName}</TableCell>}
                    {filters.groupBy === 'product' && <TableCell>{item.productName}</TableCell>}
                    
                    {filters.groupBy !== 'product' && <TableCell>{item.count}</TableCell>}
                    {filters.groupBy === 'product' && <TableCell>{item.quantity}</TableCell>}
                    
                    <TableCell>{formatCurrency(item.revenue)}</TableCell>
                    <TableCell>{formatCurrency(item.discount || 0)}</TableCell>
                    <TableCell>{formatCurrency(item.tax || 0)}</TableCell>
                    
                    {filters.groupBy === 'customer' && (
                      <>
                        <TableCell>{item.customerType}</TableCell>
                        <TableCell>{item.customerEmail}</TableCell>
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

      {/* Sales Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Sales Transactions ({filteredSales.length})
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
          ) : filteredSales.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900">No sales found</h3>
              <p className="text-gray-600 mt-2">
                Try adjusting your filters or search criteria
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Sales Person</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.map((sale) => (
                  <TableRow key={sale._id}>
                    <TableCell>
                      <span className="font-medium">{sale.invoiceNumber}</span>
                    </TableCell>
                    <TableCell>
                      {formatDate(sale.saleDate)}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {typeof sale.customer === 'object' ? sale.customer.name : 'Unknown'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {typeof sale.customer === 'object' ? sale.customer.email : ''}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span>{sale.items.length}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{formatCurrency(sale.grandTotal)}</span>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(sale.status)}
                    </TableCell>
                    <TableCell>
                      {getPaymentStatusBadge(sale.paymentStatus)}
                    </TableCell>
                    <TableCell>
                      {typeof sale.salesPerson === 'object' ? 
                        `${sale.salesPerson.firstName} ${sale.salesPerson.lastName}` : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/sales/${sale._id}`)}
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