import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, Edit, Trash2, FileText, User, Mail, Phone, 
  MapPin, CreditCard, Calendar, TrendingUp, TrendingDown,
  DollarSign, Package, CheckCircle, XCircle, AlertTriangle,
  Download, Share2, Printer, RefreshCw, Clock, Truck,
  ShoppingBag, Info, BarChart3, ArrowDown, ArrowUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Badge } from '../../components/UI/Badge';
import { Modal } from '../../components/UI/Modal';
import { Select } from '../../components/UI/Select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/UI/Table';
import { salesAPI } from '../../lib/api';
import { Sale, SaleItem, InvoiceData } from '../../types';
import { formatCurrency, formatDate } from '../../utils';
import toast from 'react-hot-toast';

export const SaleDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [statusData, setStatusData] = useState({ status: '' });
  const [paymentData, setPaymentData] = useState({
    paymentStatus: '',
    paymentMethod: ''
  });
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);

  useEffect(() => {
    if (id) {
      fetchSale(id);
    }
  }, [id]);

  const fetchSale = async (saleId: string) => {
    try {
      setLoading(true);
      const response = await salesAPI.getById(saleId);
      setSale(response.data.data);
      
      // Initialize modal data
      if (response.data.data) {
        setStatusData({ status: response.data.data.status });
        setPaymentData({
          paymentStatus: response.data.data.paymentStatus,
          paymentMethod: response.data.data.paymentMethod || 'cash'
        });
      }
    } catch (error) {
      toast.error('Failed to fetch sale details');
      navigate('/sales');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!sale) return;
    
    if (window.confirm('Are you sure you want to delete this sale?')) {
      try {
        await salesAPI.delete(sale._id);
        toast.success('Sale deleted successfully');
        navigate('/sales');
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Failed to delete sale');
      }
    }
  };

  const handleStatusUpdate = async () => {
    if (!sale) return;

    try {
      await salesAPI.updateStatus(sale._id, statusData.status);
      toast.success('Sale status updated successfully');
      setShowStatusModal(false);
      fetchSale(sale._id);
    } catch (error) {
      toast.error('Failed to update sale status');
    }
  };

  const handlePaymentUpdate = async () => {
    if (!sale) return;

    try {
      await salesAPI.updatePayment(sale._id, paymentData);
      toast.success('Payment status updated successfully');
      setShowPaymentModal(false);
      fetchSale(sale._id);
    } catch (error) {
      toast.error('Failed to update payment status');
    }
  };

  const handleGenerateInvoice = async () => {
    if (!sale) return;

    try {
      const response = await salesAPI.generateInvoice(sale._id);
      setInvoiceData(response.data.data);
      setShowInvoiceModal(true);
    } catch (error) {
      toast.error('Failed to generate invoice');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="default" className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Draft
        </Badge>;
      case 'confirmed':
        return <Badge variant="info" className="flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          Confirmed
        </Badge>;
      case 'shipped':
        return <Badge variant="warning" className="flex items-center gap-1">
          <Truck className="w-3 h-3" />
          Shipped
        </Badge>;
      case 'delivered':
        return <Badge variant="success" className="flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          Delivered
        </Badge>;
      case 'cancelled':
        return <Badge variant="danger" className="flex items-center gap-1">
          <XCircle className="w-3 h-3" />
          Cancelled
        </Badge>;
      case 'returned':
        return <Badge variant="danger" className="flex items-center gap-1">
          <ArrowDown className="w-3 h-3" />
          Returned
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
      case 'overdue':
        return <Badge variant="danger" className="flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Overdue
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
    { value: 'draft', label: 'Draft' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'returned', label: 'Returned' }
  ];

  const paymentStatusOptions = [
    { value: 'paid', label: 'Paid' },
    { value: 'partially_paid', label: 'Partially Paid' },
    { value: 'unpaid', label: 'Unpaid' },
    { value: 'overdue', label: 'Overdue' }
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

  if (!sale) {
    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900">Sale not found</h2>
        <p className="text-gray-600 mt-2">The sale you're looking for doesn't exist.</p>
        <Link to="/sales">
          <Button className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Sales
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
          <Button variant="outline" onClick={() => navigate('/sales')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Invoice {sale.invoiceNumber}</h1>
            <p className="text-gray-600">Created on {formatDate(sale.createdAt)}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" onClick={handleGenerateInvoice}>
            <Printer className="w-4 h-4 mr-2" />
            Invoice
          </Button>
          <Button variant="outline" size="sm">
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
          <Link to={`/sales/${sale._id}/edit`}>
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
          {getStatusBadge(sale.status)}
        </div>
        
        <div className="flex items-center space-x-2 bg-gray-100 px-4 py-2 rounded-lg">
          <span className="text-sm font-medium text-gray-700">Payment:</span>
          {getPaymentStatusBadge(sale.paymentStatus)}
        </div>
        
        {sale.paymentMethod && (
          <div className="flex items-center space-x-2 bg-gray-100 px-4 py-2 rounded-lg">
            <span className="text-sm font-medium text-gray-700">Method:</span>
            {getPaymentMethodBadge(sale.paymentMethod)}
          </div>
        )}
        
        <div className="flex items-center space-x-2 bg-gray-100 px-4 py-2 rounded-lg">
          <span className="text-sm font-medium text-gray-700">Date:</span>
          <span className="text-sm">{formatDate(sale.saleDate)}</span>
        </div>
        
        {sale.dueDate && (
          <div className="flex items-center space-x-2 bg-gray-100 px-4 py-2 rounded-lg">
            <span className="text-sm font-medium text-gray-700">Due Date:</span>
            <span className="text-sm">{formatDate(sale.dueDate)}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Customer Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="w-5 h-5 mr-2" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  {typeof sale.customer === 'object' && sale.customer.type === 'business' ? (
                    <ShoppingBag className="w-5 h-5 text-blue-600" />
                  ) : (
                    <User className="w-5 h-5 text-blue-600" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {typeof sale.customer === 'object' ? sale.customer.name : 'Unknown Customer'}
                  </p>
                  {typeof sale.customer === 'object' && sale.customer.businessName && (
                    <p className="text-sm text-gray-600">{sale.customer.businessName}</p>
                  )}
                </div>
              </div>
              
              {typeof sale.customer === 'object' && (
                <>
                  <div className="flex items-center space-x-3">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">{sale.customer.email}</p>
                      <p className="text-sm text-gray-500">Email</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">{sale.customer.phone}</p>
                      <p className="text-sm text-gray-500">Phone</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">
                        {sale.customer.address.street}, {sale.customer.address.city}
                      </p>
                      <p className="text-sm text-gray-500">
                        {sale.customer.address.state}, {sale.customer.address.zipCode}, {sale.customer.address.country}
                      </p>
                    </div>
                  </div>
                </>
              )}
              
              <div className="pt-2 mt-2 border-t">
                <Link to={typeof sale.customer === 'object' ? `/customers/${sale.customer._id}` : '/customers'}>
                  <Button variant="outline" size="sm" className="w-full">
                    <User className="w-4 h-4 mr-2" />
                    View Customer Profile
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Sales Person */}
          {sale.salesPerson && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Sales Person
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {typeof sale.salesPerson === 'object' 
                        ? `${sale.salesPerson.firstName} ${sale.salesPerson.lastName}`
                        : 'Unknown'
                      }
                    </p>
                    <p className="text-sm text-gray-600">
                      {typeof sale.salesPerson === 'object' ? sale.salesPerson.email : ''}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

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
                  {getPaymentStatusBadge(sale.paymentStatus)}
                </div>
              </div>
              
              {sale.paymentMethod && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Method:</span>
                  <div>
                    {getPaymentMethodBadge(sale.paymentMethod)}
                  </div>
                </div>
              )}
              
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">{formatCurrency(sale.subtotal)}</span>
              </div>
              
              {sale.totalDiscount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Discount:</span>
                  <span className="font-medium text-red-600">-{formatCurrency(sale.totalDiscount)}</span>
                </div>
              )}
              
              {sale.totalTax > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax:</span>
                  <span className="font-medium">{formatCurrency(sale.totalTax)}</span>
                </div>
              )}
              
              {sale.shippingCost > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping:</span>
                  <span className="font-medium">{formatCurrency(sale.shippingCost)}</span>
                </div>
              )}
              
              <div className="flex justify-between pt-2 border-t">
                <span className="text-gray-900 font-semibold">Total:</span>
                <span className="font-bold text-lg">{formatCurrency(sale.grandTotal)}</span>
              </div>
              
              {sale.totalProfit !== undefined && (
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-gray-600">Profit:</span>
                  <div className="flex items-center">
                    <span className="font-medium text-green-600">{formatCurrency(sale.totalProfit)}</span>
                    <span className="text-sm text-gray-500 ml-2">({sale.profitMargin}%)</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {sale.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">{sale.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Sale Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sale Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="w-5 h-5 mr-2" />
                Sale Items
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Tax</TableHead>
                    <TableHead>Total</TableHead>
                    {sale.totalProfit !== undefined && <TableHead>Profit</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sale.items.map((item: SaleItem, index) => (
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
                      {sale.totalProfit !== undefined && (
                        <TableCell>
                          {item.profit !== undefined && (
                            <div className="flex items-center">
                              <span className="font-medium text-green-600">{formatCurrency(item.profit)}</span>
                              {item.profitMargin && (
                                <span className="text-xs text-gray-500 ml-1">({item.profitMargin}%)</span>
                              )}
                            </div>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Sale Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                Sale Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="relative pl-8 pb-6 border-l-2 border-gray-200">
                  <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-blue-500"></div>
                  <div className="mb-1">
                    <span className="text-sm font-medium text-blue-600">Created</span>
                    <span className="text-sm text-gray-500 ml-2">{formatDate(sale.createdAt)}</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Sale was created by {typeof sale.createdBy === 'object' 
                      ? `${sale.createdBy.firstName} ${sale.createdBy.lastName}`
                      : 'Unknown'
                    }
                  </p>
                </div>
                
                {sale.status !== 'draft' && (
                  <div className="relative pl-8 pb-6 border-l-2 border-gray-200">
                    <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-green-500"></div>
                    <div className="mb-1">
                      <span className="text-sm font-medium text-green-600">Confirmed</span>
                      <span className="text-sm text-gray-500 ml-2">{formatDate(sale.updatedAt)}</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Sale was confirmed and stock was updated
                    </p>
                  </div>
                )}
                
                {sale.status === 'shipped' && (
                  <div className="relative pl-8 pb-6 border-l-2 border-gray-200">
                    <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-yellow-500"></div>
                    <div className="mb-1">
                      <span className="text-sm font-medium text-yellow-600">Shipped</span>
                      <span className="text-sm text-gray-500 ml-2">{formatDate(sale.updatedAt)}</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Order was shipped to the customer
                    </p>
                  </div>
                )}
                
                {sale.status === 'delivered' && (
                  <div className="relative pl-8 pb-6 border-l-2 border-gray-200">
                    <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-green-500"></div>
                    <div className="mb-1">
                      <span className="text-sm font-medium text-green-600">Delivered</span>
                      <span className="text-sm text-gray-500 ml-2">{formatDate(sale.updatedAt)}</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Order was delivered to the customer
                    </p>
                  </div>
                )}
                
                {sale.status === 'cancelled' && (
                  <div className="relative pl-8 pb-6 border-l-2 border-gray-200">
                    <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-red-500"></div>
                    <div className="mb-1">
                      <span className="text-sm font-medium text-red-600">Cancelled</span>
                      <span className="text-sm text-gray-500 ml-2">{formatDate(sale.updatedAt)}</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Order was cancelled and stock was returned
                    </p>
                  </div>
                )}
                
                {sale.status === 'returned' && (
                  <div className="relative pl-8 pb-6 border-l-2 border-gray-200">
                    <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-red-500"></div>
                    <div className="mb-1">
                      <span className="text-sm font-medium text-red-600">Returned</span>
                      <span className="text-sm text-gray-500 ml-2">{formatDate(sale.updatedAt)}</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Products were returned by the customer
                    </p>
                  </div>
                )}
                
                {sale.paymentStatus === 'paid' && (
                  <div className="relative pl-8 pb-6 border-l-2 border-gray-200">
                    <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-green-500"></div>
                    <div className="mb-1">
                      <span className="text-sm font-medium text-green-600">Payment Received</span>
                      <span className="text-sm text-gray-500 ml-2">{formatDate(sale.updatedAt)}</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Payment was received via {sale.paymentMethod || 'unknown method'}
                    </p>
                  </div>
                )}
                
                {sale.paymentStatus === 'overdue' && (
                  <div className="relative pl-8 pb-6 border-l-2 border-gray-200">
                    <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-red-500"></div>
                    <div className="mb-1">
                      <span className="text-sm font-medium text-red-600">Payment Overdue</span>
                      <span className="text-sm text-gray-500 ml-2">{formatDate(sale.updatedAt)}</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Payment is overdue. Due date was {sale.dueDate ? formatDate(sale.dueDate) : 'not set'}
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
                Actions & Analytics
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
                
                <Button variant="outline" className="w-full" onClick={handleGenerateInvoice}>
                  <Printer className="w-4 h-4 mr-2" />
                  Generate Invoice
                </Button>
                
                <Link to={`/sales/${sale._id}/edit`} className="w-full">
                  <Button variant="outline" className="w-full">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Sale
                  </Button>
                </Link>
              </div>
              
              {sale.totalProfit !== undefined && (
                <div className="mt-6 p-4 bg-green-50 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <TrendingUp className="w-5 h-5 text-green-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-green-900">Profit Analysis</h4>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div>
                          <p className="text-sm text-green-700">Total Profit:</p>
                          <p className="text-lg font-bold text-green-600">{formatCurrency(sale.totalProfit)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-green-700">Profit Margin:</p>
                          <p className="text-lg font-bold text-green-600">{sale.profitMargin}%</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Status Update Modal */}
      <Modal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        title="Update Sale Status"
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
                  <li><strong>Cancelled/Returned:</strong> Stock will be returned to inventory</li>
                  <li><strong>Shipped/Delivered:</strong> Order will be marked as completed</li>
                  <li><strong>Draft/Confirmed:</strong> Order can still be modified</li>
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
                  Changing payment status to "Paid" will update customer balance and financial records.
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

      {/* Invoice Modal */}
      <Modal
        isOpen={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        title="Invoice"
        size="xl"
      >
        {invoiceData && (
          <div className="space-y-6">
            {/* Invoice Header */}
            <div className="flex justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">INVOICE</h2>
                <p className="text-gray-600">#{invoiceData.invoice.number}</p>
              </div>
              <div className="text-right">
                <h3 className="font-bold text-gray-900">{invoiceData.company.name}</h3>
                <p className="text-sm text-gray-600">{invoiceData.company.email}</p>
                <p className="text-sm text-gray-600">{invoiceData.company.phone}</p>
                <p className="text-sm text-gray-600">{invoiceData.company.address}</p>
              </div>
            </div>

            {/* Invoice Details */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Bill To:</h4>
                <p className="font-medium">{invoiceData.customer.name}</p>
                <p className="text-sm text-gray-600">{invoiceData.customer.email}</p>
                <p className="text-sm text-gray-600">{invoiceData.customer.phone}</p>
                <p className="text-sm text-gray-600">{invoiceData.customer.address}</p>
              </div>
              <div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Invoice Date:</span>
                    <span className="text-sm font-medium">{invoiceData.invoice.date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Due Date:</span>
                    <span className="text-sm font-medium">{invoiceData.invoice.dueDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Status:</span>
                    <span className="text-sm font-medium">{invoiceData.invoice.status.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Payment Status:</span>
                    <span className="text-sm font-medium">{invoiceData.invoice.paymentStatus.replace('_', ' ').toUpperCase()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Invoice Items */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Invoice Items:</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Tax</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoiceData.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.product}</p>
                          <p className="text-xs text-gray-500">{item.sku}</p>
                        </div>
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

            {/* Invoice Totals */}
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">{formatCurrency(invoiceData.totals.subtotal)}</span>
                </div>
                {invoiceData.totals.discount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Discount:</span>
                    <span className="font-medium text-red-600">-{formatCurrency(invoiceData.totals.discount)}</span>
                  </div>
                )}
                {invoiceData.totals.tax > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax:</span>
                    <span className="font-medium">{formatCurrency(invoiceData.totals.tax)}</span>
                  </div>
                )}
                {invoiceData.totals.shipping > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shipping:</span>
                    <span className="font-medium">{formatCurrency(invoiceData.totals.shipping)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-semibold">Total:</span>
                  <span className="font-bold">{formatCurrency(invoiceData.totals.grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {invoiceData.notes && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Notes:</h4>
                <p className="text-sm text-gray-600 p-3 bg-gray-50 rounded-lg">{invoiceData.notes}</p>
              </div>
            )}

            {/* Footer */}
            <div className="text-center text-sm text-gray-500 pt-4 border-t">
              <p>Thank you for your business!</p>
              <p>Generated by {invoiceData.createdBy} on {new Date().toLocaleDateString()}</p>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setShowInvoiceModal(false)}>
                Close
              </Button>
              <Button>
                <Printer className="w-4 h-4 mr-2" />
                Print Invoice
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