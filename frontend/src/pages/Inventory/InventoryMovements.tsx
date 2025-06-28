import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, Search, Filter, ArrowUpDown, ArrowUp, ArrowDown, 
  Calendar, Download, RefreshCw, Package, Eye, FileText,
  Clock, Truck, Warehouse, MapPin, BarChart3, Layers,
  ChevronDown, ChevronUp, Trash2, Edit, Move, Archive
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import { Select } from '../../components/UI/Select';
import { Badge } from '../../components/UI/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/UI/Table';
import { Modal } from '../../components/UI/Modal';
import { inventoryAPI, productsAPI } from '../../lib/api';
import { StockMovement, Product, Location } from '../../types';
import { formatCurrency, formatDate, formatDateTime } from '../../utils';
import toast from 'react-hot-toast';

export const InventoryMovements: React.FC = () => {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedMovement, setSelectedMovement] = useState<StockMovement | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState<any>(null);

  const [filters, setFilters] = useState({
    search: '',
    type: '',
    reason: '',
    product: '',
    location: '',
    startDate: '',
    endDate: '',
    sortBy: 'movementDate',
    sortOrder: 'desc' as 'asc' | 'desc'
  });

  const [movementData, setMovementData] = useState({
    productId: '',
    type: 'in',
    reason: 'purchase',
    quantity: '',
    notes: '',
    locationFrom: '',
    locationTo: ''
  });

  const [exportData, setExportData] = useState({
    format: 'csv',
    dateRange: '30days',
    customStartDate: '',
    customEndDate: ''
  });

  useEffect(() => {
    fetchMovements();
    fetchProducts();
    fetchLocations();
  }, [currentPage, filters]);

  const fetchMovements = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 10,
        ...filters
      };

      const response = await inventoryAPI.getMovements(params);
      setMovements(response.data.data);
      setSummary(response.data.summary);
      setTotalPages(response.data.pagination?.pages || 1);
    } catch (error) {
      toast.error('Failed to fetch stock movements');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await productsAPI.getAll({ limit: 100 });
      setProducts(response.data.data);
    } catch (error) {
      console.error('Failed to fetch products');
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await inventoryAPI.getLocations();
      setLocations(response.data.data);
    } catch (error) {
      console.error('Failed to fetch locations');
    }
  };

  const handleCreateMovement = async () => {
    try {
      if (!movementData.productId || !movementData.quantity) {
        toast.error('Please fill in all required fields');
        return;
      }

      // Validate transfer locations
      if (movementData.type === 'transfer') {
        if (!movementData.locationFrom || !movementData.locationTo) {
          toast.error('Both from and to locations are required for transfers');
          return;
        }
        
        if (movementData.locationFrom === movementData.locationTo) {
          toast.error('From and to locations cannot be the same');
          return;
        }
      }

      await inventoryAPI.createMovement({
        productId: movementData.productId,
        type: movementData.type,
        reason: movementData.reason,
        quantity: parseInt(movementData.quantity),
        notes: movementData.notes,
        locationFrom: movementData.type === 'transfer' ? movementData.locationFrom : undefined,
        locationTo: movementData.type === 'transfer' ? movementData.locationTo : undefined
      });

      toast.success('Stock movement created successfully');
      setShowMovementModal(false);
      resetMovementForm();
      fetchMovements();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create stock movement');
    }
  };

  const handleExport = async () => {
    try {
      // Prepare date range based on selection
      let startDate = '';
      let endDate = '';
      
      const today = new Date();
      
      switch (exportData.dateRange) {
        case '7days':
          startDate = new Date(today.setDate(today.getDate() - 7)).toISOString().split('T')[0];
          endDate = new Date().toISOString().split('T')[0];
          break;
        case '30days':
          startDate = new Date(today.setDate(today.getDate() - 30)).toISOString().split('T')[0];
          endDate = new Date().toISOString().split('T')[0];
          break;
        case '90days':
          startDate = new Date(today.setDate(today.getDate() - 90)).toISOString().split('T')[0];
          endDate = new Date().toISOString().split('T')[0];
          break;
        case 'custom':
          startDate = exportData.customStartDate;
          endDate = exportData.customEndDate;
          break;
      }
      
      const response = await inventoryAPI.exportMovements({
        format: exportData.format,
        filters: {
          ...filters,
          startDate,
          endDate
        }
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
      link.download = `stock-movements-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Stock movements exported successfully');
      setShowExportModal(false);
    } catch (error) {
      toast.error('Failed to export stock movements');
    }
  };

  const resetMovementForm = () => {
    setMovementData({
      productId: '',
      type: 'in',
      reason: 'purchase',
      quantity: '',
      notes: '',
      locationFrom: '',
      locationTo: ''
    });
  };

  const handleViewMovement = (movement: StockMovement) => {
    setSelectedMovement(movement);
  };

  const getMovementTypeBadge = (type: string) => {
    const variants = {
      in: 'success',
      out: 'danger',
      transfer: 'info',
      adjustment: 'warning'
    } as const;
    
    const icons = {
      in: ArrowUp,
      out: ArrowDown,
      transfer: ArrowUpDown,
      adjustment: RefreshCw
    } as const;
    
    const Icon = icons[type as keyof typeof icons] || ArrowUpDown;
    
    return <Badge variant={variants[type as keyof typeof variants] || 'default'} className="flex items-center gap-1">
      <Icon className="w-3 h-3" />
      {type.toUpperCase()}
    </Badge>;
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

  const movementTypeOptions = [
    { value: 'in', label: 'Stock In' },
    { value: 'out', label: 'Stock Out' },
    { value: 'transfer', label: 'Transfer' },
    { value: 'adjustment', label: 'Adjustment' }
  ];

  const movementReasonOptions = {
    in: [
      { value: 'purchase', label: 'Purchase' },
      { value: 'return', label: 'Customer Return' },
      { value: 'adjustment', label: 'Adjustment' },
      { value: 'opening_stock', label: 'Opening Stock' },
      { value: 'manufacturing', label: 'Manufacturing' }
    ],
    out: [
      { value: 'sale', label: 'Sale' },
      { value: 'damage', label: 'Damage' },
      { value: 'loss', label: 'Loss' },
      { value: 'theft', label: 'Theft' },
      { value: 'adjustment', label: 'Adjustment' }
    ],
    transfer: [
      { value: 'transfer', label: 'Location Transfer' }
    ],
    adjustment: [
      { value: 'adjustment', label: 'Stock Adjustment' }
    ]
  };

  const sortOptions = [
    { value: 'movementDate', label: 'Date' },
    { value: 'type', label: 'Type' },
    { value: 'reason', label: 'Reason' },
    { value: 'quantity', label: 'Quantity' }
  ];

  const exportFormatOptions = [
    { value: 'csv', label: 'CSV' },
    { value: 'excel', label: 'Excel' },
    { value: 'pdf', label: 'PDF' }
  ];

  const dateRangeOptions = [
    { value: '7days', label: 'Last 7 Days' },
    { value: '30days', label: 'Last 30 Days' },
    { value: '90days', label: 'Last 90 Days' },
    { value: 'custom', label: 'Custom Range' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock Movements</h1>
          <p className="text-gray-600">Track and manage inventory movements</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" size="sm" onClick={() => setShowExportModal(true)}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowSummary(!showSummary)}>
            <BarChart3 className="w-4 h-4 mr-2" />
            {showSummary ? 'Hide Summary' : 'Show Summary'}
          </Button>
          <Button onClick={() => setShowMovementModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Movement
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      {showSummary && summary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Layers className="w-5 h-5 mr-2" />
              Movement Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-blue-900">Total Movements</h3>
                  <ArrowUpDown className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-blue-600">{summary.totalMovements}</p>
                <div className="flex items-center justify-between mt-2 text-sm">
                  <span className="text-blue-700">In: {summary.inMovements}</span>
                  <span className="text-blue-700">Out: {summary.outMovements}</span>
                </div>
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-green-900">Total In</h3>
                  <ArrowUp className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-2xl font-bold text-green-600">{summary.totalQuantityIn}</p>
                <p className="text-sm text-green-700 mt-2">Units added to inventory</p>
              </div>
              
              <div className="p-4 bg-red-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-red-900">Total Out</h3>
                  <ArrowDown className="w-5 h-5 text-red-600" />
                </div>
                <p className="text-2xl font-bold text-red-600">{summary.totalQuantityOut}</p>
                <p className="text-sm text-red-700 mt-2">Units removed from inventory</p>
              </div>
              
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-purple-900">Total Value</h3>
                  <FileText className="w-5 h-5 text-purple-600" />
                </div>
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(summary.totalValue)}</p>
                <p className="text-sm text-purple-700 mt-2">Value of all movements</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by product name, SKU, or notes..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Select
                options={typeOptions}
                value={filters.type}
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                placeholder="Filter by type"
              />
              
              <Select
                options={reasonOptions}
                value={filters.reason}
                onChange={(e) => setFilters(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Filter by reason"
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
                {filters.sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4 mr-2" />
                {showFilters ? 'Hide Filters' : 'More Filters'}
              </Button>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-4 gap-4">
              <Select
                options={products.map(p => ({ value: p._id, label: `${p.name} (${p.sku})` }))}
                value={filters.product}
                onChange={(e) => setFilters(prev => ({ ...prev, product: e.target.value }))}
                placeholder="Filter by product"
              />
              
              <Select
                options={locations.map(l => ({ value: l._id, label: `${l.name} (${l.code})` }))}
                value={filters.location}
                onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Filter by location"
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

      {/* Stock Movements Table */}
      <Card>
        <CardHeader>
          <CardTitle>Stock Movements</CardTitle>
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
          ) : movements.length === 0 ? (
            <div className="text-center py-12">
              <ArrowUpDown className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900">No movements found</h3>
              <p className="text-gray-600 mt-2">
                {Object.values(filters).some(v => v !== '' && v !== 'movementDate' && v !== 'desc')
                  ? 'Try adjusting your filters'
                  : 'Start by adding a new stock movement'
                }
              </p>
              <Button className="mt-4" onClick={() => setShowMovementModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                New Movement
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Previous Stock</TableHead>
                  <TableHead>New Stock</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Performed By</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((movement) => (
                  <TableRow key={movement._id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{formatDate(movement.movementDate)}</p>
                        <p className="text-xs text-gray-500">{new Date(movement.movementDate).toLocaleTimeString()}</p>
                      </div>
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
                    <TableCell>{getMovementTypeBadge(movement.type)}</TableCell>
                    <TableCell>{getReasonBadge(movement.reason)}</TableCell>
                    <TableCell>
                      <span className={movement.type === 'out' ? 'text-red-600' : 'text-green-600'}>
                        {movement.type === 'out' ? '-' : '+'}{movement.quantity}
                        {typeof movement.product === 'object' ? ` ${movement.product.unit}` : ''}
                      </span>
                    </TableCell>
                    <TableCell>{movement.previousStock}</TableCell>
                    <TableCell>{movement.newStock}</TableCell>
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
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewMovement(movement)}
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-700">
            Page {currentPage} of {totalPages}
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

      {/* New Movement Modal */}
      <Modal
        isOpen={showMovementModal}
        onClose={() => setShowMovementModal(false)}
        title="Create Stock Movement"
        size="lg"
      >
        <div className="space-y-4">
          <Select
            label="Product *"
            options={products.map(p => ({ value: p._id, label: `${p.name} (${p.sku})` }))}
            value={movementData.productId}
            onChange={(e) => setMovementData(prev => ({ ...prev, productId: e.target.value }))}
            placeholder="Select a product"
          />
          
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Movement Type *"
              options={movementTypeOptions}
              value={movementData.type}
              onChange={(e) => setMovementData(prev => ({ 
                ...prev, 
                type: e.target.value as any,
                reason: movementReasonOptions[e.target.value as keyof typeof movementReasonOptions][0].value
              }))}
            />
            
            <Select
              label="Reason *"
              options={movementReasonOptions[movementData.type as keyof typeof movementReasonOptions]}
              value={movementData.reason}
              onChange={(e) => setMovementData(prev => ({ ...prev, reason: e.target.value }))}
            />
          </div>
          
          <Input
            label="Quantity *"
            type="number"
            value={movementData.quantity}
            onChange={(e) => setMovementData(prev => ({ ...prev, quantity: e.target.value }))}
            placeholder="Enter quantity"
          />
          
          {movementData.type === 'transfer' && (
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="From Location *"
                options={locations.map(l => ({ value: l._id, label: `${l.name} (${l.code})` }))}
                value={movementData.locationFrom}
                onChange={(e) => setMovementData(prev => ({ ...prev, locationFrom: e.target.value }))}
                placeholder="Select source location"
              />
              
              <Select
                label="To Location *"
                options={locations.map(l => ({ value: l._id, label: `${l.name} (${l.code})` }))}
                value={movementData.locationTo}
                onChange={(e) => setMovementData(prev => ({ ...prev, locationTo: e.target.value }))}
                placeholder="Select destination location"
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={movementData.notes}
              onChange={(e) => setMovementData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Add notes about this movement..."
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setShowMovementModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateMovement}>
              Create Movement
            </Button>
          </div>
        </div>
      </Modal>

      {/* Movement Details Modal */}
      <Modal
        isOpen={!!selectedMovement}
        onClose={() => setSelectedMovement(null)}
        title="Movement Details"
        size="lg"
      >
        {selectedMovement && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Movement Information</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type:</span>
                    <span>{getMovementTypeBadge(selectedMovement.type)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Reason:</span>
                    <span>{getReasonBadge(selectedMovement.reason)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date & Time:</span>
                    <span>{formatDateTime(selectedMovement.movementDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Quantity:</span>
                    <span className="font-medium">{selectedMovement.quantity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Previous Stock:</span>
                    <span>{selectedMovement.previousStock}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">New Stock:</span>
                    <span>{selectedMovement.newStock}</span>
                  </div>
                  {selectedMovement.unitCost && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Unit Cost:</span>
                      <span>{formatCurrency(selectedMovement.unitCost)}</span>
                    </div>
                  )}
                  {selectedMovement.totalCost && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Cost:</span>
                      <span>{formatCurrency(selectedMovement.totalCost)}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Product & Location</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Product:</span>
                    <span className="font-medium">
                      {typeof selectedMovement.product === 'object' 
                        ? selectedMovement.product.name 
                        : 'Unknown Product'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">SKU:</span>
                    <span>
                      {typeof selectedMovement.product === 'object' 
                        ? selectedMovement.product.sku 
                        : ''
                      }
                    </span>
                  </div>
                  
                  {selectedMovement.type === 'transfer' ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">From Location:</span>
                        <span>
                          {typeof selectedMovement.location.from === 'object' 
                            ? selectedMovement.location.from.name 
                            : 'Unknown'
                          }
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">To Location:</span>
                        <span>
                          {typeof selectedMovement.location.to === 'object' 
                            ? selectedMovement.location.to.name 
                            : 'Unknown'
                          }
                        </span>
                      </div>
                    </>
                  ) : null}
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Performed By:</span>
                    <span>
                      {typeof selectedMovement.performedBy === 'object' 
                        ? `${selectedMovement.performedBy.firstName} ${selectedMovement.performedBy.lastName}`
                        : 'Unknown User'
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {selectedMovement.notes && (
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Notes</h3>
                <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{selectedMovement.notes}</p>
              </div>
            )}
            
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setSelectedMovement(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Export Modal */}
      <Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Export Stock Movements"
        size="md"
      >
        <div className="space-y-4">
          <Select
            label="Export Format"
            options={exportFormatOptions}
            value={exportData.format}
            onChange={(e) => setExportData(prev => ({ ...prev, format: e.target.value }))}
          />
          
          <Select
            label="Date Range"
            options={dateRangeOptions}
            value={exportData.dateRange}
            onChange={(e) => setExportData(prev => ({ ...prev, dateRange: e.target.value }))}
          />
          
          {exportData.dateRange === 'custom' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <Input
                  type="date"
                  value={exportData.customStartDate}
                  onChange={(e) => setExportData(prev => ({ ...prev, customStartDate: e.target.value }))}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <Input
                  type="date"
                  value={exportData.customEndDate}
                  onChange={(e) => setExportData(prev => ({ ...prev, customEndDate: e.target.value }))}
                />
              </div>
            </div>
          )}
          
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setShowExportModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleExport}>
              Export
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};