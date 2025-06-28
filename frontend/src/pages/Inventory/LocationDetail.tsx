import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, Warehouse, MapPin, Package, Phone, Mail, User, BarChart3, ArrowUpDown, ArrowUp, ArrowDown, RefreshCw, Clock, CheckCircle, XCircle, Download, Share2, Move, Search, Filter, SortAsc, SortDesc, Building, Store, Factory, MicOff as Office, AlertTriangle, Archive } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import { Select } from '../../components/UI/Select';
import { Badge } from '../../components/UI/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/UI/Table';
import { Modal } from '../../components/UI/Modal';
import { inventoryAPI, productsAPI } from '../../lib/api';
import { Location, Product, StockMovement } from '../../types';
import { formatCurrency, formatDate, debounce } from '../../utils';
import toast from 'react-hot-toast';

export const LocationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [location, setLocation] = useState<Location | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [recentMovements, setRecentMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [productCount, setProductCount] = useState(0);

  const [transferData, setTransferData] = useState({
    productId: '',
    toLocationId: '',
    quantity: '',
    notes: ''
  });

  const [locationData, setLocationData] = useState({
    name: '',
    code: '',
    type: 'warehouse',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: ''
    },
    contactPerson: {
      name: '',
      phone: '',
      email: ''
    },
    capacity: '',
    currentUtilization: '',
    notes: '',
    isActive: true
  });

  const [productFilters, setProductFilters] = useState({
    search: '',
    sortBy: 'name',
    sortOrder: 'asc' as 'asc' | 'desc'
  });

  // Debounced search function
  const debouncedSearch = debounce((searchTerm: string) => {
    setProductFilters(prev => ({ ...prev, search: searchTerm }));
    setCurrentPage(1);
  }, 500);

  useEffect(() => {
    if (id) {
      fetchLocation(id);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchLocationStock(id, currentPage, productFilters);
    }
  }, [id, currentPage, productFilters]);

  const fetchLocation = async (locationId: string) => {
    try {
      setLoading(true);
      const response = await inventoryAPI.getLocationById(locationId);
      const locationData = response.data.data;
      
      setLocation(locationData);
      setProducts(locationData.products || []);
      setRecentMovements(locationData.recentMovements || []);
      setProductCount(locationData.productCount || 0);
      setTotalPages(Math.ceil((locationData.productCount || 0) / 20));
      
      // Set location data for edit modal
      setLocationData({
        name: locationData.name,
        code: locationData.code,
        type: locationData.type,
        address: {
          street: locationData.address?.street || '',
          city: locationData.address?.city || '',
          state: locationData.address?.state || '',
          zipCode: locationData.address?.zipCode || '',
          country: locationData.address?.country || ''
        },
        contactPerson: {
          name: locationData.contactPerson?.name || '',
          phone: locationData.contactPerson?.phone || '',
          email: locationData.contactPerson?.email || ''
        },
        capacity: locationData.capacity?.toString() || '',
        currentUtilization: locationData.currentUtilization?.toString() || '',
        notes: locationData.notes || '',
        isActive: locationData.isActive
      });
    } catch (error) {
      toast.error('Failed to fetch location details');
      navigate('/inventory/locations');
    } finally {
      setLoading(false);
    }
  };

  const fetchLocationStock = async (locationId: string, page: number, filters: any) => {
    try {
      const params = {
        page,
        limit: 20,
        ...filters
      };

      const response = await inventoryAPI.getLocationStock(locationId, params);
      setProducts(response.data.data.products || []);
      setTotalPages(response.data.pagination?.pages || 1);
      setProductCount(response.data.pagination?.total || 0);
    } catch (error) {
      console.error('Failed to fetch location stock:', error);
    }
  };

  const handleDelete = async () => {
    if (!location) return;
    
    if (window.confirm('Are you sure you want to delete this location?')) {
      try {
        await inventoryAPI.deleteLocation(location._id);
        toast.success('Location deleted successfully');
        navigate('/inventory/locations');
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Failed to delete location');
      }
    }
  };

  const handleStatusToggle = async () => {
    if (!location) return;

    try {
      await inventoryAPI.updateLocationStatus(location._id, !location.isActive);
      toast.success(`Location ${!location.isActive ? 'activated' : 'deactivated'} successfully`);
      fetchLocation(location._id);
    } catch (error) {
      toast.error('Failed to update location status');
    }
  };

  const handleUpdateLocation = async () => {
    try {
      if (!location) return;
      
      if (!locationData.name || !locationData.code || !locationData.type) {
        toast.error('Please fill in all required fields');
        return;
      }

      // Format data
      const formattedData = {
        ...locationData,
        capacity: locationData.capacity ? parseInt(locationData.capacity) : undefined,
        currentUtilization: locationData.currentUtilization ? parseInt(locationData.currentUtilization) : undefined
      };

      await inventoryAPI.updateLocation(location._id, formattedData);
      toast.success('Location updated successfully');
      setShowEditModal(false);
      fetchLocation(location._id);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update location');
    }
  };

  const handleTransferStock = async () => {
    try {
      if (!location || !transferData.productId || !transferData.toLocationId || !transferData.quantity) {
        toast.error('Please fill in all required fields');
        return;
      }

      await inventoryAPI.transferStock({
        productId: transferData.productId,
        fromLocationId: location._id,
        toLocationId: transferData.toLocationId,
        quantity: parseInt(transferData.quantity),
        notes: transferData.notes
      });

      toast.success('Stock transferred successfully');
      setShowTransferModal(false);
      setTransferData({
        productId: '',
        toLocationId: '',
        quantity: '',
        notes: ''
      });
      fetchLocation(location._id);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to transfer stock');
    }
  };

  const getLocationTypeIcon = (type: string) => {
    switch (type) {
      case 'warehouse':
        return <Warehouse className="w-6 h-6 text-blue-600" />;
      case 'store':
        return <Store className="w-6 h-6 text-green-600" />;
      case 'outlet':
        return <Building className="w-6 h-6 text-purple-600" />;
      case 'factory':
        return <Factory className="w-6 h-6 text-orange-600" />;
      case 'office':
        return <Office className="w-6 h-6 text-gray-600" />;
      default:
        return <MapPin className="w-6 h-6 text-gray-600" />;
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge variant="success" className="flex items-center gap-1">
        <CheckCircle className="w-3 h-3" />
        Active
      </Badge>
    ) : (
      <Badge variant="danger" className="flex items-center gap-1">
        <XCircle className="w-3 h-3" />
        Inactive
      </Badge>
    );
  };

  const getUtilizationBadge = (current: number, capacity: number | undefined) => {
    if (!capacity) return null;
    
    const percentage = Math.round((current / capacity) * 100);
    
    if (percentage >= 90) {
      return <Badge variant="danger" className="flex items-center gap-1">
        <AlertTriangle className="w-3 h-3" />
        {percentage}% Full
      </Badge>;
    } else if (percentage >= 70) {
      return <Badge variant="warning">
        {percentage}% Full
      </Badge>;
    } else {
      return <Badge variant="success">
        {percentage}% Full
      </Badge>;
    }
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

  const sortOptions = [
    { value: 'name', label: 'Name' },
    { value: 'sku', label: 'SKU' },
    { value: 'locationQuantity', label: 'Quantity' },
    { value: 'locationValue', label: 'Value' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!location) {
    return (
      <div className="text-center py-12">
        <Warehouse className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900">Location not found</h2>
        <p className="text-gray-600 mt-2">The location you're looking for doesn't exist.</p>
        <Link to="/inventory/locations">
          <Button className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Locations
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
          <Button variant="outline" onClick={() => navigate('/inventory/locations')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{location.name}</h1>
            <p className="text-gray-600">Code: {location.code} • Type: <span className="capitalize">{location.type}</span></p>
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
          <Button variant="outline" size="sm" onClick={() => setShowEditModal(true)}>
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={handleStatusToggle}>
            {location.isActive ? (
              <>
                <XCircle className="w-4 h-4 mr-2" />
                Deactivate
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Activate
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={handleDelete}>
            <Trash2 className="w-4 h-4 mr-2 text-red-500" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Location Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Location Overview */}
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  {getLocationTypeIcon(location.type)}
                </div>
                <h2 className="text-xl font-bold text-gray-900">{location.name}</h2>
                <p className="text-gray-600 mt-1">Code: {location.code}</p>
                
                <div className="flex items-center justify-center space-x-2 mt-3">
                  {getStatusBadge(location.isActive)}
                  <Badge variant="default" className="capitalize">{location.type}</Badge>
                </div>

                {location.capacity && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-600 mb-1">Capacity Utilization</p>
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-full max-w-xs bg-gray-200 rounded-full h-2.5">
                        <div
                          className={`h-2.5 rounded-full ${
                            location.utilizationPercentage >= 90 ? 'bg-red-500' :
                            location.utilizationPercentage >= 70 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(location.utilizationPercentage || 0, 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">
                        {location.utilizationPercentage}%
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {location.currentUtilization} / {location.capacity} units
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{productCount}</p>
                  <p className="text-sm text-gray-600">Products</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(location.stockValue || 0)}
                  </p>
                  <p className="text-sm text-gray-600">Stock Value</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          {(location.contactPerson?.name || location.address?.street) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {location.contactPerson?.name && (
                  <div className="flex items-center space-x-3">
                    <User className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">{location.contactPerson.name}</p>
                      <p className="text-sm text-gray-500">Contact Person</p>
                    </div>
                  </div>
                )}
                
                {location.contactPerson?.phone && (
                  <div className="flex items-center space-x-3">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">{location.contactPerson.phone}</p>
                      <p className="text-sm text-gray-500">Phone</p>
                    </div>
                  </div>
                )}
                
                {location.contactPerson?.email && (
                  <div className="flex items-center space-x-3">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">{location.contactPerson.email}</p>
                      <p className="text-sm text-gray-500">Email</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Address */}
          {location.address?.street && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="w-5 h-5 mr-2" />
                  Address
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <p className="font-medium text-gray-900">{location.address.street}</p>
                  <p className="text-gray-600">
                    {location.address.city}, {location.address.state} {location.address.zipCode}
                  </p>
                  <p className="text-gray-600">{location.address.country}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {location.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">{location.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Products and Movements */}
        <div className="lg:col-span-2 space-y-6">
          {/* Products in Location */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Package className="w-5 h-5 mr-2" />
                  Products in this Location ({productCount})
                </CardTitle>
                <Button onClick={() => setShowTransferModal(true)}>
                  <Move className="w-4 h-4 mr-2" />
                  Transfer Stock
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search products..."
                      onChange={(e) => debouncedSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Select
                    options={sortOptions}
                    value={productFilters.sortBy}
                    onChange={(e) => setProductFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                  />
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setProductFilters(prev => ({ 
                      ...prev, 
                      sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc' 
                    }))}
                  >
                    {productFilters.sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {products.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No products in this location</p>
                  <p className="text-sm">Products will appear here once added to this location</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>% of Total</TableHead>
                        <TableHead>% in Location</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product) => (
                        <TableRow key={product._id}>
                          <TableCell>
                            <div className="flex items-center">
                              {product.images && product.images[0] ? (
                                <img
                                  src={product.images[0].url}
                                  alt={product.name}
                                  className="w-8 h-8 rounded object-cover mr-2"
                                />
                              ) : (
                                <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center mr-2">
                                  <Package className="w-4 h-4 text-gray-400" />
                                </div>
                              )}
                              <div>
                                <p className="font-medium">{product.name}</p>
                                <p className="text-xs text-gray-500">{product.brand}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-sm">{product.sku}</span>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{product.locationQuantity} {product.unit}</span>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{formatCurrency(product.locationValue)}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full"
                                  style={{ width: `${Math.min(product.locationValue / (location.stockValue || 1) * 100, 100)}%` }}
                                ></div>
                              </div>
                              <span className="text-sm">
                                {((product.locationValue / (location.stockValue || 1)) * 100).toFixed(1)}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-green-600 h-2 rounded-full"
                                  style={{ width: `${Math.min(product.percentage, 100)}%` }}
                                ></div>
                              </div>
                              <span className="text-sm">{product.percentage}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Link to={`/products/${product._id}`}>
                                <Button variant="ghost" size="sm">
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </Link>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setTransferData(prev => ({
                                    ...prev,
                                    productId: product._id,
                                    quantity: ''
                                  }));
                                  setShowTransferModal(true);
                                }}
                              >
                                <Move className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-700">
                        Page {currentPage} of {totalPages} ({productCount} total products)
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
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Movements */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  Recent Stock Movements
                </CardTitle>
                <Link to={`/inventory/movements?location=${location._id}`}>
                  <Button variant="outline" size="sm">
                    View All
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {recentMovements.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <ArrowUpDown className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No recent movements</p>
                  <p className="text-sm">Movements will appear here once created</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentMovements.map((movement) => (
                    <div key={movement._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          {getMovementTypeBadge(movement.type)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {typeof movement.product === 'object' ? movement.product.name : 'Unknown Product'}
                          </p>
                          <p className="text-sm text-gray-600">
                            {movement.quantity} units
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-900">{formatDate(movement.movementDate)}</p>
                        <p className="text-xs text-gray-600">
                          {typeof movement.performedBy === 'object' 
                            ? `${movement.performedBy.firstName} ${movement.performedBy.lastName}`
                            : 'Unknown User'
                          }
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Transfer Stock Modal */}
      <Modal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        title="Transfer Stock to Another Location"
        size="md"
      >
        <div className="space-y-4">
          <Select
            label="Product *"
            options={products.map(p => ({ value: p._id, label: `${p.name} (${p.sku})` }))}
            value={transferData.productId}
            onChange={(e) => {
              const product = products.find(p => p._id === e.target.value);
              setTransferData(prev => ({ 
                ...prev, 
                productId: e.target.value,
                quantity: product ? Math.min(product.locationQuantity, 1).toString() : '1'
              }));
            }}
            placeholder="Select a product"
          />
          
          <Select
            label="Destination Location *"
            options={[
              { value: '', label: 'Select destination location' },
              ...(location ? 
                locations
                  .filter(l => l._id !== location._id && l.isActive)
                  .map(l => ({ value: l._id, label: `${l.name} (${l.code})` })) 
                : [])
            ]}
            value={transferData.toLocationId}
            onChange={(e) => setTransferData(prev => ({ ...prev, toLocationId: e.target.value }))}
            placeholder="Select destination location"
          />
          
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
              />
              <span className="text-sm text-gray-600">
                {transferData.productId && 
                  `/ ${products.find(p => p._id === transferData.productId)?.locationQuantity || 0} available`
                }
              </span>
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
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setShowTransferModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleTransferStock}>
              Transfer Stock
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Location Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Location"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Location Name *"
              value={locationData.name}
              onChange={(e) => setLocationData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter location name"
            />
            
            <Input
              label="Location Code *"
              value={locationData.code}
              onChange={(e) => setLocationData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
              placeholder="Enter location code (e.g., WH-001)"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Location Type *"
              options={[
                { value: 'warehouse', label: 'Warehouse' },
                { value: 'store', label: 'Store' },
                { value: 'outlet', label: 'Outlet' },
                { value: 'factory', label: 'Factory' },
                { value: 'office', label: 'Office' }
              ]}
              value={locationData.type}
              onChange={(e) => setLocationData(prev => ({ ...prev, type: e.target.value }))}
            />
            
            <div className="flex items-center space-x-2 pt-6">
              <input
                type="checkbox"
                id="isActive"
                checked={locationData.isActive}
                onChange={(e) => setLocationData(prev => ({ ...prev, isActive: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                Location is active
              </label>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Capacity (Units)"
              type="number"
              value={locationData.capacity}
              onChange={(e) => setLocationData(prev => ({ ...prev, capacity: e.target.value }))}
              placeholder="Enter storage capacity"
            />
            
            <Input
              label="Current Utilization (Units)"
              type="number"
              value={locationData.currentUtilization}
              onChange={(e) => setLocationData(prev => ({ ...prev, currentUtilization: e.target.value }))}
              placeholder="Enter current utilization"
            />
          </div>
          
          <div>
            <h3 className="text-md font-medium text-gray-900 mb-2">Address Information (Optional)</h3>
            <div className="space-y-4">
              <Input
                label="Street Address"
                value={locationData.address.street}
                onChange={(e) => setLocationData(prev => ({ 
                  ...prev, 
                  address: { ...prev.address, street: e.target.value } 
                }))}
                placeholder="Enter street address"
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="City"
                  value={locationData.address.city}
                  onChange={(e) => setLocationData(prev => ({ 
                    ...prev, 
                    address: { ...prev.address, city: e.target.value } 
                  }))}
                  placeholder="Enter city"
                />
                
                <Input
                  label="State/Province"
                  value={locationData.address.state}
                  onChange={(e) => setLocationData(prev => ({ 
                    ...prev, 
                    address: { ...prev.address, state: e.target.value } 
                  }))}
                  placeholder="Enter state or province"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="ZIP/Postal Code"
                  value={locationData.address.zipCode}
                  onChange={(e) => setLocationData(prev => ({ 
                    ...prev, 
                    address: { ...prev.address, zipCode: e.target.value } 
                  }))}
                  placeholder="Enter ZIP or postal code"
                />
                
                <Input
                  label="Country"
                  value={locationData.address.country}
                  onChange={(e) => setLocationData(prev => ({ 
                    ...prev, 
                    address: { ...prev.address, country: e.target.value } 
                  }))}
                  placeholder="Enter country"
                />
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-md font-medium text-gray-900 mb-2">Contact Person (Optional)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Name"
                value={locationData.contactPerson.name}
                onChange={(e) => setLocationData(prev => ({ 
                  ...prev, 
                  contactPerson: { ...prev.contactPerson, name: e.target.value } 
                }))}
                placeholder="Enter contact name"
              />
              
              <Input
                label="Phone"
                value={locationData.contactPerson.phone}
                onChange={(e) => setLocationData(prev => ({ 
                  ...prev, 
                  contactPerson: { ...prev.contactPerson, phone: e.target.value } 
                }))}
                placeholder="Enter contact phone"
              />
              
              <Input
                label="Email"
                type="email"
                value={locationData.contactPerson.email}
                onChange={(e) => setLocationData(prev => ({ 
                  ...prev, 
                  contactPerson: { ...prev.contactPerson, email: e.target.value } 
                }))}
                placeholder="Enter contact email"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={locationData.notes}
              onChange={(e) => setLocationData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Add notes about this location..."
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateLocation}>
              Update Location
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};