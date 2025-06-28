import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, Edit, Trash2, FileText, Truck, Mail, Phone, 
  MapPin, CreditCard, Calendar, TrendingUp, TrendingDown,
  DollarSign, Package, CheckCircle, XCircle, AlertTriangle,
  Download, Share2, Printer, RefreshCw, Clock, User,
  ShoppingCart, Info, BarChart3, ArrowDown, ArrowUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Badge } from '../../components/UI/Badge';
import { Modal } from '../../components/UI/Modal';
import { Select } from '../../components/UI/Select';
import { Input } from '../../components/UI/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/UI/Table';
import { purchasesAPI } from '../../lib/api';
import { Purchase, PurchaseItem, PurchaseOrderData } from '../../types';
import { formatCurrency, formatDate } from '../../utils';
import toast from 'react-hot-toast';

export const PurchaseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [loading, setLoading] = useState(true);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [statusData, setStatusData] = useState({ status: '' });
  const [paymentData, setPaymentData] = useState({
    paymentStatus: '',
    paymentMethod: ''
  });
  const [receivedItems, setReceivedItems] = useState<{ itemId: string; quantity: number; maxQuantity: number; name: string }[]>([]);
  const [orderData, setOrderData] = useState<PurchaseOrderData | null>(null);

  useEffect(() => {
    if (id) {
      fetchPurchase(id);
    }
  }, [id]);

  const fetchPurchase = async (purchaseId: string) => {
    try {
      setLoading(true);
      const response = await purchasesAPI.getById(purchaseId);
      setPurchase(response.data.data);
      
      // Initialize modal data
      if (response.data.data) {
        setStatusData({ status: response.data.data.status });
        setPaymentData({
          paymentStatus: response.data.data.paymentStatus,
          paymentMethod: response.data.data.paymentMethod || 'cash'
        });
      }
    } catch (error) {
      toast.error('Failed to fetch purchase details');
      navigate('/purchases');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!purchase) return;
    
    if (window.confirm('Are you sure you want to delete this purchase?')) {
      try {
        await purchasesAPI.delete(purchase._id);
        toast.success('Purchase deleted successfully');
        navigate('/purchases');
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Failed to delete purchase');
      }
    }
  };

  const handleStatusUpdate = async () => {
    if (!purchase) return;

    try {
      await purchasesAPI.updateStatus(purchase._id, statusData.status);
      toast.success('Purchase status updated successfully');
      setShowStatusModal(false);
      fetchPurchase(purchase._id);
    } catch (error) {
      toast.error('Failed to update purchase status');
    }
  };

  const handlePaymentUpdate = async () => {
    if (!purchase) return;

    try {
      await purchasesAPI.updatePayment(purchase._id, paymentData);
      toast.success('Payment status updated successfully');
      setShowPaymentModal(false);
      fetchPurchase(purchase._id);
    } catch (error) {
      toast.error('Failed to update payment status');
    }
  };

  const handleReceiveItems = async () => {
    if (!purchase) return;

    try {
      // Filter out items with zero quantity
      const itemsToReceive = receivedItems.filter(item => item.quantity > 0);
      
      if (itemsToReceive.length === 0) {
        toast.error('Please enter a quantity greater than zero for at least one item');
        return;
      }

      await purchasesAPI.receiveItems(purchase._id, {
        receivedItems: itemsToReceive.map(item => ({
          itemId: item.itemId,
          quantity: item.quantity
        }))
      });
      
      toast.success('Items received successfully');
      setShowReceiveModal(false);
      fetchPurchase(purchase._id);
    } catch (error) {
      toast.error('Failed to receive items');
    }
  };

  const handleGeneratePurchaseOrder = async () => {
    if (!purchase) return;

    try {
      const response = await purchasesAPI.generatePurchaseOrder(purchase._id);
      setOrderData(response.data.data);
      setShowOrderModal(true);
    } catch (error) {
      toast.error('Failed to generate purchase order');
    }
  };

  const prepareReceiveModal = () => {
    if (!purchase) return;
    
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
    { value: 'draft', label: 'Draft' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'ordered', label: 'Ordered' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  const paymentStatusOptions = [
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!purchase) {
    return (
      <div className="text-center py-12">
        <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900">Purchase not found</h2>
        <p className="text-gray-600 mt-2">The purchase order you're looking for doesn't exist.</p>
        <Link to="/purchases">
          <Button className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Purchases
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
          <Button variant="outline" onClick={() => navigate('/purchases')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">PO {purchase.purchaseOrderNumber}</h1>
            <p className="text-gray-600">Created on {formatDate(purchase.createdAt)}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" onClick={handleGeneratePurchaseOrder}>
            <Printer className="w-4 h-4 mr-2" />
            Purchase Order
          </Button>
          <Button variant="outline" size="sm">
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
          <Link to={`/purchases/${purchase._id}/edit`}>
            <Button variant="outline" size="sm">
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={() => setShowStatusModal(true)}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Status
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowPaymentModal(true)}>
            <CreditCard className="w-4 h-4 mr-2" />
            Payment
          </Button>
          {(purchase.status === 'approved' || purchase.status === 'ordered' || purchase.status === 'partially_received') && (
            <Button variant="outline" size="sm" onClick={prepareReceiveModal}>
              <ArrowDown className="w-4 h-4 mr-2" />
              Receive
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleDelete}>
            <Trash2 className="w-4 h-4 mr-2 text-red-500" />
            Delete
          </Button>
        </div>
      </div>

      {/* Status and Payment Badges */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center space-x-2 bg-gray-100 px-4 py-2 rounded-lg">
          <span className="text-sm font-medium text-gray-700">Status:</span>
          {getStatusBadge(purchase.status)}
        </div>
        
        <div className="flex items-center space-x-2 bg-gray-100 px-4 py-2 rounded-lg">
          <span className="text-sm font-medium text-gray-700">Payment:</span>
          {getPaymentStatusBadge(purchase.paymentStatus)}
        </div>
        
        {purchase.paymentMethod && (
          <div className="flex items-center space-x-2 bg-gray-100 px-4 py-2 rounded-lg">
            <span className="text-sm font-medium text-gray-700">Method:</span>
            {getPaymentMethodBadge(purchase.paymentMethod)}
          </div>
        )}
        
        <div className="flex items-center space-x-2 bg-gray-100 px-4 py-2 rounded-lg">
          <span className="text-sm font-medium text-gray-700">Date:</span>
          <span className="text-sm">{formatDate(purchase.orderDate)}</span>
        </div>
        
        {purchase.expectedDeliveryDate && (
          <div className="flex items-center space-x-2 bg-gray-100 px-4 py-2 rounded-lg">
            <span className="text-sm font-medium text-gray-700">Expected Delivery:</span>
            <span className="text-sm">{formatDate(purchase.expectedDeliveryDate)}</span>
          </div>
        )}
        
        {purchase.actualDeliveryDate && (
          <div className="flex items-center space-x-2 bg-gray-100 px-4 py-2 rounded-lg">
            <span className="text-sm font-medium text-gray-700">Actual Delivery:</span>
            <span className="text-sm">{formatDate(purchase.actualDeliveryDate)}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Supplier Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Supplier Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Truck className="w-5 h-5 mr-2" />
                Supplier Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Truck className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {typeof purchase.supplier === 'object' ? purchase.supplier.name : 'Unknown Supplier'}
                  </p>
                </div>
              </div>
              
              {typeof purchase.supplier === 'object' && (
                <>
                  <div className="flex items-center space-x-3">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">{purchase.supplier.email}</p>
                      <p className="text-sm text-gray-500">Email</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">{purchase.supplier.phone}</p>
                      <p className="text-sm text-gray-500">Phone</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <User className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">{purchase.supplier.contactPerson.name}</p>
                      <p className="text-sm text-gray-500">Contact Person</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">
                        {purchase.supplier.address.street}, {purchase.supplier.address.city}
                      </p>
                      <p className="text-sm text-gray-500">
                        {purchase.supplier.address.state}, {purchase.supplier.address.zipCode}, {purchase.supplier.address.country}
                      </p>
                    </div>
                  </div>
                </>
              )}
              
              <div className="pt-2 mt-2 border-t">
                <Link to={typeof purchase.supplier === 'object' ? `/suppliers/${purchase.supplier._id}` : '/suppliers'}>
                  <Button variant="outline" size="sm" className="w-full">
                    <Truck className="w-4 h-4 mr-2" />
                    View Supplier Profile
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Payment Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="w-5 h-5 mr-2" />
                Payment Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <div>
                  {getPaymentStatusBadge(purchase.paymentStatus)}
                </div>
              </div>
              
              {purchase.paymentMethod && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Method:</span>
                  <div>
                    {getPaymentMethodBadge(purchase.paymentMethod)}
                  </div>
                </div>
              )}
              
              <div className="flex justify-between">
                <span className="text-gray-600">Terms:</span>
                <div>
                  {getPaymentTermsBadge(purchase.paymentTerms)}
                </div>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">{formatCurrency(purchase.subtotal)}</span>
              </div>
              
              {purchase.totalDiscount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Discount:</span>
                  <span className="font-medium text-red-600">-{formatCurrency(purchase.totalDiscount)}</span>
                </div>
              )}
              
              {purchase.totalTax > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax:</span>
                  <span className="font-medium">{formatCurrency(purchase.totalTax)}</span>
                </div>
              )}
              
              {purchase.shippingCost > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping:</span>
                  <span className="font-medium">{formatCurrency(purchase.shippingCost)}</span>
                </div>
              )}
              
              <div className="flex justify-between pt-2 border-t">
                <span className="text-gray-900 font-semibold">Total:</span>
                <span className="font-bold text-lg">{formatCurrency(purchase.grandTotal)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {purchase.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">{purchase.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Purchase Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Purchase Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="w-5 h-5 mr-2" />
                Purchase Items
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Received</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Tax</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchase.items.map((item: PurchaseItem, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div className="flex items-center">
                          {typeof item.product === 'object' && item.product.images && item.product.images[0] ? (
                            <img
                              src={item.product.images[0].url}
                              alt={item.product.name}
                              className="w-8 h-8 rounded object-cover mr-2"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center mr-2">
                              <Package className="w-4 h-4 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">
                              {typeof item.product === 'object' ? item.product.name : 'Unknown Product'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {typeof item.product === 'object' ? item.product.sku : ''}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {item.quantity} {typeof item.product === 'object' ? item.product.unit : ''}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <span className={`font-medium ${
                            item.receivedQuantity === 0 ? 'text-red-600' :
                            item.receivedQuantity < item.quantity ? 'text-yellow-600' : 'text-green-600'
                          }`}>
                            {item.receivedQuantity} / {item.quantity}
                          </span>
                          {item.receivedQuantity === item.quantity && (
                            <CheckCircle className="w-4 h-4 text-green-500 ml-1" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{formatCurrency(item.unitPrice)}</span>
                      </TableCell>
                      <TableCell>
                        {item.discount > 0 ? (
                          <span className="font-medium text-red-600">{formatCurrency(item.discount)}</span>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.tax > 0 ? (
                          <span className="font-medium">{formatCurrency(item.tax)}</span>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{formatCurrency(item.totalPrice)}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Purchase Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                Purchase Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="relative pl-8 pb-6 border-l-2 border-gray-200">
                  <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-blue-500"></div>
                  <div className="mb-1">
                    <span className="text-sm font-medium text-blue-600">Created</span>
                    <span className="text-sm text-gray-500 ml-2">{formatDate(purchase.createdAt)}</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Purchase order was created by {typeof purchase.createdBy === 'object' 
                      ? `${purchase.createdBy.firstName} ${purchase.createdBy.lastName}`
                      : 'Unknown'
                    }
                  </p>
                </div>
                
                {purchase.status !== 'draft' && purchase.status !== 'cancelled' && (
                  <div className="relative pl-8 pb-6 border-l-2 border-gray-200">
                    <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-yellow-500"></div>
                    <div className="mb-1">
                      <span className="text-sm font-medium text-yellow-600">Pending</span>
                      <span className="text-sm text-gray-500 ml-2">{formatDate(purchase.updatedAt)}</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Purchase order was submitted for approval
                    </p>
                  </div>
                )}
                
                {(purchase.status === 'approved' || purchase.status === 'ordered' || 
                  purchase.status === 'partially_received' || purchase.status === 'received') && (
                  <div className="relative pl-8 pb-6 border-l-2 border-gray-200">
                    <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-blue-500"></div>
                    <div className="mb-1">
                      <span className="text-sm font-medium text-blue-600">Approved</span>
                      <span className="text-sm text-gray-500 ml-2">
                        {purchase.approvedAt ? formatDate(purchase.approvedAt) : formatDate(purchase.updatedAt)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Purchase order was approved by {typeof purchase.approvedBy === 'object' 
                        ? `${purchase.approvedBy.firstName} ${purchase.approvedBy.lastName}`
                        : 'Unknown'
                      }
                    </p>
                  </div>
                )}
                
                {(purchase.status === 'ordered' || purchase.status === 'partially_received' || 
                  purchase.status === 'received') && (
                  <div className="relative pl-8 pb-6 border-l-2 border-gray-200">
                    <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-blue-500"></div>
                    <div className="mb-1">
                      <span className="text-sm font-medium text-blue-600">Ordered</span>
                      <span className="text-sm text-gray-500 ml-2">{formatDate(purchase.updatedAt)}</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Purchase order was sent to the supplier
                    </p>
                  </div>
                )}
                
                {(purchase.status === 'partially_received' || purchase.status === 'received') && (
                  <div className="relative pl-8 pb-6 border-l-2 border-gray-200">
                    <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-yellow-500"></div>
                    <div className="mb-1">
                      <span className="text-sm font-medium text-yellow-600">
                        {purchase.status === 'partially_received' ? 'Partially Received' : 'First Receipt'}
                      </span>
                      <span className="text-sm text-gray-500 ml-2">{formatDate(purchase.updatedAt)}</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Items were received and added to inventory
                    </p>
                  </div>
                )}
                
                {purchase.status === 'received' && (
                  <div className="relative pl-8 pb-6 border-l-2 border-gray-200">
                    <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-green-500"></div>
                    <div className="mb-1">
                      <span className="text-sm font-medium text-green-600">Fully Received</span>
                      <span className="text-sm text-gray-500 ml-2">
                        {purchase.actualDeliveryDate ? formatDate(purchase.actualDeliveryDate) : formatDate(purchase.updatedAt)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      All items have been received
                    </p>
                  </div>
                )}
                
                {purchase.status === 'cancelled' && (
                  <div className="relative pl-8 pb-6 border-l-2 border-gray-200">
                    <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-red-500"></div>
                    <div className="mb-1">
                      <span className="text-sm font-medium text-red-600">Cancelled</span>
                      <span className="text-sm text-gray-500 ml-2">{formatDate(purchase.updatedAt)}</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Purchase order was cancelled
                    </p>
                  </div>
                )}
                
                {purchase.paymentStatus === 'paid' && (
                  <div className="relative pl-8 pb-6 border-l-2 border-gray-200">
                    <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-green-500"></div>
                    <div className="mb-1">
                      <span className="text-sm font-medium text-green-600">Payment Completed</span>
                      <span className="text-sm text-gray-500 ml-2">{formatDate(purchase.updatedAt)}</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Payment was completed via {purchase.paymentMethod || 'unknown method'}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                Actions & Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" className="w-full" onClick={() => setShowStatusModal(true)}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Update Status
                </Button>
                
                <Button variant="outline" className="w-full" onClick={() => setShowPaymentModal(true)}>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Update Payment
                </Button>
                
                <Button variant="outline" className="w-full" onClick={handleGeneratePurchaseOrder}>
                  <Printer className="w-4 h-4 mr-2" />
                  Generate PO
                </Button>
                
                <Link to={`/purchases/${purchase._id}/edit`} className="w-full">
                  <Button variant="outline" className="w-full">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Purchase
                  </Button>
                </Link>
                
                {(purchase.status === 'approved' || purchase.status === 'ordered' || purchase.status === 'partially_received') && (
                  <Button variant="outline" className="w-full" onClick={prepareReceiveModal}>
                    <ArrowDown className="w-4 h-4 mr-2" />
                    Receive Items
                  </Button>
                )}
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900">Purchase Information</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      This purchase order tracks the procurement of items from your supplier.
                      Update the status as it progresses through the purchasing workflow.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

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
            options={statusOptions}
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
            options={paymentStatusOptions}
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
          <div className="bg-blue-50 p-4 rounded-lg mb-4">
            <div className="flex items-start space-x-3">
              <ShoppingCart className="w-5 h-5 text-blue-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900">Purchase Order: {purchase.purchaseOrderNumber}</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Supplier: {typeof purchase.supplier === 'object' ? purchase.supplier.name : 'Unknown Supplier'}
                </p>
              </div>
            </div>
          </div>
          
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

      {/* Purchase Order Modal */}
      <Modal
        isOpen={showOrderModal}
        onClose={() => setShowOrderModal(false)}
        title="Purchase Order"
        size="xl"
      >
        {orderData && (
          <div className="space-y-6">
            {/* PO Header */}
            <div className="flex justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">PURCHASE ORDER</h2>
                <p className="text-gray-600">#{orderData.order.number}</p>
              </div>
              <div className="text-right">
                <h3 className="font-bold text-gray-900">{orderData.company.name}</h3>
                <p className="text-sm text-gray-600">{orderData.company.email}</p>
                <p className="text-sm text-gray-600">{orderData.company.phone}</p>
                <p className="text-sm text-gray-600">{orderData.company.address}</p>
              </div>
            </div>

            {/* PO Details */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Supplier:</h4>
                <p className="font-medium">{orderData.supplier.name}</p>
                <p className="text-sm text-gray-600">{orderData.supplier.email}</p>
                <p className="text-sm text-gray-600">{orderData.supplier.phone}</p>
                <p className="text-sm text-gray-600">{orderData.supplier.address}</p>
                <p className="text-sm text-gray-600">Contact: {orderData.supplier.contactPerson}</p>
              </div>
              <div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">PO Date:</span>
                    <span className="text-sm font-medium">{orderData.order.date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Expected Delivery:</span>
                    <span className="text-sm font-medium">{orderData.order.expectedDeliveryDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Status:</span>
                    <span className="text-sm font-medium">{orderData.order.status.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Payment Terms:</span>
                    <span className="text-sm font-medium">{orderData.order.paymentTerms.replace('_', ' ').toUpperCase()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* PO Items */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Order Items:</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Tax</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderData.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <p className="font-medium">{item.product}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{item.sku}</p>
                      </TableCell>
                      <TableCell>
                        {item.quantity} {item.unit}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(item.unitPrice)}
                      </TableCell>
                      <TableCell>
                        {item.discount > 0 ? formatCurrency(item.discount) : '-'}
                      </TableCell>
                      <TableCell>
                        {item.tax > 0 ? formatCurrency(item.tax) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* PO Totals */}
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">{formatCurrency(orderData.totals.subtotal)}</span>
                </div>
                {orderData.totals.discount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Discount:</span>
                    <span className="font-medium text-red-600">-{formatCurrency(orderData.totals.discount)}</span>
                  </div>
                )}
                {orderData.totals.tax > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax:</span>
                    <span className="font-medium">{formatCurrency(orderData.totals.tax)}</span>
                  </div>
                )}
                {orderData.totals.shipping > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shipping:</span>
                    <span className="font-medium">{formatCurrency(orderData.totals.shipping)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-semibold">Total:</span>
                  <span className="font-bold">{formatCurrency(orderData.totals.grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {orderData.notes && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Notes:</h4>
                <p className="text-sm text-gray-600 p-3 bg-gray-50 rounded-lg">{orderData.notes}</p>
              </div>
            )}

            {/* Footer */}
            <div className="text-center text-sm text-gray-500 pt-4 border-t">
              <p>Thank you for your business!</p>
              <p>Created by {orderData.createdBy} on {new Date().toLocaleDateString()}</p>
              {orderData.approvedBy && (
                <p>Approved by {orderData.approvedBy}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setShowOrderModal(false)}>
                Close
              </Button>
              <Button>
                <Printer className="w-4 h-4 mr-2" />
                Print PO
              </Button>
              <Button>
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};