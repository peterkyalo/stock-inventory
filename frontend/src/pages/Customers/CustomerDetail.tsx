import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, Edit, Trash2, Building, User, Mail, Phone, 
  MapPin, CreditCard, Crown, Calendar, TrendingUp, TrendingDown,
  DollarSign, Package, FileText, Award, AlertTriangle,
  CheckCircle, XCircle, Download, Share2, MoreVertical,
  Users, BarChart3, Clock, Target, ShoppingCart, Percent
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Badge } from '../../components/UI/Badge';
import { Modal } from '../../components/UI/Modal';
import { Input } from '../../components/UI/Input';
import { Select } from '../../components/UI/Select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/UI/Table';
import { customersAPI } from '../../lib/api';
import { Customer } from '../../types';
import { formatCurrency, formatDate } from '../../utils';
import toast from 'react-hot-toast';

export const CustomerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [newGroup, setNewGroup] = useState('regular');

  useEffect(() => {
    if (id) {
      fetchCustomer(id);
      fetchCustomerStats(id);
    }
  }, [id]);

  const fetchCustomer = async (customerId: string) => {
    try {
      setLoading(true);
      const response = await customersAPI.getById(customerId);
      setCustomer(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch customer details');
      navigate('/customers');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerStats = async (customerId: string) => {
    try {
      const response = await customersAPI.getStats(customerId);
      setStats(response.data.data);
    } catch (error) {
      console.error('Failed to fetch customer stats');
    }
  };

  const handleDelete = async () => {
    if (!customer) return;
    
    if (window.confirm('Are you sure you want to delete this customer?')) {
      try {
        await customersAPI.delete(customer._id);
        toast.success('Customer deleted successfully');
        navigate('/customers');
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Failed to delete customer');
      }
    }
  };

  const handleStatusToggle = async () => {
    if (!customer) return;

    try {
      await customersAPI.updateStatus(customer._id, !customer.isActive);
      toast.success(`Customer ${!customer.isActive ? 'activated' : 'deactivated'} successfully`);
      fetchCustomer(customer._id);
    } catch (error) {
      toast.error('Failed to update customer status');
    }
  };

  const handleGroupUpdate = async () => {
    if (!customer) return;

    try {
      await customersAPI.updateGroup(customer._id, newGroup);
      toast.success('Customer group updated successfully');
      setShowGroupModal(false);
      fetchCustomer(customer._id);
      fetchCustomerStats(customer._id);
    } catch (error) {
      toast.error('Failed to update customer group');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900">Customer not found</h2>
        <p className="text-gray-600 mt-2">The customer you're looking for doesn't exist.</p>
        <Link to="/customers">
          <Button className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Customers
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
          <Button variant="outline" onClick={() => navigate('/customers')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
            <p className="text-gray-600">{customer.email}</p>
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
          <Link to={`/customers/${customer._id}/edit`}>
            <Button variant="outline" size="sm">
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={handleStatusToggle}>
            {customer.isActive ? (
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
        {/* Left Column - Customer Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Customer Overview */}
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  {customer.type === 'business' ? (
                    <Building className="w-10 h-10 text-blue-600" />
                  ) : (
                    <User className="w-10 h-10 text-blue-600" />
                  )}
                </div>
                <h2 className="text-xl font-bold text-gray-900">{customer.name}</h2>
                {customer.businessName && (
                  <p className="text-gray-600 mt-1">{customer.businessName}</p>
                )}
                <p className="text-gray-600 mt-1">{customer.email}</p>
                
                <div className="flex items-center justify-center space-x-2 mt-3">
                  {getStatusBadge(customer.isActive)}
                  <Badge variant="info">{customer.type}</Badge>
                </div>

                <div className="flex items-center justify-center space-x-2 mt-3">
                  {getCustomerGroupBadge(customer.customerGroup)}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setNewGroup(customer.customerGroup);
                      setShowGroupModal(true);
                    }}
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                </div>
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
                      {formatCurrency(stats.totalSalesAmount)}
                    </p>
                    <p className="text-sm text-gray-600">Total Sales</p>
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
                <Mail className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900">{customer.email}</p>
                  <p className="text-sm text-gray-500">Email</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Phone className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900">{customer.phone}</p>
                  <p className="text-sm text-gray-500">Phone</p>
                </div>
              </div>

              {customer.taxNumber && (
                <div className="flex items-center space-x-3">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">{customer.taxNumber}</p>
                    <p className="text-sm text-gray-500">Tax Number</p>
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
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Primary Address</h4>
                  <div className="space-y-1">
                    <p className="text-gray-900">{customer.address.street}</p>
                    <p className="text-gray-600">
                      {customer.address.city}, {customer.address.state} {customer.address.zipCode}
                    </p>
                    <p className="text-gray-600">{customer.address.country}</p>
                  </div>
                </div>

                {customer.billingAddress && !customer.billingAddress.sameAsAddress && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Billing Address</h4>
                    <div className="space-y-1">
                      <p className="text-gray-900">{customer.billingAddress.street}</p>
                      <p className="text-gray-600">
                        {customer.billingAddress.city}, {customer.billingAddress.state} {customer.billingAddress.zipCode}
                      </p>
                      <p className="text-gray-600">{customer.billingAddress.country}</p>
                    </div>
                  </div>
                )}
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
                      {getPaymentTermsBadge(customer.paymentTerms)}
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-600">Credit Limit</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {formatCurrency(customer.creditLimit)}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-600">Current Balance</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {formatCurrency(customer.currentBalance)}
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
                          {formatCurrency(stats.availableCredit)}
                        </p>
                      </div>
                    </>
                  )}

                  <div>
                    <p className="text-sm text-gray-600">Discount Percentage</p>
                    <div className="flex items-center space-x-2">
                      <p className="text-lg font-semibold text-gray-900">
                        {customer.discountPercentage}%
                      </p>
                      <Percent className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

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
                      <ShoppingCart className="w-6 h-6 text-blue-600" />
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
                <Link to={`/sales?customer=${customer._id}`}>
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
                <Link to={`/sales/new?customer=${customer._id}`}>
                  <Button className="mt-4">
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Order
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Customer Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="w-5 h-5 mr-2" />
                Customer Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Customer Since</span>
                    <span className="font-medium">{formatDate(customer.createdAt)}</span>
                  </div>
                  
                  {customer.lastOrderDate && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Last Order Date</span>
                      <span className="font-medium">{formatDate(customer.lastOrderDate)}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Customer Type</span>
                    <span className="font-medium capitalize">{customer.type}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Customer Group</span>
                    <div className="flex items-center space-x-2">
                      {getCustomerGroupBadge(customer.customerGroup)}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Total Orders</span>
                    <span className="font-medium">{customer.totalOrders}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Total Sales Amount</span>
                    <span className="font-medium">{formatCurrency(customer.totalSalesAmount)}</span>
                  </div>
                  
                  {stats && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Average Order Value</span>
                      <span className="font-medium">{formatCurrency(stats.averageOrderValue)}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Discount Percentage</span>
                    <span className="font-medium">{customer.discountPercentage}%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {customer.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">{customer.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

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
            options={[
              { value: 'regular', label: 'Regular' },
              { value: 'vip', label: 'VIP' },
              { value: 'wholesale', label: 'Wholesale' },
              { value: 'retail', label: 'Retail' }
            ]}
            value={newGroup}
            onChange={(e) => setNewGroup(e.target.value)}
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