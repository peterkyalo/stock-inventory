import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, ArrowUpDown, ArrowUp, ArrowDown, MapPin, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import { Select } from '../../components/UI/Select';
import { Badge } from '../../components/UI/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/UI/Table';
import { Modal } from '../../components/UI/Modal';
import { inventoryAPI, productsAPI } from '../../lib/api';
import { StockMovement, Product } from '../../types';
import { formatDate, formatCurrency } from '../../utils';
import toast from 'react-hot-toast';

export const InventoryList: React.FC = () => {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [reasonFilter, setReasonFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [movementData, setMovementData] = useState({
    type: 'in',
    reason: 'purchase',
    quantity: '',
    notes: '',
    locationFrom: '',
    locationTo: ''
  });

  useEffect(() => {
    fetchMovements();
    fetchProducts();
  }, [currentPage, typeFilter, reasonFilter]);

  const fetchMovements = async () => {
    try {
      setLoading(true);
      const response = await inventoryAPI.getMovements({
        page: currentPage,
        limit: 10,
        type: typeFilter,
        reason: reasonFilter,
      });
      setMovements(response.data.data);
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

  const handleCreateMovement = async () => {
    try {
      if (!selectedProduct || !movementData.quantity) {
        toast.error('Please fill in all required fields');
        return;
      }

      await inventoryAPI.createMovement({
        productId: selectedProduct,
        ...movementData,
        quantity: parseInt(movementData.quantity)
      });

      toast.success('Stock movement created successfully');
      setShowMovementModal(false);
      setMovementData({
        type: 'in',
        reason: 'purchase',
        quantity: '',
        notes: '',
        locationFrom: '',
        locationTo: ''
      });
      setSelectedProduct('');
      fetchMovements();
    } catch (error) {
      toast.error('Failed to create stock movement');
    }
  };

  const getMovementTypeBadge = (type: string) => {
    const variants = {
      in: 'success',
      out: 'danger',
      transfer: 'info',
      adjustment: 'warning'
    } as const;
    return <Badge variant={variants[type as keyof typeof variants]}>{type.toUpperCase()}</Badge>;
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
    { value: 'opening_stock', label: 'Opening Stock' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600">Track and manage stock movements</p>
        </div>
        <div className="flex space-x-3">
          <Link to="/inventory/locations">
            <Button variant="outline">
              <MapPin className="w-4 h-4 mr-2" />
              Manage Locations
            </Button>
          </Link>
          <Button onClick={() => setShowMovementModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Stock Movement
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Products</p>
                <p className="text-2xl font-bold text-gray-900">{products.length}</p>
              </div>
              <ArrowUpDown className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {products.filter(p => p.currentStock <= p.minimumStock).length}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Out of Stock</p>
                <p className="text-2xl font-bold text-red-600">
                  {products.filter(p => p.currentStock === 0).length}
                </p>
              </div>
              <ArrowDown className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Value</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(products.reduce((sum, p) => sum + (p.currentStock * p.costPrice), 0))}
                </p>
              </div>
              <ArrowUp className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              options={typeOptions}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              placeholder="Filter by type"
            />
            <Select
              options={reasonOptions}
              value={reasonFilter}
              onChange={(e) => setReasonFilter(e.target.value)}
              placeholder="Filter by reason"
            />
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              More Filters
            </Button>
          </div>
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
                  <TableHead>Performed By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((movement) => (
                  <TableRow key={movement._id}>
                    <TableCell>{formatDate(movement.movementDate)}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {typeof movement.product === 'object' ? movement.product.name : 'Unknown Product'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {typeof movement.product === 'object' ? movement.product.sku : ''}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{getMovementTypeBadge(movement.type)}</TableCell>
                    <TableCell>
                      <span className="capitalize">{movement.reason.replace('_', ' ')}</span>
                    </TableCell>
                    <TableCell>
                      <span className={movement.type === 'out' ? 'text-red-600' : 'text-green-600'}>
                        {movement.type === 'out' ? '-' : '+'}{movement.quantity}
                      </span>
                    </TableCell>
                    <TableCell>{movement.previousStock}</TableCell>
                    <TableCell>{movement.newStock}</TableCell>
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

      {/* Stock Movement Modal */}
      <Modal
        isOpen={showMovementModal}
        onClose={() => setShowMovementModal(false)}
        title="Create Stock Movement"
        size="lg"
      >
        <div className="space-y-4">
          <Select
            label="Product"
            options={products.map(p => ({ value: p._id, label: `${p.name} (${p.sku})` }))}
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            placeholder="Select a product"
          />
          
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Movement Type"
              options={[
                { value: 'in', label: 'Stock In' },
                { value: 'out', label: 'Stock Out' },
                { value: 'transfer', label: 'Transfer' },
                { value: 'adjustment', label: 'Adjustment' }
              ]}
              value={movementData.type}
              onChange={(e) => setMovementData(prev => ({ ...prev, type: e.target.value }))}
            />
            
            <Select
              label="Reason"
              options={reasonOptions.filter(r => r.value)}
              value={movementData.reason}
              onChange={(e) => setMovementData(prev => ({ ...prev, reason: e.target.value }))}
            />
          </div>
          
          <Input
            label="Quantity"
            type="number"
            value={movementData.quantity}
            onChange={(e) => setMovementData(prev => ({ ...prev, quantity: e.target.value }))}
            placeholder="Enter quantity"
          />
          
          <Input
            label="Notes"
            value={movementData.notes}
            onChange={(e) => setMovementData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Optional notes"
          />
          
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
    </div>
  );
};