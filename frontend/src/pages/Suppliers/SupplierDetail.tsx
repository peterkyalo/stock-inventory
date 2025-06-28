import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, Edit, Trash2, Building, User, Mail, Phone, 
  MapPin, CreditCard, Star, Calendar, TrendingUp, TrendingDown,
  DollarSign, Package, FileText, Award, AlertTriangle,
  CheckCircle, XCircle, Download, Share2, MoreVertical,
  Truck, BarChart3, Clock, Target
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Badge } from '../../components/UI/Badge';
import { Modal } from '../../components/UI/Modal';
import { Input } from '../../components/UI/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/UI/Table';
import { suppliersAPI } from '../../lib/api';
import { Supplier } from '../../types';
import { formatCurrency, formatDate } from '../../utils';
import toast from 'react-hot-toast';

export const SupplierDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [newRating, setNewRating] = useState(5);

  useEffect(() => {
    if (id) {
      fetchSupplier(id);
      fetchSupplierStats(id);
    }
  }, [id]);

  const fetchSupplier = async (supplierId: string) => {
    try {
      setLoading(true);
      const response = await suppliersAPI.getById(supplierId);
      setSupplier(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch supplier details');
      navigate('/suppliers');
    } finally {
      setLoading(false);
    }
  };

  const fetchSupplierStats = async (supplierId: string) => {
    try {
      const response = await suppliersAPI.getStats(supplierId);
      setStats(response.data.data);
    } catch (error) {
      console.error('Failed to fetch supplier stats');
    }
  };

  const handleDelete = async () => {
    if (!supplier) return;
    
    if (window.confirm('Are you sure you want to delete this supplier?')) {
      try {
        await suppliersAPI.delete(supplier._id);
        toast.success('Supplier deleted successfully');
        navigate('/suppliers');
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Failed to delete supplier');
      }
    }
  };

  const handleStatusToggle = async () => {
    if (!supplier) return;

    try {
      await suppliersAPI.updateStatus(supplier._id, !supplier.isActive);
      toast.success(`Supplier ${!supplier.isActive ? 'activated' : 'deactivated'} successfully`);
      fetchSupplier(supplier._id);
    } catch (error) {
      toast.error('Failed to update supplier status');
    }
  };

  const handleRatingUpdate = async () => {
    if (!supplier) return;

    try {
      await suppliersAPI.updateRating(supplier._id, newRating);
      toast.success('Supplier rating updated successfully');
      setShowRatingModal(false);
      fetchSupplier(supplier._id);
      fetchSupplierStats(supplier._id);
    } catch (error) {
      toast.error('Failed to update supplier rating');
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

  const getCreditUtilizationColor = (utilization: number) => {
    if (utilization >= 90) return 'text-red-600';
    if (utilization >= 70) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="text-center py-12">
        <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900">Supplier not found</h2>
        <p className="text-gray-600 mt-2">The supplier you're looking for doesn't exist.</p>
        <Link to="/suppliers">
          <Button className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Suppliers
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
          <Button variant="outline" onClick={() => navigate('/suppliers')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{supplier.name}</h1>
            <p className="text-gray-600">{supplier.email}</p>
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
          <Link to={`/suppliers/${supplier._id}/edit`}>
            <Button variant="outline" size="sm">
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={handleStatusToggle}>
            {supplier.isActive ? (
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
        {/* Left Column - Supplier Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Supplier Overview */}
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Building className="w-10 h-10 text-blue-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">{supplier.name}</h2>
                <p className="text-gray-600 mt-1">{supplier.email}</p>
                
                <div className="flex items-center justify-center space-x-2 mt-3">
                  {getStatusBadge(supplier.isActive)}
                  {getPaymentTermsBadge(supplier.paymentTerms)}
                </div>

                {supplier.rating && (
                  <div className="flex items-center justify-center space-x-2 mt-3">
                    <div className="flex items-center">
                      {getRatingStars(supplier.rating)}
                    </div>
                    <span className="text-sm text-gray-600">({supplier.rating}/5)</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setNewRating(supplier.rating || 5);
                        setShowRatingModal(true);
                      }}
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          {stats && (
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
                    <p className="text-2xl font-bold text-blue-600">{stats.totalOrders}</p>
                    <p className="text-sm text-gray-600">Total Orders</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(stats.totalPurchaseAmount)}
                    </p>
                    <p className="text-sm text-gray-600">Total Value</p>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <p className="text-2xl font-bold text-purple-600">
                      {formatCurrency(stats.averageOrderValue)}
                    </p>
                    <p className="text-sm text-gray-600">Avg Order</p>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <p className="text-2xl font-bold text-yellow-600">
                      {stats.daysSinceLastOrder || 'N/A'}
                    </p>
                    <p className="text-sm text-gray-600">Days Since Last</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="w-5 h-5 mr-2" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-3">
                <User className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900">{supplier.contactPerson.name}</p>
                  <p className="text-sm text-gray-500">Contact Person</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Mail className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900">{supplier.email}</p>
                  <p className="text-sm text-gray-500">Primary Email</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Phone className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900">{supplier.phone}</p>
                  <p className="text-sm text-gray-500">Primary Phone</p>
                </div>
              </div>

              {supplier.contactPerson.email && (
                <div className="flex items-center space-x-3">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">{supplier.contactPerson.email}</p>
                    <p className="text-sm text-gray-500">Contact Email</p>
                  </div>
                </div>
              )}

              {supplier.contactPerson.phone && (
                <div className="flex items-center space-x-3">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">{supplier.contactPerson.phone}</p>
                    <p className="text-sm text-gray-500">Contact Phone</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Address */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="w-5 h-5 mr-2" />
                Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <p className="font-medium text-gray-900">{supplier.address.street}</p>
                <p className="text-gray-600">
                  {supplier.address.city}, {supplier.address.state} {supplier.address.zipCode}
                </p>
                <p className="text-gray-600">{supplier.address.country}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Detailed Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Financial Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="w-5 h-5 mr-2" />
                Financial Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Payment Terms</p>
                    <div className="mt-1">
                      {getPaymentTermsBadge(supplier.paymentTerms)}
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-600">Credit Limit</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {formatCurrency(supplier.creditLimit)}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-600">Current Balance</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {formatCurrency(supplier.currentBalance)}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {stats && (
                    <>
                      <div>
                        <p className="text-sm text-gray-600">Credit Utilization</p>
                        <div className="mt-1">
                          <div className="flex items-center space-x-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  stats.creditUtilization >= 90 ? 'bg-red-500' :
                                  stats.creditUtilization >= 70 ? 'bg-yellow-500' : 'bg-green-500'
                                }`}
                                style={{ width: `${Math.min(stats.creditUtilization, 100)}%` }}
                              ></div>
                            </div>
                            <span className={`text-sm font-medium ${getCreditUtilizationColor(stats.creditUtilization)}`}>
                              {stats.creditUtilization}%
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm text-gray-600">Available Credit</p>
                        <p className="text-lg font-semibold text-green-600">
                          {formatCurrency(supplier.creditLimit - supplier.currentBalance)}
                        </p>
                      </div>
                    </>
                  )}

                  {supplier.taxNumber && (
                    <div>
                      <p className="text-sm text-gray-600">Tax Number</p>
                      <p className="text-lg font-semibold text-gray-900">{supplier.taxNumber}</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bank Details */}
          {supplier.bankDetails && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="w-5 h-5 mr-2" />
                  Bank Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {supplier.bankDetails.bankName && (
                    <div>
                      <p className="text-sm text-gray-600">Bank Name</p>
                      <p className="font-medium text-gray-900">{supplier.bankDetails.bankName}</p>
                    </div>
                  )}
                  
                  {supplier.bankDetails.accountNumber && (
                    <div>
                      <p className="text-sm text-gray-600">Account Number</p>
                      <p className="font-medium text-gray-900">{supplier.bankDetails.accountNumber}</p>
                    </div>
                  )}
                  
                  {supplier.bankDetails.routingNumber && (
                    <div>
                      <p className="text-sm text-gray-600">Routing Number</p>
                      <p className="font-medium text-gray-900">{supplier.bankDetails.routingNumber}</p>
                    </div>
                  )}
                  
                  {supplier.bankDetails.swift && (
                    <div>
                      <p className="text-sm text-gray-600">SWIFT Code</p>
                      <p className="font-medium text-gray-900">{supplier.bankDetails.swift}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Performance Metrics */}
          {stats && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-center mb-2">
                      <Package className="w-6 h-6 text-blue-600" />
                    </div>
                    <p className="text-2xl font-bold text-blue-600">{stats.completedOrders}</p>
                    <p className="text-sm text-gray-600">Completed Orders</p>
                  </div>
                  
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <div className="flex items-center justify-center mb-2">
                      <Clock className="w-6 h-6 text-yellow-600" />
                    </div>
                    <p className="text-2xl font-bold text-yellow-600">{stats.pendingOrders}</p>
                    <p className="text-sm text-gray-600">Pending Orders</p>
                  </div>
                  
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="flex items-center justify-center mb-2">
                      <XCircle className="w-6 h-6 text-red-600" />
                    </div>
                    <p className="text-2xl font-bold text-red-600">{stats.cancelledOrders}</p>
                    <p className="text-sm text-gray-600">Cancelled Orders</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Orders */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Recent Orders
                </CardTitle>
                <Link to={`/purchases?supplier=${supplier._id}`}>
                  <Button variant="outline" size="sm">
                    View All Orders
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No recent orders found</p>
                <p className="text-sm">Orders will appear here once created</p>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {supplier.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">{supplier.notes}</p>
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
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Created Date</p>
                    <p className="font-medium text-gray-900">{formatDate(supplier.createdAt)}</p>
                  </div>
                  
                  {supplier.lastOrderDate && (
                    <div>
                      <p className="text-sm text-gray-600">Last Order Date</p>
                      <p className="font-medium text-gray-900">{formatDate(supplier.lastOrderDate)}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Total Orders</p>
                    <p className="font-medium text-gray-900">{supplier.totalOrders}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-600">Total Purchase Amount</p>
                    <p className="font-medium text-gray-900">{formatCurrency(supplier.totalPurchaseAmount)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Rating Update Modal */}
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
                  onClick={() => setNewRating(i + 1)}
                  className="focus:outline-none"
                >
                  <Star
                    className={`w-8 h-8 ${
                      i < newRating 
                        ? 'text-yellow-400 fill-current' 
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 text-sm text-gray-600">
                {newRating} star{newRating !== 1 ? 's' : ''}
              </span>
            </div>
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