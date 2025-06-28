import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, Edit, Trash2, Package, DollarSign, 
  Warehouse, Tag, Calendar, Star, TrendingUp, 
  TrendingDown, AlertTriangle, CheckCircle, XCircle,
  Plus, Minus, BarChart3, Eye, Download, Share2,
  Image as ImageIcon, Info, Award, Truck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Badge } from '../../components/UI/Badge';
import { Modal } from '../../components/UI/Modal';
import { Input } from '../../components/UI/Input';
import { productsAPI } from '../../lib/api';
import { Product, ProductAnalytics } from '../../types';
import { formatCurrency, formatDate } from '../../utils';
import toast from 'react-hot-toast';

export const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [analytics, setAnalytics] = useState<ProductAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [stockOperation, setStockOperation] = useState<'add' | 'subtract' | 'set'>('add');
  const [stockQuantity, setStockQuantity] = useState('');

  useEffect(() => {
    if (id) {
      fetchProduct(id);
      fetchAnalytics(id);
    }
  }, [id]);

  const fetchProduct = async (productId: string) => {
    try {
      setLoading(true);
      const response = await productsAPI.getById(productId);
      setProduct(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch product details');
      navigate('/products');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async (productId: string) => {
    try {
      const response = await productsAPI.getAnalytics(productId);
      setAnalytics(response.data.data);
    } catch (error) {
      console.error('Failed to fetch analytics');
    }
  };

  const handleDelete = async () => {
    if (!product) return;
    
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await productsAPI.delete(product._id);
        toast.success('Product deleted successfully');
        navigate('/products');
      } catch (error) {
        toast.error('Failed to delete product');
      }
    }
  };

  const handleStockUpdate = async () => {
    if (!product || !stockQuantity) return;

    try {
      await productsAPI.updateStock(product._id, {
        quantity: parseInt(stockQuantity),
        operation: stockOperation
      });
      
      toast.success('Stock updated successfully');
      setShowStockModal(false);
      setStockQuantity('');
      fetchProduct(product._id);
      fetchAnalytics(product._id);
    } catch (error) {
      toast.error('Failed to update stock');
    }
  };

  const getStockStatusIcon = (status: string) => {
    switch (status) {
      case 'out_of_stock':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'low_stock':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default:
        return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
  };

  const getStockStatusBadge = (status: string) => {
    switch (status) {
      case 'out_of_stock':
        return <Badge variant="danger">Out of Stock</Badge>;
      case 'low_stock':
        return <Badge variant="warning">Low Stock</Badge>;
      default:
        return <Badge variant="success">In Stock</Badge>;
    }
  };

  const getProfitTrend = (profitMargin: number) => {
    if (profitMargin > 30) {
      return <TrendingUp className="w-5 h-5 text-green-500" />;
    } else if (profitMargin < 10) {
      return <TrendingDown className="w-5 h-5 text-red-500" />;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900">Product not found</h2>
        <p className="text-gray-600 mt-2">The product you're looking for doesn't exist.</p>
        <Link to="/products">
          <Button className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Products
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => navigate('/products')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
            <p className="text-gray-600">{product.brand} • SKU: {product.sku}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm">
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Link to={`/products/${product._id}/edit`}>
            <Button variant="outline" size="sm">
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={handleDelete}>
            <Trash2 className="w-4 h-4 mr-2 text-red-500" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Product Images and Basic Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Product Images */}
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {product.images && product.images.length > 0 ? (
                  <>
                    <div 
                      className="aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer"
                      onClick={() => setShowImageModal(true)}
                    >
                      <img
                        src={product.primaryImage?.url || product.images[0].url}
                        alt={product.name}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                      />
                    </div>
                    
                    {product.images.length > 1 && (
                      <div className="grid grid-cols-4 gap-2">
                        {product.images.slice(0, 4).map((image, index) => (
                          <div
                            key={index}
                            className="aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer border-2 border-transparent hover:border-blue-500"
                            onClick={() => {
                              setSelectedImageIndex(index);
                              setShowImageModal(true);
                            }}
                          >
                            <img
                              src={image.url}
                              alt={`${product.name} ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                    <ImageIcon className="w-16 h-16 text-gray-400" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                className="w-full" 
                onClick={() => setShowStockModal(true)}
              >
                <Warehouse className="w-4 h-4 mr-2" />
                Update Stock
              </Button>
              <Button variant="outline" className="w-full">
                <BarChart3 className="w-4 h-4 mr-2" />
                View Analytics
              </Button>
              <Button variant="outline" className="w-full">
                <Eye className="w-4 h-4 mr-2" />
                View History
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Product Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status and Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Stock Status</p>
                    <div className="flex items-center space-x-2 mt-1">
                      {getStockStatusIcon(product.stockStatus || 'in_stock')}
                      {getStockStatusBadge(product.stockStatus || 'in_stock')}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Current Stock</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {product.currentStock} {product.unit}
                    </p>
                    <p className="text-sm text-gray-500">Min: {product.minimumStock}</p>
                  </div>
                  <Warehouse className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Profit Margin</p>
                    <div className="flex items-center space-x-2">
                      <p className="text-2xl font-bold text-gray-900">
                        {product.profitMargin}%
                      </p>
                      {getProfitTrend(parseFloat(product.profitMargin || '0'))}
                    </div>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Product Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="w-5 h-5 mr-2" />
                Product Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Basic Details</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Name:</span>
                      <span className="font-medium">{product.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Brand:</span>
                      <span className="font-medium">{product.brand}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">SKU:</span>
                      <span className="font-mono text-sm">{product.sku}</span>
                    </div>
                    {product.barcode && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Barcode:</span>
                        <span className="font-mono text-sm">{product.barcode}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Category:</span>
                      <span className="font-medium">
                        {typeof product.category === 'object' ? product.category.name : product.category}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Unit:</span>
                      <span className="font-medium capitalize">{product.unit}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Pricing</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cost Price:</span>
                      <span className="font-medium">{formatCurrency(product.costPrice)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Selling Price:</span>
                      <span className="font-medium">{formatCurrency(product.sellingPrice)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Profit Amount:</span>
                      <span className="font-medium text-green-600">
                        {formatCurrency(product.sellingPrice - product.costPrice)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tax:</span>
                      <span className="font-medium">{product.tax}%</span>
                    </div>
                    {analytics && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Stock Value:</span>
                        <span className="font-medium">
                          {formatCurrency(analytics.totalValue.costValue)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              {product.description && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Description</h4>
                  <p className="text-gray-700">{product.description}</p>
                </div>
              )}

              {/* Tags */}
              {product.tags && product.tags.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {product.tags.map((tag, index) => (
                      <Badge key={index} variant="default">
                        <Tag className="w-3 h-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Specifications */}
          {product.specifications && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Info className="w-5 h-5 mr-2" />
                  Specifications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Physical Properties */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Physical Properties</h4>
                    <div className="space-y-2">
                      {product.specifications.weight?.value && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Weight:</span>
                          <span className="font-medium">
                            {product.specifications.weight.value} {product.specifications.weight.unit}
                          </span>
                        </div>
                      )}
                      {product.specifications.dimensions && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Dimensions:</span>
                          <span className="font-medium">
                            {product.specifications.dimensions.length} × {product.specifications.dimensions.width} × {product.specifications.dimensions.height} {product.specifications.dimensions.unit}
                          </span>
                        </div>
                      )}
                      {product.specifications.color && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Color:</span>
                          <span className="font-medium">{product.specifications.color}</span>
                        </div>
                      )}
                      {product.specifications.material && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Material:</span>
                          <span className="font-medium">{product.specifications.material}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Product Details */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Product Details</h4>
                    <div className="space-y-2">
                      {product.specifications.size && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Size:</span>
                          <span className="font-medium">{product.specifications.size}</span>
                        </div>
                      )}
                      {product.specifications.model && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Model:</span>
                          <span className="font-medium">{product.specifications.model}</span>
                        </div>
                      )}
                      {product.specifications.warranty?.period && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Warranty:</span>
                          <span className="font-medium">
                            {product.specifications.warranty.period} {product.specifications.warranty.unit}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Product Variants */}
          {product.variants && product.variants.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Tag className="w-5 h-5 mr-2" />
                  Product Variants
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {product.variants.map((variant, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <span className="font-medium">{variant.name}:</span>
                        <span className="ml-2">{variant.value}</span>
                      </div>
                      {variant.additionalPrice > 0 && (
                        <Badge variant="info">
                          +{formatCurrency(variant.additionalPrice)}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Supplier Information */}
          {product.supplier && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Truck className="w-5 h-5 mr-2" />
                  Supplier Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Supplier:</span>
                    <span className="font-medium">
                      {typeof product.supplier === 'object' ? product.supplier.name : product.supplier}
                    </span>
                  </div>
                  {typeof product.supplier === 'object' && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Email:</span>
                        <span className="font-medium">{product.supplier.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Phone:</span>
                        <span className="font-medium">{product.supplier.phone}</span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Analytics Summary */}
          {analytics && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Performance Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-600">Total Sold</p>
                    <p className="text-2xl font-bold text-blue-600">{analytics.totalSold}</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-gray-600">Total Purchased</p>
                    <p className="text-2xl font-bold text-green-600">{analytics.totalPurchased}</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <p className="text-sm text-gray-600">Images</p>
                    <p className="text-2xl font-bold text-purple-600">{analytics.imageCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Additional Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Additional Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Created:</span>
                    <span className="font-medium">{formatDate(product.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Last Updated:</span>
                    <span className="font-medium">{formatDate(product.updatedAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Last Stock Update:</span>
                    <span className="font-medium">{formatDate(product.lastStockUpdate)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  {product.isPerishable && (
                    <>
                      {product.manufacturingDate && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Manufacturing Date:</span>
                          <span className="font-medium">{formatDate(product.manufacturingDate)}</span>
                        </div>
                      )}
                      {product.expiryDate && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Expiry Date:</span>
                          <span className="font-medium">{formatDate(product.expiryDate)}</span>
                        </div>
                      )}
                      {product.batchNumber && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Batch Number:</span>
                          <span className="font-medium">{product.batchNumber}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {product.notes && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="font-medium text-gray-900 mb-2">Notes</h4>
                  <p className="text-gray-700">{product.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Stock Update Modal */}
      <Modal
        isOpen={showStockModal}
        onClose={() => setShowStockModal(false)}
        title="Update Stock"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Current Stock</p>
            <p className="text-2xl font-bold text-gray-900">
              {product.currentStock} {product.unit}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Button
              variant={stockOperation === 'add' ? 'default' : 'outline'}
              onClick={() => setStockOperation('add')}
              className="flex items-center justify-center"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
            <Button
              variant={stockOperation === 'subtract' ? 'default' : 'outline'}
              onClick={() => setStockOperation('subtract')}
              className="flex items-center justify-center"
            >
              <Minus className="w-4 h-4 mr-1" />
              Subtract
            </Button>
            <Button
              variant={stockOperation === 'set' ? 'default' : 'outline'}
              onClick={() => setStockOperation('set')}
              className="flex items-center justify-center"
            >
              Set
            </Button>
          </div>

          <Input
            label="Quantity"
            type="number"
            value={stockQuantity}
            onChange={(e) => setStockQuantity(e.target.value)}
            placeholder="Enter quantity"
          />

          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setShowStockModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleStockUpdate}>
              Update Stock
            </Button>
          </div>
        </div>
      </Modal>

      {/* Image Modal */}
      <Modal
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        title="Product Images"
        size="xl"
      >
        {product.images && product.images.length > 0 && (
          <div className="space-y-4">
            <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
              <img
                src={product.images[selectedImageIndex]?.url}
                alt={`${product.name} ${selectedImageIndex + 1}`}
                className="w-full h-full object-contain"
              />
            </div>
            
            {product.images.length > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {product.images.map((image, index) => (
                  <div
                    key={index}
                    className={`aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer border-2 ${
                      index === selectedImageIndex ? 'border-blue-500' : 'border-transparent'
                    }`}
                    onClick={() => setSelectedImageIndex(index)}
                  >
                    <img
                      src={image.url}
                      alt={`${product.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};