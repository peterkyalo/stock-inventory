import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Move, Package, Warehouse, Search, 
  ArrowRight, AlertTriangle, CheckCircle, Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import { Select } from '../../components/UI/Select';
import { Badge } from '../../components/UI/Badge';
import { inventoryAPI, productsAPI } from '../../lib/api';
import { Product, Location } from '../../types';
import { formatCurrency } from '../../utils';
import toast from 'react-hot-toast';

export const StockTransfer: React.FC = () => {
  const navigate = useNavigate();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [productLoading, setProductLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productStockByLocation, setProductStockByLocation] = useState<any[]>([]);
  
  const [transferData, setTransferData] = useState({
    productId: '',
    fromLocationId: '',
    toLocationId: '',
    quantity: '',
    notes: ''
  });

  const [validationErrors, setValidationErrors] = useState({
    productId: '',
    fromLocationId: '',
    toLocationId: '',
    quantity: ''
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = products.filter(product => 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.brand.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts(products);
    }
  }, [searchTerm, products]);

  useEffect(() => {
    if (transferData.productId) {
      fetchProductStockByLocation(transferData.productId);
    }
  }, [transferData.productId]);

  useEffect(() => {
    // Reset quantity when from location changes
    if (transferData.fromLocationId) {
      const locationStock = productStockByLocation.find(
        loc => loc.location._id === transferData.fromLocationId
      );
      
      if (locationStock) {
        setTransferData(prev => ({
          ...prev,
          quantity: Math.min(locationStock.quantity, 1).toString()
        }));
      } else {
        setTransferData(prev => ({
          ...prev,
          quantity: ''
        }));
      }
    }
  }, [transferData.fromLocationId, productStockByLocation]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [productsResponse, locationsResponse] = await Promise.all([
        productsAPI.getAll({ limit: 100 }),
        inventoryAPI.getLocations({ limit: 100, active: true })
      ]);

      setProducts(productsResponse.data.data);
      setFilteredProducts(productsResponse.data.data);
      setLocations(locationsResponse.data.data);
    } catch (error) {
      console.error('Failed to fetch initial data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchProductStockByLocation = async (productId: string) => {
    try {
      setProductLoading(true);
      const response = await inventoryAPI.getProductStockByLocation(productId);
      setSelectedProduct(response.data.data.product);
      setProductStockByLocation(response.data.data.stockLocations);
    } catch (error) {
      console.error('Failed to fetch product stock by location:', error);
      toast.error('Failed to load product stock information');
    } finally {
      setProductLoading(false);
    }
  };

  const validateForm = () => {
    const errors = {
      productId: '',
      fromLocationId: '',
      toLocationId: '',
      quantity: ''
    };
    
    if (!transferData.productId) {
      errors.productId = 'Please select a product';
    }
    
    if (!transferData.fromLocationId) {
      errors.fromLocationId = 'Please select a source location';
    }
    
    if (!transferData.toLocationId) {
      errors.toLocationId = 'Please select a destination location';
    }
    
    if (transferData.fromLocationId === transferData.toLocationId) {
      errors.toLocationId = 'Source and destination locations cannot be the same';
    }
    
    if (!transferData.quantity) {
      errors.quantity = 'Please enter a quantity';
    } else if (parseInt(transferData.quantity) <= 0) {
      errors.quantity = 'Quantity must be greater than zero';
    } else {
      // Check if quantity exceeds available stock
      const locationStock = productStockByLocation.find(
        loc => loc.location._id === transferData.fromLocationId
      );
      
      if (locationStock && parseInt(transferData.quantity) > locationStock.quantity) {
        errors.quantity = `Quantity exceeds available stock (${locationStock.quantity})`;
      }
    }
    
    setValidationErrors(errors);
    return !Object.values(errors).some(error => error);
  };

  const handleTransfer = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      await inventoryAPI.transferStock({
        productId: transferData.productId,
        fromLocationId: transferData.fromLocationId,
        toLocationId: transferData.toLocationId,
        quantity: parseInt(transferData.quantity),
        notes: transferData.notes
      });

      toast.success('Stock transferred successfully');
      
      // Reset form
      setTransferData({
        productId: '',
        fromLocationId: '',
        toLocationId: '',
        quantity: '',
        notes: ''
      });
      
      setSelectedProduct(null);
      setProductStockByLocation([]);
      
      // Navigate to movements page
      navigate('/inventory/movements');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to transfer stock');
    }
  };

  const getAvailableFromLocations = () => {
    if (!transferData.productId) return [];
    
    return productStockByLocation
      .filter(loc => loc.quantity > 0)
      .map(loc => ({
        value: loc.location._id,
        label: `${loc.location.name} (${loc.quantity} units available)`
      }));
  };

  const getAvailableToLocations = () => {
    if (!transferData.fromLocationId) return [];
    
    return locations
      .filter(loc => loc._id !== transferData.fromLocationId && loc.isActive)
      .map(loc => ({
        value: loc._id,
        label: `${loc.name} (${loc.code})`
      }));
  };

  const getMaxQuantity = () => {
    if (!transferData.fromLocationId) return 0;
    
    const locationStock = productStockByLocation.find(
      loc => loc.location._id === transferData.fromLocationId
    );
    
    return locationStock ? locationStock.quantity : 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => navigate('/inventory')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Stock Transfer</h1>
            <p className="text-gray-600">Move inventory between locations</p>
          </div>
        </div>
      </div>

      {/* Step 1: Select Product */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Package className="w-5 h-5 mr-2" />
            Step 1: Select Product
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search products by name or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select
            label="Product *"
            options={filteredProducts.map(p => ({ value: p._id, label: `${p.name} (${p.sku})` }))}
            value={transferData.productId}
            onChange={(e) => setTransferData(prev => ({ 
              ...prev, 
              productId: e.target.value,
              fromLocationId: '',
              toLocationId: '',
              quantity: ''
            }))}
            placeholder="Select a product"
            error={validationErrors.productId}
          />

          {selectedProduct && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  {selectedProduct.images && selectedProduct.images[0] ? (
                    <img
                      src={selectedProduct.images[0].url}
                      alt={selectedProduct.name}
                      className="w-12 h-12 rounded object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                      <Package className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-medium text-blue-900">{selectedProduct.name}</h3>
                  <p className="text-sm text-blue-700">SKU: {selectedProduct.sku}</p>
                  <div className="flex items-center mt-1">
                    <Badge variant="default">
                      Total Stock: {selectedProduct.currentStock} {selectedProduct.unit}
                    </Badge>
                    <Badge variant="default" className="ml-2">
                      Value: {formatCurrency(selectedProduct.costPrice * selectedProduct.currentStock)}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Select Locations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Warehouse className="w-5 h-5 mr-2" />
            Step 2: Select Source and Destination
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Select
                label="From Location *"
                options={getAvailableFromLocations()}
                value={transferData.fromLocationId}
                onChange={(e) => setTransferData(prev => ({ 
                  ...prev, 
                  fromLocationId: e.target.value,
                  toLocationId: '',
                  quantity: ''
                }))}
                placeholder="Select source location"
                error={validationErrors.fromLocationId}
                disabled={!transferData.productId || productLoading}
              />
              
              {productLoading && (
                <div className="mt-2 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-sm text-gray-600">Loading stock data...</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center">
              <div className="flex-1">
                <Select
                  label="To Location *"
                  options={getAvailableToLocations()}
                  value={transferData.toLocationId}
                  onChange={(e) => setTransferData(prev => ({ ...prev, toLocationId: e.target.value }))}
                  placeholder="Select destination location"
                  error={validationErrors.toLocationId}
                  disabled={!transferData.fromLocationId}
                />
              </div>
              <div className="flex-shrink-0 mt-6 mx-4">
                <ArrowRight className="w-6 h-6 text-gray-400" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 3: Quantity and Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Move className="w-5 h-5 mr-2" />
            Step 3: Specify Quantity and Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity *
              </label>
              <div className="flex items-center space-x-2">
                <Input
                  type="number"
                  value={transferData.quantity}
                  onChange={(e) => setTransferData(prev => ({ ...prev, quantity: e.target.value }))}
                  placeholder="Enter quantity"
                  error={validationErrors.quantity}
                  disabled={!transferData.fromLocationId || !transferData.toLocationId}
                />
                <span className="text-sm text-gray-600">
                  / {getMaxQuantity()} available
                </span>
              </div>
            </div>
            
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => setTransferData(prev => ({ ...prev, quantity: getMaxQuantity().toString() }))}
                disabled={!transferData.fromLocationId || !transferData.toLocationId || getMaxQuantity() === 0}
                className="mb-1"
              >
                Max
              </Button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={transferData.notes}
              onChange={(e) => setTransferData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Add notes about this transfer..."
              disabled={!transferData.fromLocationId || !transferData.toLocationId}
            />
          </div>
          
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-900">Important Note</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Stock transfers will immediately move inventory from one location to another. 
                  This action cannot be undone, so please verify all information before proceeding.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit Buttons */}
      <div className="flex items-center justify-end space-x-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate('/inventory')}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleTransfer}
          disabled={!transferData.productId || !transferData.fromLocationId || !transferData.toLocationId || !transferData.quantity}
        >
          <Move className="w-4 h-4 mr-2" />
          Complete Transfer
        </Button>
      </div>
    </div>
  );
};