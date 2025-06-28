import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, Search, Filter, Edit, Trash2, Eye, Users, 
  Grid, List, SortAsc, SortDesc, Download, Upload,
  Star, Phone, Mail, MapPin, CreditCard, TrendingUp,
  TrendingDown, MoreVertical, Building, User, Calendar,
  AlertTriangle, CheckCircle, XCircle, Award, DollarSign,
  Crown, Shield, Package, Target
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import { Select } from '../../components/UI/Select';
import { Badge } from '../../components/UI/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/UI/Table';
import { Modal } from '../../components/UI/Modal';
import { customersAPI } from '../../lib/api';
import { Customer } from '../../types';
import { formatCurrency, formatDate, debounce } from '../../utils';
import toast from 'react-hot-toast';

export const CustomerList: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCustomers, setTotalCustomers] = useState(0);

  const [filters, setFilters] = useState({
    search: '',
    type: '',
    group: '',
    active: undefined as boolean | undefined,
    paymentTerms: '',
    sortBy: 'createdAt',
    sortOrder: 'desc' as 'asc' | 'desc'
  });

  const [bulkUpdateData, setBulkUpdateData] = useState({
    isActive: true,
    customerGroup: '',
    discountPercentage: 0,
    paymentTerms: ''
  });

  const [groupData, setGroupData] = useState({
    customerGroup: 'regular'
  });

  // Debounced search function
  const debouncedSearch = debounce((searchTerm: string) => {
    setFilters(prev => ({ ...prev, search: searchTerm }));
    setCurrentPage(1);
  }, 500);

  useEffect(() => {
    fetchCustomers();
  }, [currentPage, filters]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 12,
        ...filters,
        active: filters.active?.toString()
      };

      const response = await customersAPI.getAll(params);
      setCustomers(response.data.data);
      setTotalPages(response.data.pagination?.pages || 1);
      setTotalCustomers(response.data.pagination?.total || 0);
    } catch (error) {
      toast.error('Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      try {
        await customersAPI.delete(id);
        toast.success('Customer deleted successfully');
        fetchCustomers();
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Failed to delete customer');
      }
    }
  };

  const handleStatusToggle = async (id: string, currentStatus: boolean) => {
    try {
      await customersAPI.updateStatus(id, !currentStatus);
      toast.success(`Customer ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      fetchCustomers();
    } catch (error) {
      toast.error('Failed to update customer status');
    }
  };

  const handleGroupUpdate = async () => {
    if (!selectedCustomerId) return;

    try {
      await customersAPI.updateGroup(selectedCustomerId, groupData.customerGroup);
      toast.success('Customer group updated successfully');
      setShowGroupModal(false);
      setGroupData({ customerGroup: 'regular' });
      setSelectedCustomerId('');
      fetchCustomers();
    } catch (error) {
      toast.error('Failed to update customer group');
    }
  };

  const handleBulkUpdate = async () => {
    if (selectedCustomers.length === 0) {
      toast.error('Please select customers to update');
      return;
    }

    try {
      const updates: any = {};
      if (bulkUpdateData.isActive !== undefined) updates.isActive = bulkUpdateData.isActive;
      if (bulkUpdateData.customerGroup) updates.customerGroup = bulkUpdateData.customerGroup;
      if (bulkUpdateData.discountPercentage > 0) updates.discountPercentage = bulkUpdateData.discountPercentage;
      if (bulkUpdateData.paymentTerms) updates.paymentTerms = bulkUpdateData.paymentTerms;

      await customersAPI.bulkUpdate({
        customerIds: selectedCustomers,
        updates
      });
      
      toast.success(`Updated ${selectedCustomers.length} customers successfully`);
      setShowBulkModal(false);
      setSelectedCustomers([]);
      fetchCustomers();
    } catch (error) {
      toast.error('Failed to update customers');
    }
  };

  const handleExport = async () => {
    try {
      const response = await customersAPI.export({ format: 'csv', filters });
      
      // Convert to CSV and download
      const csvContent = [
        Object.keys(response.data.data[0]).join(','),
        ...response.data.data.map((row: any) => Object.values(row).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `customers-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Customers exported successfully');
    } catch (error) {
      toast.error('Failed to export customers');
    }
  };

  const handleSelectCustomer = (customerId: string) => {
    setSelectedCustomers(prev => 
      prev.includes(customerId) 
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  const handleSelectAll = () => {
    if (selectedCustomers.length === customers.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(customers.map(c => c._id));
    }
  };

  const getStatusBadge = (customer: Customer) => {
    if (!customer.isActive) {
      return <Badge variant="danger" className="flex items-center gap-1">
        <XCircle className="w-3 h-3" />
        Inactive
      </Badge>;
    }
    
    return <Badge variant="success" className="flex items-center gap-1">
      <CheckCircle className="w-3 h-3" />
      Active
    </Badge>;
  };

  const getCustomerGroupBadge = (group: string) => {
    const variants = {
      regular: { variant: 'default' as const, icon: User, color: 'text-gray-600' },
      vip: { variant: 'warning' as const, icon: Crown, color: 'text-yellow-600' },
      wholesale: { variant: 'info' as const, icon: Package, color: 'text-blue-600' },
      retail: { variant: 'success' as const, icon: Target, color: 'text-green-600' }
    };
    
    const config = variants[group as keyof typeof variants] || variants.regular;
    const Icon = config.icon;
    
    return <Badge variant={config.variant} className="flex items-center gap-1">
      <Icon className="w-3 h-3" />
      {group.charAt(0).toUpperCase() + group.slice(1)}
    </Badge>;
  };

  const getPaymentTermsBadge = (terms: string) => {
    const variants = {
      cash: 'success',
      net_15: 'info',
      net_30: 'warning',
      net_45: 'warning',
      net_60: 'danger'
    } as const;
    
    return <Badge variant={variants[terms as keyof typeof variants] || 'default'}>
      {terms.replace('_', ' ').toUpperCase()}
    </Badge>;
  };

  const getCreditUtilizationColor = (utilization: number) => {
    if (utilization >= 90) return 'text-red-600';
    if (utilization >= 70) return 'text-yellow-600';
    return 'text-green-600';
  };

  const typeOptions = [
    { value: '', label: 'All Types' },
    { value: 'individual', label: 'Individual' },
    { value: 'business', label: 'Business' }
  ];

  const groupOptions = [
    { value: '', label: 'All Groups' },
    { value: 'regular', label: 'Regular' },
    { value: 'vip', label: 'VIP' },
    { value: 'wholesale', label: 'Wholesale' },
    { value: 'retail', label: 'Retail' }
  ];

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'true', label: 'Active' },
    { value: 'false', label: 'Inactive' }
  ];

  const paymentTermsOptions = [
    { value: '', label: 'All Payment Terms' },
    { value: 'cash', label: 'Cash' },
    { value: 'net_15', label: 'Net 15' },
    { value: 'net_30', label: 'Net 30' },
    { value: 'net_45', label: 'Net 45' },
    { value: 'net_60', label: 'Net 60' }
  ];

  const sortOptions = [
    { value: 'name', label: 'Name' },
    { value: 'customerGroup', label: 'Customer Group' },
    { value: 'totalOrders', label: 'Total Orders' },
    { value: 'totalSalesAmount', label: 'Total Sales Amount' },
    { value: 'createdAt', label: 'Date Created' },
    { value: 'lastOrderDate', label: 'Last Order Date' }
  ];

  const CustomerCard: React.FC<{ customer: Customer }> = ({ customer }) => (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <input
            type="checkbox"
            checked={selectedCustomers.includes(customer._id)}
            onChange={() => handleSelectCustomer(customer._id)}
            className="rounded border-gray-300"
          />
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedCustomerId(customer._id);
                setGroupData({ customerGroup: customer.customerGroup });
                setShowGroupModal(true);
              }}
            >
              <Crown className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              {customer.type === 'business' ? (
                <Building className="w-6 h-6 text-blue-600" />
              ) : (
                <User className="w-6 h-6 text-blue-600" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 text-lg">{customer.name}</h3>
              {customer.businessName && (
                <p className="text-sm text-gray-600">{customer.businessName}</p>
              )}
              <div className="flex items-center space-x-2 mt-1">
                {getCustomerGroupBadge(customer.customerGroup)}
                <Badge variant="info" size="sm">{customer.type}</Badge>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center text-sm text-gray-600">
              <Mail className="w-4 h-4 mr-2" />
              {customer.email}
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Phone className="w-4 h-4 mr-2" />
              {customer.phone}
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <MapPin className="w-4 h-4 mr-2" />
              {customer.address.city}, {customer.address.state}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div className="text-center">
              <p className="text-lg font-bold text-blue-600">{customer.totalOrders}</p>
              <p className="text-xs text-gray-500">Orders</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-green-600">
                {formatCurrency(customer.totalSalesAmount)}
              </p>
              <p className="text-xs text-gray-500">Total Sales</p>
            </div>
          </div>

          {customer.creditLimit > 0 && (
            <div className="pt-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Credit Utilization</span>
                <span className={getCreditUtilizationColor(
                  (customer.currentBalance / customer.creditLimit) * 100
                )}>
                  {((customer.currentBalance / customer.creditLimit) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="mt-1 bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    (customer.currentBalance / customer.creditLimit) * 100 >= 90 ? 'bg-red-500' :
                    (customer.currentBalance / customer.creditLimit) * 100 >= 70 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min((customer.currentBalance / customer.creditLimit) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            {getStatusBadge(customer)}
            {getPaymentTermsBadge(customer.paymentTerms)}
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <Link to={`/customers/${customer._id}`}>
              <Button variant="ghost" size="sm">
                <Eye className="w-4 h-4" />
              </Button>
            </Link>
            <Link to={`/customers/${customer._id}/edit`}>
              <Button variant="ghost" size="sm">
                <Edit className="w-4 h-4" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleStatusToggle(customer._id, customer.isActive)}
            >
              {customer.isActive ? (
                <XCircle className="w-4 h-4 text-red-500" />
              ) : (
                <CheckCircle className="w-4 h-4 text-green-500" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(customer._id)}
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
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-600">
            Manage your customer relationships ({totalCustomers} customers)
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
          <Link to="/customers/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Customer
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
                <p className="text-sm text-gray-600">Total Customers</p>
                <p className="text-2xl font-bold">{totalCustomers}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Customers</p>
                <p className="text-2xl font-bold text-green-600">
                  {customers.filter(c => c.isActive).length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">VIP Customers</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {customers.filter(c => c.customerGroup === 'vip').length}
                </p>
              </div>
              <Crown className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Sales Value</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(customers.reduce((sum, c) => sum + c.totalSalesAmount, 0))}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-purple-500" />
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
                  placeholder="Search customers by name, email, business name..."
                  onChange={(e) => debouncedSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Select
                options={typeOptions}
                value={filters.type}
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                placeholder="Type"
              />
              
              <Select
                options={groupOptions}
                value={filters.group}
                onChange={(e) => setFilters(prev => ({ ...prev, group: e.target.value }))}
                placeholder="Group"
              />
              
              <Select
                options={statusOptions}
                value={filters.active?.toString() || ''}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  active: e.target.value ? e.target.value === 'true' : undefined 
                }))}
                placeholder="Status"
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
            <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                options={paymentTermsOptions}
                value={filters.paymentTerms}
                onChange={(e) => setFilters(prev => ({ ...prev, paymentTerms: e.target.value }))}
                placeholder="Payment Terms"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedCustomers.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {selectedCustomers.length} customer(s) selected
              </p>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBulkModal(true)}
                >
                  Bulk Update
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedCustomers([])}
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Customers Display */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {customers.map((customer) => (
            <CustomerCard key={customer._id} customer={customer} />
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Customers
              </CardTitle>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedCustomers.length === customers.length && customers.length > 0}
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
                  <TableHead>Customer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Group</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Total Sales</TableHead>
                  <TableHead>Payment Terms</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer._id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedCustomers.includes(customer._id)}
                        onChange={() => handleSelectCustomer(customer._id)}
                        className="rounded border-gray-300"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                          {customer.type === 'business' ? (
                            <Building className="w-5 h-5 text-blue-600" />
                          ) : (
                            <User className="w-5 h-5 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{customer.name}</p>
                          <p className="text-sm text-gray-500">{customer.email}</p>
                          {customer.businessName && (
                            <p className="text-sm text-gray-500">{customer.businessName}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm text-gray-900">{customer.phone}</p>
                        <p className="text-sm text-gray-500">{customer.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm text-gray-900">{customer.address.city}</p>
                        <p className="text-sm text-gray-500">{customer.address.state}, {customer.address.country}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getCustomerGroupBadge(customer.customerGroup)}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{customer.totalOrders}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{formatCurrency(customer.totalSalesAmount)}</span>
                    </TableCell>
                    <TableCell>
                      {getPaymentTermsBadge(customer.paymentTerms)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(customer)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Link to={`/customers/${customer._id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Link to={`/customers/${customer._id}/edit`}>
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedCustomerId(customer._id);
                            setGroupData({ customerGroup: customer.customerGroup });
                            setShowGroupModal(true);
                          }}
                        >
                          <Crown className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(customer._id)}
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
            Page {currentPage} of {totalPages} ({totalCustomers} total customers)
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

      {/* Bulk Update Modal */}
      <Modal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        title="Bulk Update Customers"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Update {selectedCustomers.length} selected customers
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="updateStatus"
                checked={bulkUpdateData.isActive}
                onChange={(e) => setBulkUpdateData(prev => ({ 
                  ...prev, 
                  isActive: e.target.checked 
                }))}
                className="rounded border-gray-300"
              />
              <label htmlFor="updateStatus" className="text-sm text-gray-700">
                Set as Active
              </label>
            </div>
            
            <Select
              label="Customer Group"
              options={groupOptions.filter(opt => opt.value)}
              value={bulkUpdateData.customerGroup}
              onChange={(e) => setBulkUpdateData(prev => ({ 
                ...prev, 
                customerGroup: e.target.value 
              }))}
              placeholder="Select customer group"
            />
            
            <Input
              label="Discount Percentage (0-100)"
              type="number"
              min="0"
              max="100"
              value={bulkUpdateData.discountPercentage}
              onChange={(e) => setBulkUpdateData(prev => ({ 
                ...prev, 
                discountPercentage: parseFloat(e.target.value) || 0 
              }))}
              placeholder="Enter discount percentage"
            />
            
            <Select
              label="Payment Terms"
              options={paymentTermsOptions.filter(opt => opt.value)}
              value={bulkUpdateData.paymentTerms}
              onChange={(e) => setBulkUpdateData(prev => ({ 
                ...prev, 
                paymentTerms: e.target.value 
              }))}
              placeholder="Select payment terms"
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setShowBulkModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkUpdate}>
              Update Customers
            </Button>
          </div>
        </div>
      </Modal>

      {/* Group Update Modal */}
      <Modal
        isOpen={showGroupModal}
        onClose={() => setShowGroupModal(false)}
        title="Update Customer Group"
        size="md"
      >
        <div className="space-y-4">
          <Select
            label="Customer Group"
            options={groupOptions.filter(opt => opt.value)}
            value={groupData.customerGroup}
            onChange={(e) => setGroupData(prev => ({ 
              ...prev, 
              customerGroup: e.target.value 
            }))}
          />
          
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Customer Group Benefits</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li><strong>Regular:</strong> Standard pricing and terms</li>
              <li><strong>VIP:</strong> Priority support and exclusive offers</li>
              <li><strong>Wholesale:</strong> Volume discounts and extended payment terms</li>
              <li><strong>Retail:</strong> Standard retail pricing and promotions</li>
            </ul>
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setShowGroupModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleGroupUpdate}>
              Update Group
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};