import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, Search, Filter, Edit, Trash2, Eye, Truck, 
  Grid, List, SortAsc, SortDesc, Download, Upload,
  Star, Phone, Mail, MapPin, CreditCard, TrendingUp,
  TrendingDown, MoreVertical, Building, User, Calendar,
  AlertTriangle, CheckCircle, XCircle, Award, DollarSign
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import { Select } from '../../components/UI/Select';
import { Badge } from '../../components/UI/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/UI/Table';
import { Modal } from '../../components/UI/Modal';
import { suppliersAPI } from '../../lib/api';
import { Supplier } from '../../types';
import { formatCurrency, formatDate, debounce } from '../../utils';
import toast from 'react-hot-toast';

export const SupplierList: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalSuppliers, setTotalSuppliers] = useState(0);

  const [filters, setFilters] = useState({
    search: '',
    active: undefined as boolean | undefined,
    rating: '',
    paymentTerms: '',
    sortBy: 'createdAt',
    sortOrder: 'desc' as 'asc' | 'desc'
  });

  const [bulkUpdateData, setBulkUpdateData] = useState({
    isActive: true,
    paymentTerms: '',
    rating: 0
  });

  const [ratingData, setRatingData] = useState({
    rating: 5,
    notes: ''
  });

  // Debounced search function
  const debouncedSearch = debounce((searchTerm: string) => {
    setFilters(prev => ({ ...prev, search: searchTerm }));
    setCurrentPage(1);
  }, 500);

  useEffect(() => {
    fetchSuppliers();
  }, [currentPage, filters]);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 12,
        ...filters,
        active: filters.active?.toString()
      };

      const response = await suppliersAPI.getAll(params);
      setSuppliers(response.data.data);
      setTotalPages(response.data.pagination?.pages || 1);
      setTotalSuppliers(response.data.pagination?.total || 0);
    } catch (error) {
      toast.error('Failed to fetch suppliers');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this supplier?')) {
      try {
        await suppliersAPI.delete(id);
        toast.success('Supplier deleted successfully');
        fetchSuppliers();
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Failed to delete supplier');
      }
    }
  };

  const handleStatusToggle = async (id: string, currentStatus: boolean) => {
    try {
      await suppliersAPI.updateStatus(id, !currentStatus);
      toast.success(`Supplier ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      fetchSuppliers();
    } catch (error) {
      toast.error('Failed to update supplier status');
    }
  };

  const handleRatingUpdate = async () => {
    if (!selectedSupplierId) return;

    try {
      await suppliersAPI.updateRating(selectedSupplierId, ratingData.rating);
      toast.success('Supplier rating updated successfully');
      setShowRatingModal(false);
      setRatingData({ rating: 5, notes: '' });
      setSelectedSupplierId('');
      fetchSuppliers();
    } catch (error) {
      toast.error('Failed to update supplier rating');
    }
  };

  const handleBulkUpdate = async () => {
    if (selectedSuppliers.length === 0) {
      toast.error('Please select suppliers to update');
      return;
    }

    try {
      const updates: any = {};
      if (bulkUpdateData.isActive !== undefined) updates.isActive = bulkUpdateData.isActive;
      if (bulkUpdateData.paymentTerms) updates.paymentTerms = bulkUpdateData.paymentTerms;
      if (bulkUpdateData.rating > 0) updates.rating = bulkUpdateData.rating;

      await suppliersAPI.bulkUpdate({
        supplierIds: selectedSuppliers,
        updates
      });
      
      toast.success(`Updated ${selectedSuppliers.length} suppliers successfully`);
      setShowBulkModal(false);
      setSelectedSuppliers([]);
      fetchSuppliers();
    } catch (error) {
      toast.error('Failed to update suppliers');
    }
  };

  const handleExport = async () => {
    try {
      const response = await suppliersAPI.export({ format: 'csv', filters });
      
      // Convert to CSV and download
      const csvContent = [
        Object.keys(response.data.data[0]).join(','),
        ...response.data.data.map((row: any) => Object.values(row).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `suppliers-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Suppliers exported successfully');
    } catch (error) {
      toast.error('Failed to export suppliers');
    }
  };

  const handleSelectSupplier = (supplierId: string) => {
    setSelectedSuppliers(prev => 
      prev.includes(supplierId) 
        ? prev.filter(id => id !== supplierId)
        : [...prev, supplierId]
    );
  };

  const handleSelectAll = () => {
    if (selectedSuppliers.length === suppliers.length) {
      setSelectedSuppliers([]);
    } else {
      setSelectedSuppliers(suppliers.map(s => s._id));
    }
  };

  const getStatusBadge = (supplier: Supplier) => {
    if (!supplier.isActive) {
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

  const getRatingStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
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

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'true', label: 'Active' },
    { value: 'false', label: 'Inactive' }
  ];

  const ratingOptions = [
    { value: '', label: 'All Ratings' },
    { value: '5', label: '5 Stars' },
    { value: '4', label: '4+ Stars' },
    { value: '3', label: '3+ Stars' },
    { value: '2', label: '2+ Stars' },
    { value: '1', label: '1+ Stars' }
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
    { value: 'rating', label: 'Rating' },
    { value: 'totalOrders', label: 'Total Orders' },
    { value: 'totalPurchaseAmount', label: 'Total Purchase Amount' },
    { value: 'createdAt', label: 'Date Created' },
    { value: 'lastOrderDate', label: 'Last Order Date' }
  ];

  const SupplierCard: React.FC<{ supplier: Supplier }> = ({ supplier }) => (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <input
            type="checkbox"
            checked={selectedSuppliers.includes(supplier._id)}
            onChange={() => handleSelectSupplier(supplier._id)}
            className="rounded border-gray-300"
          />
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedSupplierId(supplier._id);
                setRatingData({ rating: supplier.rating || 5, notes: '' });
                setShowRatingModal(true);
              }}
            >
              <Star className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 text-lg">{supplier.name}</h3>
              <div className="flex items-center space-x-2 mt-1">
                {supplier.rating && (
                  <div className="flex items-center">
                    {getRatingStars(supplier.rating)}
                    <span className="text-sm text-gray-600 ml-1">({supplier.rating})</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center text-sm text-gray-600">
              <User className="w-4 h-4 mr-2" />
              {supplier.contactPerson.name}
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Mail className="w-4 h-4 mr-2" />
              {supplier.email}
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Phone className="w-4 h-4 mr-2" />
              {supplier.phone}
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <MapPin className="w-4 h-4 mr-2" />
              {supplier.address.city}, {supplier.address.state}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div className="text-center">
              <p className="text-lg font-bold text-blue-600">{supplier.totalOrders}</p>
              <p className="text-xs text-gray-500">Orders</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-green-600">
                {formatCurrency(supplier.totalPurchaseAmount)}
              </p>
              <p className="text-xs text-gray-500">Total Value</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            {getStatusBadge(supplier)}
            {getPaymentTermsBadge(supplier.paymentTerms)}
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <Link to={`/suppliers/${supplier._id}`}>
              <Button variant="ghost" size="sm">
                <Eye className="w-4 h-4" />
              </Button>
            </Link>
            <Link to={`/suppliers/${supplier._id}/edit`}>
              <Button variant="ghost" size="sm">
                <Edit className="w-4 h-4" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleStatusToggle(supplier._id, supplier.isActive)}
            >
              {supplier.isActive ? (
                <XCircle className="w-4 h-4 text-red-500" />
              ) : (
                <CheckCircle className="w-4 h-4 text-green-500" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(supplier._id)}
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
          <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
          <p className="text-gray-600">
            Manage your supplier relationships ({totalSuppliers} suppliers)
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
          <Link to="/suppliers/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Supplier
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
                <p className="text-sm text-gray-600">Total Suppliers</p>
                <p className="text-2xl font-bold">{totalSuppliers}</p>
              </div>
              <Truck className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Suppliers</p>
                <p className="text-2xl font-bold text-green-600">
                  {suppliers.filter(s => s.isActive).length}
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
                <p className="text-sm text-gray-600">Top Rated</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {suppliers.filter(s => s.rating && s.rating >= 4).length}
                </p>
              </div>
              <Award className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Value</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(suppliers.reduce((sum, s) => sum + s.totalPurchaseAmount, 0))}
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
                  placeholder="Search suppliers by name, email, contact person..."
                  onChange={(e) => debouncedSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
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
                options={ratingOptions}
                value={filters.rating}
                onChange={(e) => setFilters(prev => ({ ...prev, rating: e.target.value }))}
                placeholder="Rating"
              />
              
              <Select
                options={paymentTermsOptions}
                value={filters.paymentTerms}
                onChange={(e) => setFilters(prev => ({ ...prev, paymentTerms: e.target.value }))}
                placeholder="Payment Terms"
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
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedSuppliers.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {selectedSuppliers.length} supplier(s) selected
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
                  onClick={() => setSelectedSuppliers([])}
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Suppliers Display */}
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
          {suppliers.map((supplier) => (
            <SupplierCard key={supplier._id} supplier={supplier} />
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <Truck className="w-5 h-5 mr-2" />
                Suppliers
              </CardTitle>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedSuppliers.length === suppliers.length && suppliers.length > 0}
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
                  <TableHead>Supplier</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Total Value</TableHead>
                  <TableHead>Payment Terms</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((supplier) => (
                  <TableRow key={supplier._id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedSuppliers.includes(supplier._id)}
                        onChange={() => handleSelectSupplier(supplier._id)}
                        className="rounded border-gray-300"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                          <Building className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{supplier.name}</p>
                          <p className="text-sm text-gray-500">{supplier.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-gray-900">{supplier.contactPerson.name}</p>
                        <p className="text-sm text-gray-500">{supplier.phone}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm text-gray-900">{supplier.address.city}</p>
                        <p className="text-sm text-gray-500">{supplier.address.state}, {supplier.address.country}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {supplier.rating ? (
                        <div className="flex items-center">
                          {getRatingStars(supplier.rating)}
                          <span className="text-sm text-gray-600 ml-1">({supplier.rating})</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">No rating</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{supplier.totalOrders}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{formatCurrency(supplier.totalPurchaseAmount)}</span>
                    </TableCell>
                    <TableCell>
                      {getPaymentTermsBadge(supplier.paymentTerms)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(supplier)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Link to={`/suppliers/${supplier._id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Link to={`/suppliers/${supplier._id}/edit`}>
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedSupplierId(supplier._id);
                            setRatingData({ rating: supplier.rating || 5, notes: '' });
                            setShowRatingModal(true);
                          }}
                        >
                          <Star className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(supplier._id)}
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
            Page {currentPage} of {totalPages} ({totalSuppliers} total suppliers)
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
        title="Bulk Update Suppliers"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Update {selectedSuppliers.length} selected suppliers
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
              label="Payment Terms"
              options={paymentTermsOptions.filter(opt => opt.value)}
              value={bulkUpdateData.paymentTerms}
              onChange={(e) => setBulkUpdateData(prev => ({ 
                ...prev, 
                paymentTerms: e.target.value 
              }))}
              placeholder="Select payment terms"
            />
            
            <Input
              label="Rating (1-5)"
              type="number"
              min="1"
              max="5"
              value={bulkUpdateData.rating}
              onChange={(e) => setBulkUpdateData(prev => ({ 
                ...prev, 
                rating: parseInt(e.target.value) || 0 
              }))}
              placeholder="Enter rating"
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setShowBulkModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkUpdate}>
              Update Suppliers
            </Button>
          </div>
        </div>
      </Modal>

      {/* Rating Modal */}
      <Modal
        isOpen={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        title="Update Supplier Rating"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rating (1-5 stars)
            </label>
            <div className="flex items-center space-x-1">
              {Array.from({ length: 5 }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setRatingData(prev => ({ ...prev, rating: i + 1 }))}
                  className="focus:outline-none"
                >
                  <Star
                    className={`w-8 h-8 ${
                      i < ratingData.rating 
                        ? 'text-yellow-400 fill-current' 
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 text-sm text-gray-600">
                {ratingData.rating} star{ratingData.rating !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={ratingData.notes}
              onChange={(e) => setRatingData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Add notes about this rating..."
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setShowRatingModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleRatingUpdate}>
              Update Rating
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};