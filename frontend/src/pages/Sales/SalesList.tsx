import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, Search, Filter, Edit, Trash2, Eye, FileText, 
  Grid, List, SortAsc, SortDesc, Download, Upload,
  CheckCircle, XCircle, Clock, AlertTriangle, TrendingUp,
  TrendingDown, DollarSign, Calendar, User as UserIcon, Package,
  Truck, CreditCard, MoreVertical, ShoppingBag, Printer,
  RefreshCw, BarChart3, ArrowRight, ArrowDown, ArrowUp, Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import { Select } from '../../components/UI/Select';
import { Badge } from '../../components/UI/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/UI/Table';
import { Modal } from '../../components/UI/Modal';
import { salesAPI, customersAPI, usersAPI } from '../../lib/api';
import { Sale, Customer, User, SalesFilters } from '../../types';
import { formatCurrency, formatDate, debounce } from '../../utils';
import toast from 'react-hot-toast';

export const SalesList: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [showFilters, setShowFilters] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalSales, setTotalSales] = useState(0);
  const [summary, setSummary] = useState<any>(null);

  const [filters, setFilters] = useState<SalesFilters>({
    search: '',
    status: '',
    customer: '',
    paymentStatus: '',
    startDate: '',
    endDate: '',
    salesPerson: '',
    sortBy: 'saleDate',
    sortOrder: 'desc'
  });

  const [statusData, setStatusData] = useState({
    status: 'confirmed'
  });

  const [paymentData, setPaymentData] = useState({
    paymentStatus: 'paid',
    paymentMethod: 'cash'
  });

  // Debounced search function
  const debouncedSearch = debounce((searchTerm: string) => {
    setFilters(prev => ({ ...prev, search: searchTerm }));
    setCurrentPage(1);
  }, 500);

  useEffect(() => {
    fetchSales();
    fetchCustomers();
    fetchUsers();
  }, [currentPage, filters]);

  const fetchSales = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 10,
        ...filters
      };

      const response = await salesAPI.getAll(params);
      setSales(response.data.data);
      setSummary(response.data.summary);
      setTotalPages(response.data.pagination?.pages || 1);
      setTotalSales(response.data.pagination?.total || 0);
    } catch (error) {
      console.error('Failed to fetch sales:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this sale?')) {
      try {
        await salesAPI.delete(id);
        toast.success('Sale deleted successfully');
        fetchSales();
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Failed to delete sale');
      }
    }
  };

  const handleStatusUpdate = async () => {
    if (!selectedSaleId) return;

    try {
      await salesAPI.updateStatus(selectedSaleId, statusData.status);
      toast.success('Sale status updated successfully');
      setShowStatusModal(false);
      fetchSales();
    } catch (error) {
      toast.error('Failed to update sale status');
    }
  };

  const handlePaymentUpdate = async () => {
    if (!selectedSaleId) return;

    try {
      await salesAPI.updatePayment(selectedSaleId, paymentData);
      toast.success('Payment status updated successfully');
      setShowPaymentModal(false);
      fetchSales();
    } catch (error) {
      toast.error('Failed to update payment status');
    }
  };

  const handleExport = async () => {
    try {
      const response = await salesAPI.export({ format: 'csv', filters });
      
      // Convert to CSV and download
      const csvContent = [
        Object.keys(response.data.data[0]).join(','),
        ...response.data.data.map((row: any) => Object.values(row).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sales-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Sales exported successfully');
    } catch (error) {
      toast.error('Failed to export sales');
    }
  };

  const handleCheckOverdue = async () => {
    try {
      const response = await salesAPI.checkOverdueInvoices();
      toast.success(response.data.message);
      fetchSales();
    } catch (error) {
      toast.error('Failed to check overdue invoices');
    }
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
          <ArrowDown className="w-3 h-3" />
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
    { value: '', label: 'All Statuses' },
    { value: 'draft', label: 'Draft' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'returned', label: 'Returned' }
  ];

  const paymentStatusOptions = [
    { value: '', label: 'All Payment Statuses' },
    { value: 'paid', label: 'Paid' },
    { value: 'partially_paid', label: 'Partially Paid' },
    { value: 'unpaid', label: 'Unpaid' },
    { value: 'overdue', label: 'Overdue' }
  ];

  const sortOptions = [
    { value: 'saleDate', label: 'Sale Date' },
    { value: 'invoiceNumber', label: 'Invoice Number' },
    { value: 'grandTotal', label: 'Total Amount' },
    { value: 'status', label: 'Status' },
    { value: 'paymentStatus', label: 'Payment Status' },
    { value: 'createdAt', label: 'Created Date' }
  ];

  const updateStatusOptions = [
    { value: 'draft', label: 'Draft' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'returned', label: 'Returned' }
  ];

  const updatePaymentStatusOptions = [
    { value: 'paid', label: 'Paid' },
    { value: 'partially_paid', label: 'Partially Paid' },
    { value: 'unpaid', label: 'Unpaid' },
    { value: 'overdue', label: 'Overdue' }
  ];

  const paymentMethodOptions = [
    { value: 'cash', label: 'Cash' },
    { value: 'check', label: 'Check' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'credit_card', label: 'Credit Card' },
    { value: 'other', label: 'Other' }
  ];

  const SaleCard: React.FC<{ sale: Sale }> = ({ sale }) => (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900">{sale.invoiceNumber}</h3>
            <p className="text-sm text-gray-500">{formatDate(sale.saleDate)}</p>
          </div>
          <div className="flex items-center space-x-1">
            <Button variant="ghost" size="sm">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <UserIcon className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium">
                {typeof sale.customer === 'object' ? sale.customer.name : 'Unknown Customer'}
              </span>
            </div>
            <div>
              {getStatusBadge(sale.status)}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Items:</span>
            <span className="text-sm font-medium">{sale.items.length}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Total:</span>
            <span className="text-lg font-bold">{formatCurrency(sale.grandTotal)}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Payment:</span>
            <div>
              {getPaymentStatusBadge(sale.paymentStatus)}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <Link to={`/sales/${sale._id}`}>
              <Button variant="ghost" size="sm">
                <Eye className="w-4 h-4" />
              </Button>
            </Link>
            <Link to={`/sales/${sale._id}/edit`}>
              <Button variant="ghost" size="sm">
                <Edit className="w-4 h-4" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedSaleId(sale._id);
                setStatusData({ status: sale.status });
                setShowStatusModal(true);
              }}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedSaleId(sale._id);
                setPaymentData({ 
                  paymentStatus: sale.paymentStatus,
                  paymentMethod: sale.paymentMethod || 'cash'
                });
                setShowPaymentModal(true);
              }}
            >
              <CreditCard className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(sale._id)}
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
          <h1 className="text-2xl font-bold text-gray-900">Sales</h1>
          <p className="text-gray-600">
            Manage your sales and invoices ({totalSales} sales)
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={handleCheckOverdue}>
            <AlertTriangle className="w-4 h-4 mr-2" />
            Check Overdue
          </Button>
          <Link to="/sales/dashboard">
            <Button variant="outline" size="sm">
              <BarChart3 className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
          <Link to="/sales/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Sale
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  <p className="text-sm text-gray-600">Total Amount</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(summary.totalAmount)}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Paid Amount</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(summary.paidAmount)}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Unpaid Amount</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {formatCurrency(summary.unpaidAmount)}
                  </p>
                </div>
                <AlertTriangle className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Status Summary */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Status Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-gray-50 rounded-lg text-center">
                  <p className="text-lg font-bold text-gray-700">{summary.statusCounts.draft}</p>
                  <p className="text-sm text-gray-600">Draft</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg text-center">
                  <p className="text-lg font-bold text-blue-700">{summary.statusCounts.confirmed}</p>
                  <p className="text-sm text-blue-600">Confirmed</p>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg text-center">
                  <p className="text-lg font-bold text-yellow-700">{summary.statusCounts.shipped}</p>
                  <p className="text-sm text-yellow-600">Shipped</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg text-center">
                  <p className="text-lg font-bold text-green-700">{summary.statusCounts.delivered}</p>
                  <p className="text-sm text-green-600">Delivered</p>
                </div>
                <div className="p-3 bg-red-50 rounded-lg text-center">
                  <p className="text-lg font-bold text-red-700">{summary.statusCounts.cancelled}</p>
                  <p className="text-sm text-red-600">Cancelled</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg text-center">
                  <p className="text-lg font-bold text-purple-700">{summary.statusCounts.returned}</p>
                  <p className="text-sm text-purple-600">Returned</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="w-5 h-5 mr-2" />
                Payment Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-green-50 rounded-lg text-center">
                  <p className="text-lg font-bold text-green-700">{summary.paymentStatusCounts.paid}</p>
                  <p className="text-sm text-green-600">Paid</p>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg text-center">
                  <p className="text-lg font-bold text-yellow-700">{summary.paymentStatusCounts.partially_paid}</p>
                  <p className="text-sm text-yellow-600">Partially Paid</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg text-center">
                  <p className="text-lg font-bold text-gray-700">{summary.paymentStatusCounts.unpaid}</p>
                  <p className="text-sm text-gray-600">Unpaid</p>
                </div>
                <div className="p-3 bg-red-50 rounded-lg text-center">
                  <p className="text-lg font-bold text-red-700">{summary.paymentStatusCounts.overdue}</p>
                  <p className="text-sm text-red-600">Overdue</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by invoice number, customer..."
                  onChange={(e) => debouncedSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Select
                options={statusOptions}
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                placeholder="Status"
              />
              
              <Select
                options={paymentStatusOptions}
                value={filters.paymentStatus}
                onChange={(e) => setFilters(prev => ({ ...prev, paymentStatus: e.target.value }))}
                placeholder="Payment"
              />
              
              <Select
                options={sortOptions}
                value={filters.sortBy}
                onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
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
            <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-4 gap-4">
              <Select
                options={customers.map(c => ({ value: c._id, label: c.name }))}
                value={filters.customer}
                onChange={(e) => setFilters(prev => ({ ...prev, customer: e.target.value }))}
                placeholder="Customer"
              />
              
              <Select
                options={users.map(u => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }))}
                value={filters.salesPerson}
                onChange={(e) => setFilters(prev => ({ ...prev, salesPerson: e.target.value }))}
                placeholder="Sales Person"
              />
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sales Display */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  </div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sales.map((sale) => (
            <SaleCard key={sale._id} sale={sale} />
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Sales
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Sales Person</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale) => (
                  <TableRow key={sale._id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-gray-900">{sale.invoiceNumber}</p>
                        {sale.dueDate && (
                          <p className="text-xs text-gray-500">
                            Due: {formatDate(sale.dueDate)}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-gray-900">
                          {typeof sale.customer === 'object' ? sale.customer.name : 'Unknown Customer'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {typeof sale.customer === 'object' ? sale.customer.email : ''}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {formatDate(sale.saleDate)}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{sale.items.length}</span>
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
                      {typeof sale.salesPerson === 'object' 
                        ? `${sale.salesPerson.firstName} ${sale.salesPerson.lastName}`
                        : 'N/A'
                      }
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Link to={`/sales/${sale._id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Link to={`/sales/${sale._id}/edit`}>
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedSaleId(sale._id);
                            setStatusData({ status: sale.status });
                            setShowStatusModal(true);
                          }}
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedSaleId(sale._id);
                            setPaymentData({ 
                              paymentStatus: sale.paymentStatus,
                              paymentMethod: sale.paymentMethod || 'cash'
                            });
                            setShowPaymentModal(true);
                          }}
                        >
                          <CreditCard className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(sale._id)}
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
            Page {currentPage} of {totalPages} ({totalSales} total sales)
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

      {/* Status Update Modal */}
      <Modal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        title="Update Sale Status"
        size="md"
      >
        <div className="space-y-4">
          <Select
            label="Status"
            options={updateStatusOptions}
            value={statusData.status}
            onChange={(e) => setStatusData({ status: e.target.value })}
          />
          
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-900">Status Change Effects</h4>
                <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                  <li><strong>Cancelled/Returned:</strong> Stock will be returned to inventory</li>
                  <li><strong>Shipped/Delivered:</strong> Order will be marked as completed</li>
                  <li><strong>Draft/Confirmed:</strong> Order can still be modified</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setShowStatusModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleStatusUpdate}>
              Update Status
            </Button>
          </div>
        </div>
      </Modal>

      {/* Payment Update Modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Update Payment Status"
        size="md"
      >
        <div className="space-y-4">
          <Select
            label="Payment Status"
            options={updatePaymentStatusOptions}
            value={paymentData.paymentStatus}
            onChange={(e) => setPaymentData(prev => ({ ...prev, paymentStatus: e.target.value }))}
          />
          
          <Select
            label="Payment Method"
            options={paymentMethodOptions}
            value={paymentData.paymentMethod}
            onChange={(e) => setPaymentData(prev => ({ ...prev, paymentMethod: e.target.value }))}
          />
          
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-start space-x-3">
              <Info className="w-5 h-5 text-blue-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900">Payment Information</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Changing payment status to "Paid" will update customer balance and financial records.
                  Make sure all payment details are correct before proceeding.
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setShowPaymentModal(false)}>
              Cancel
            </Button>
            <Button onClick={handlePaymentUpdate}>
              Update Payment
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};