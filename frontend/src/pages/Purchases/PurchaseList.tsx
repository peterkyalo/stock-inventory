import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, Search, Filter, Edit, Trash2, Eye, ShoppingCart, 
  Grid, List, SortAsc, SortDesc, Download, Upload,
  CheckCircle, XCircle, Clock, AlertTriangle, TrendingUp,
  TrendingDown, DollarSign, Calendar, User as UserIcon, Package,
  Truck, CreditCard, MoreVertical, FileText, Printer,
  RefreshCw, BarChart3, ArrowRight, ArrowDown, ArrowUp, Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import { Select } from '../../components/UI/Select';
import { Badge } from '../../components/UI/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/UI/Table';
import { Modal } from '../../components/UI/Modal';
import { purchasesAPI, suppliersAPI, usersAPI } from '../../lib/api';
import { Purchase, Supplier, User, PurchaseFilters } from '../../types';
import { formatCurrency, formatDate, debounce } from '../../utils';
import toast from 'react-hot-toast';

export const PurchaseList: React.FC = () => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [showFilters, setShowFilters] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string>('');
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPurchases, setTotalPurchases] = useState(0);
  const [summary, setSummary] = useState<any>(null);

  const [filters, setFilters] = useState<PurchaseFilters>({
    search: '',
    status: '',
    supplier: '',
    paymentStatus: '',
    startDate: '',
    endDate: '',
    sortBy: 'orderDate',
    sortOrder: 'desc'
  });

  const [statusData, setStatusData] = useState({
    status: 'pending'
  });

  const [paymentData, setPaymentData] = useState({
    paymentStatus: 'paid',
    paymentMethod: 'cash'
  });

  const [receivedItems, setReceivedItems] = useState<{ itemId: string; quantity: number; maxQuantity: number; name: string }[]>([]);

  // Debounced search function
  const debouncedSearch = debounce((searchTerm: string) => {
    setFilters(prev => ({ ...prev, search: searchTerm }));
    setCurrentPage(1);
  }, 500);

  useEffect(() => {
    fetchPurchases();
    fetchSuppliers();
    fetchUsers();
  }, [currentPage, filters]);

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 10,
        ...filters
      };

      const response = await purchasesAPI.getAll(params);
      setPurchases(response.data.data);
      setSummary(response.data.summary);
      setTotalPages(response.data.pagination?.pages || 1);
      setTotalPurchases(response.data.pagination?.total || 0);
    } catch (error) {
      console.error('Failed to fetch purchases:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await suppliersAPI.getAll({ limit: 100 });
      setSuppliers(response.data.data);
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
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
    if (window.confirm('Are you sure you want to delete this purchase?')) {
      try {
        await purchasesAPI.delete(id);
        toast.success('Purchase deleted successfully');
        fetchPurchases();
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Failed to delete purchase');
      }
    }
  };

  const handleStatusUpdate = async () => {
    if (!selectedPurchaseId) return;

    try {
      await purchasesAPI.updateStatus(selectedPurchaseId, statusData.status);
      toast.success('Purchase status updated successfully');
      setShowStatusModal(false);
      fetchPurchases();
    } catch (error) {
      toast.error('Failed to update purchase status');
    }
  };

  const handlePaymentUpdate = async () => {
    if (!selectedPurchaseId) return;

    try {
      await purchasesAPI.updatePayment(selectedPurchaseId, paymentData);
      toast.success('Payment status updated successfully');
      setShowPaymentModal(false);
      fetchPurchases();
    } catch (error) {
      toast.error('Failed to update payment status');
    }
  };

  const handleReceiveItems = async () => {
    if (!selectedPurchaseId) return;

    try {
      // Filter out items with zero quantity
      const itemsToReceive = receivedItems.filter(item => item.quantity > 0);
      
      if (itemsToReceive.length === 0) {
        toast.error('Please enter a quantity greater than zero for at least one item');
        return;
      }

      await purchasesAPI.receiveItems(selectedPurchaseId, {
        receivedItems: itemsToReceive.map(item => ({
          itemId: item.itemId,
          quantity: item.quantity
        }))
      });
      
      toast.success('Items received successfully');
      setShowReceiveModal(false);
      fetchPurchases();
    } catch (error) {
      toast.error('Failed to receive items');
    }
  };

  const handleExport = async () => {
    try {
      const response = await purchasesAPI.export({ format: 'csv', filters });
      
      // Convert to CSV and download
      const csvContent = [
        Object.keys(response.data.data[0]).join(','),
        ...response.data.data.map((row: any) => Object.values(row).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `purchases-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Purchases exported successfully');
    } catch (error) {
      toast.error('Failed to export purchases');
    }
  };

  const prepareReceiveModal = async (purchase: Purchase) => {
    setSelectedPurchaseId(purchase._id);
    setSelectedPurchase(purchase);
    
    // Prepare received items data
    const items = purchase.items.map(item => {
      const remainingQuantity = item.quantity - item.receivedQuantity;
      return {
        itemId: item._id || '',
        quantity: remainingQuantity > 0 ? remainingQuantity : 0,
        maxQuantity: remainingQuantity,
        name: typeof item.product === 'object' ? item.product.name : 'Unknown Product'
      };
    });
    
    setReceivedItems(items);
    setShowReceiveModal(true);
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
          <ArrowDown className="w-3 h-3" />
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

  const getPaymentMethodBadge = (method?: string) => {
    if (!method) return null;
    
    switch (method) {
      case 'cash':
        return <Badge variant="default" className="flex items-center gap-1">
          <DollarSign className="w-3 h-3" />
          Cash
        </Badge>;
      case 'check':
        return <Badge variant="default" className="flex items-center gap-1">
          <FileText className="w-3 h-3" />
          Check
        </Badge>;
      case 'bank_transfer':
        return <Badge variant="default" className="flex items-center gap-1">
          <CreditCard className="w-3 h-3" />
          Bank Transfer
        </Badge>;
      case 'credit_card':
        return <Badge variant="default" className="flex items-center gap-1">
          <CreditCard className="w-3 h-3" />
          Credit Card
        </Badge>;
      default:
        return <Badge variant="default">{method}</Badge>;
    }
  };

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'draft', label: 'Draft' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'ordered', label: 'Ordered' },
    { value: 'partially_received', label: 'Partially Received' },
    { value: 'received', label: 'Received' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  const paymentStatusOptions = [
    { value: '', label: 'All Payment Statuses' },
    { value: 'paid', label: 'Paid' },
    { value: 'partially_paid', label: 'Partially Paid' },
    { value: 'unpaid', label: 'Unpaid' }
  ];

  const sortOptions = [
    { value: 'orderDate', label: 'Order Date' },
    { value: 'purchaseOrderNumber', label: 'PO Number' },
    { value: 'grandTotal', label: 'Total Amount' },
    { value: 'status', label: 'Status' },
    { value: 'paymentStatus', label: 'Payment Status' },
    { value: 'createdAt', label: 'Created Date' }
  ];

  const updateStatusOptions = [
    { value: 'draft', label: 'Draft' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'ordered', label: 'Ordered' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  const updatePaymentStatusOptions = [
    { value: 'paid', label: 'Paid' },
    { value: 'partially_paid', label: 'Partially Paid' },
    { value: 'unpaid', label: 'Unpaid' }
  ];

  const paymentMethodOptions = [
    { value: 'cash', label: 'Cash' },
    { value: 'check', label: 'Check' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'credit_card', label: 'Credit Card' },
    { value: 'other', label: 'Other' }
  ];

  const PurchaseCard: React.FC<{ purchase: Purchase }> = ({ purchase }) => (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900">{purchase.purchaseOrderNumber}</h3>
            <p className="text-sm text-gray-500">{formatDate(purchase.orderDate)}</p>
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
              <Truck className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium">
                {typeof purchase.supplier === 'object' ? purchase.supplier.name : 'Unknown Supplier'}
              </span>
            </div>
            <div>
              {getStatusBadge(purchase.status)}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Items:</span>
            <span className="text-sm font-medium">{purchase.items.length}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Total:</span>
            <span className="text-lg font-bold">{formatCurrency(purchase.grandTotal)}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Payment:</span>
            <div>
              {getPaymentStatusBadge(purchase.paymentStatus)}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <Link to={`/purchases/${purchase._id}`}>
              <Button variant="ghost" size="sm">
                <Eye className="w-4 h-4" />
              </Button>
            </Link>
            <Link to={`/purchases/${purchase._id}/edit`}>
              <Button variant="ghost" size="sm">
                <Edit className="w-4 h-4" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedPurchaseId(purchase._id);
                setStatusData({ status: purchase.status });
                setShowStatusModal(true);
              }}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedPurchaseId(purchase._id);
                setPaymentData({ 
                  paymentStatus: purchase.paymentStatus,
                  paymentMethod: purchase.paymentMethod || 'cash'
                });
                setShowPaymentModal(true);
              }}
            >
              <CreditCard className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(purchase._id)}
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
          <h1 className="text-2xl font-bold text-gray-900">Purchases</h1>
          <p className="text-gray-600">
            Manage your purchase orders ({totalPurchases} purchases)
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Link to="/purchases/dashboard">
            <Button variant="outline" size="sm">
              <BarChart3 className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
          <Link to="/purchases/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Purchase
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
                <ShoppingCart className="w-5 h-5 mr-2" />
                Status Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-3">
                <div className="p-3 bg-gray-50 rounded-lg text-center">
                  <p className="text-lg font-bold text-gray-700">{summary.statusCounts.draft}</p>
                  <p className="text-sm text-gray-600">Draft</p>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg text-center">
                  <p className="text-lg font-bold text-yellow-700">{summary.statusCounts.pending}</p>
                  <p className="text-sm text-yellow-600">Pending</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg text-center">
                  <p className="text-lg font-bold text-blue-700">{summary.statusCounts.approved}</p>
                  <p className="text-sm text-blue-600">Approved</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg text-center">
                  <p className="text-lg font-bold text-blue-700">{summary.statusCounts.ordered}</p>
                  <p className="text-sm text-blue-600">Ordered</p>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg text-center">
                  <p className="text-lg font-bold text-yellow-700">{summary.statusCounts.partially_received}</p>
                  <p className="text-sm text-yellow-600">Partially Received</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg text-center">
                  <p className="text-lg font-bold text-green-700">{summary.statusCounts.received}</p>
                  <p className="text-sm text-green-600">Received</p>
                </div>
                <div className="p-3 bg-red-50 rounded-lg text-center">
                  <p className="text-lg font-bold text-red-700">{summary.statusCounts.cancelled}</p>
                  <p className="text-sm text-red-600">Cancelled</p>
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
              <div className="grid grid-cols-3 gap-3">
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
                  placeholder="Search by PO number, supplier..."
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
                options={suppliers.map(s => ({ value: s._id, label: s.name }))}
                value={filters.supplier}
                onChange={(e) => setFilters(prev => ({ ...prev, supplier: e.target.value }))}
                placeholder="Supplier"
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

      {/* Purchases Display */}
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
          {purchases.map((purchase) => (
            <PurchaseCard key={purchase._id} purchase={purchase} />
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ShoppingCart className="w-5 h-5 mr-2" />
              Purchases
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchases.map((purchase) => (
                  <TableRow key={purchase._id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-gray-900">{purchase.purchaseOrderNumber}</p>
                        {purchase.expectedDeliveryDate && (
                          <p className="text-xs text-gray-500">
                            Expected: {formatDate(purchase.expectedDeliveryDate)}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-gray-900">
                          {typeof purchase.supplier === 'object' ? purchase.supplier.name : 'Unknown Supplier'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {typeof purchase.supplier === 'object' ? purchase.supplier.email : ''}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {formatDate(purchase.orderDate)}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{purchase.items.length}</span>
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
                      {typeof purchase.createdBy === 'object' 
                        ? `${purchase.createdBy.firstName} ${purchase.createdBy.lastName}`
                        : 'N/A'
                      }
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Link to={`/purchases/${purchase._id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Link to={`/purchases/${purchase._id}/edit`}>
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedPurchaseId(purchase._id);
                            setStatusData({ status: purchase.status });
                            setShowStatusModal(true);
                          }}
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedPurchaseId(purchase._id);
                            setPaymentData({ 
                              paymentStatus: purchase.paymentStatus,
                              paymentMethod: purchase.paymentMethod || 'cash'
                            });
                            setShowPaymentModal(true);
                          }}
                        >
                          <CreditCard className="w-4 h-4" />
                        </Button>
                        {(purchase.status === 'approved' || purchase.status === 'ordered' || purchase.status === 'partially_received') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => prepareReceiveModal(purchase)}
                          >
                            <ArrowDown className="w-4 h-4 text-green-500" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(purchase._id)}
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
            Page {currentPage} of {totalPages} ({totalPurchases} total purchases)
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
        title="Update Purchase Status"
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
                  <li><strong>Approved:</strong> Purchase order is approved and ready to be sent to the supplier</li>
                  <li><strong>Ordered:</strong> Purchase order has been sent to the supplier</li>
                  <li><strong>Cancelled:</strong> Purchase order is cancelled and will not be processed</li>
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
                  Changing payment status to "Paid" will update supplier balance and financial records.
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

      {/* Receive Items Modal */}
      <Modal
        isOpen={showReceiveModal}
        onClose={() => setShowReceiveModal(false)}
        title="Receive Items"
        size="lg"
      >
        <div className="space-y-4">
          {selectedPurchase && (
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <div className="flex items-start space-x-3">
                <ShoppingCart className="w-5 h-5 text-blue-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">Purchase Order: {selectedPurchase.purchaseOrderNumber}</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Supplier: {typeof selectedPurchase.supplier === 'object' ? selectedPurchase.supplier.name : 'Unknown Supplier'}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Receive Items</h4>
            
            {receivedItems.length === 0 ? (
              <p className="text-gray-500">No items to receive</p>
            ) : (
              <div className="space-y-4">
                {receivedItems.map((item, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-600">Max: {item.maxQuantity}</p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex-1">
                        <Input
                          label="Quantity to Receive"
                          type="number"
                          min="0"
                          max={item.maxQuantity.toString()}
                          value={item.quantity.toString()}
                          onChange={(e) => {
                            const newValue = parseInt(e.target.value) || 0;
                            const newItems = [...receivedItems];
                            newItems[index].quantity = Math.min(newValue, item.maxQuantity);
                            setReceivedItems(newItems);
                          }}
                        />
                      </div>
                      <div className="flex-shrink-0 pt-6">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newItems = [...receivedItems];
                            newItems[index].quantity = item.maxQuantity;
                            setReceivedItems(newItems);
                          }}
                        >
                          Max
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-900">Important Note</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Receiving items will update your inventory stock levels. This action cannot be undone.
                  Please verify all quantities before proceeding.
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setShowReceiveModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleReceiveItems}>
              Receive Items
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};