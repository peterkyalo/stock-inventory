import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { 
  Save, X, User, Building, Mail, Phone, MapPin, 
  CreditCard, Crown, FileText, AlertTriangle, Info,
  DollarSign, Calendar, Award, Users, Shield
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import { Select } from '../../components/UI/Select';
import { Badge } from '../../components/UI/Badge';
import { customersAPI } from '../../lib/api';
import { Customer } from '../../types';
import { validateEmail, validatePhone } from '../../utils';
import toast from 'react-hot-toast';

interface CustomerFormData {
  name: string;
  email: string;
  phone: string;
  type: string;
  businessName: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  billingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    sameAsAddress: boolean;
  };
  taxNumber: string;
  customerGroup: string;
  discountPercentage: string;
  creditLimit: string;
  paymentTerms: string;
  notes: string;
  isActive: boolean;
}

export const CustomerForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEdit);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset
  } = useForm<CustomerFormData>({
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      type: 'individual',
      businessName: '',
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: ''
      },
      billingAddress: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: '',
        sameAsAddress: true
      },
      taxNumber: '',
      customerGroup: 'regular',
      discountPercentage: '0',
      creditLimit: '0',
      paymentTerms: 'net_30',
      notes: '',
      isActive: true
    }
  });

  const watchedType = watch('type');
  const watchedGroup = watch('customerGroup');
  const watchedSameAddress = watch('billingAddress.sameAsAddress');

  useEffect(() => {
    if (isEdit && id) {
      fetchCustomer(id);
    }
  }, [id, isEdit]);

  const fetchCustomer = async (customerId: string) => {
    try {
      setInitialLoading(true);
      const response = await customersAPI.getById(customerId);
      const customer = response.data.data;
      
      reset({
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        type: customer.type,
        businessName: customer.businessName || '',
        address: {
          street: customer.address.street,
          city: customer.address.city,
          state: customer.address.state,
          zipCode: customer.address.zipCode,
          country: customer.address.country
        },
        billingAddress: {
          street: customer.billingAddress?.street || '',
          city: customer.billingAddress?.city || '',
          state: customer.billingAddress?.state || '',
          zipCode: customer.billingAddress?.zipCode || '',
          country: customer.billingAddress?.country || '',
          sameAsAddress: customer.billingAddress?.sameAsAddress ?? true
        },
        taxNumber: customer.taxNumber || '',
        customerGroup: customer.customerGroup,
        discountPercentage: customer.discountPercentage.toString(),
        creditLimit: customer.creditLimit.toString(),
        paymentTerms: customer.paymentTerms,
        notes: customer.notes || '',
        isActive: customer.isActive
      });
    } catch (error) {
      toast.error('Failed to fetch customer details');
      navigate('/customers');
    } finally {
      setInitialLoading(false);
    }
  };

  const onSubmit = async (data: CustomerFormData) => {
    try {
      setLoading(true);
      
      // Validate email and phone
      if (!validateEmail(data.email)) {
        toast.error('Please provide a valid email address');
        return;
      }
      
      if (!validatePhone(data.phone)) {
        toast.error('Please provide a valid phone number');
        return;
      }
      
      const customerData = {
        ...data,
        discountPercentage: parseFloat(data.discountPercentage) || 0,
        creditLimit: parseFloat(data.creditLimit) || 0,
        billingAddress: data.billingAddress.sameAsAddress ? {
          ...data.address,
          sameAsAddress: true
        } : data.billingAddress
      };

      if (isEdit && id) {
        await customersAPI.update(id, customerData);
        toast.success('Customer updated successfully');
      } else {
        await customersAPI.create(customerData);
        toast.success('Customer created successfully');
      }
      
      navigate('/customers');
    } catch (error: any) {
      console.error('Form submission error:', error);
      toast.error(error.response?.data?.message || 'Failed to save customer');
    } finally {
      setLoading(false);
    }
  };

  const typeOptions = [
    { value: 'individual', label: 'Individual' },
    { value: 'business', label: 'Business' }
  ];

  const groupOptions = [
    { value: 'regular', label: 'Regular' },
    { value: 'vip', label: 'VIP' },
    { value: 'wholesale', label: 'Wholesale' },
    { value: 'retail', label: 'Retail' }
  ];

  const paymentTermsOptions = [
    { value: 'cash', label: 'Cash' },
    { value: 'net_15', label: 'Net 15 Days' },
    { value: 'net_30', label: 'Net 30 Days' },
    { value: 'net_45', label: 'Net 45 Days' },
    { value: 'net_60', label: 'Net 60 Days' }
  ];

  const countryOptions = [
    { value: 'US', label: 'United States' },
    { value: 'CA', label: 'Canada' },
    { value: 'UK', label: 'United Kingdom' },
    { value: 'AU', label: 'Australia' },
    { value: 'DE', label: 'Germany' },
    { value: 'FR', label: 'France' },
    { value: 'JP', label: 'Japan' },
    { value: 'CN', label: 'China' },
    { value: 'IN', label: 'India' },
    { value: 'BR', label: 'Brazil' }
  ];

  const getGroupBadge = (group: string) => {
    const variants = {
      regular: { variant: 'default' as const, icon: User, color: 'text-gray-600' },
      vip: { variant: 'warning' as const, icon: Crown, color: 'text-yellow-600' },
      wholesale: { variant: 'info' as const, icon: Building, color: 'text-blue-600' },
      retail: { variant: 'success' as const, icon: Shield, color: 'text-green-600' }
    };
    
    const config = variants[group as keyof typeof variants] || variants.regular;
    const Icon = config.icon;
    
    return <Badge variant={config.variant} className="flex items-center gap-1">
      <Icon className="w-3 h-3" />
      {group.charAt(0).toUpperCase() + group.slice(1)}
    </Badge>;
  };

  if (initialLoading) {
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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Customer' : 'Add New Customer'}
          </h1>
          <p className="text-gray-600">
            {isEdit ? 'Update customer information' : 'Create a new customer in your database'}
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/customers')}>
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Customer Name *"
                {...register('name', { 
                  required: 'Customer name is required',
                  minLength: {
                    value: 2,
                    message: 'Customer name must be at least 2 characters'
                  }
                })}
                error={errors.name?.message}
                placeholder="Enter customer name"
              />
              
              <Select
                label="Customer Type *"
                options={typeOptions}
                {...register('type', { required: 'Customer type is required' })}
                error={errors.type?.message}
              />
            </div>

            {watchedType === 'business' && (
              <Input
                label="Business Name"
                {...register('businessName')}
                placeholder="Enter business name"
              />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Email Address *"
                type="email"
                {...register('email', { 
                  required: 'Email is required',
                  validate: (value) => validateEmail(value) || 'Please provide a valid email'
                })}
                error={errors.email?.message}
                placeholder="customer@example.com"
              />
              
              <Input
                label="Phone Number *"
                {...register('phone', { 
                  required: 'Phone number is required',
                  validate: (value) => validatePhone(value) || 'Please provide a valid phone number'
                })}
                error={errors.phone?.message}
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Tax Number"
                {...register('taxNumber')}
                placeholder="Tax identification number"
              />
              
              <div className="flex items-center space-x-2 pt-6">
                <input
                  type="checkbox"
                  id="isActive"
                  {...register('isActive')}
                  className="rounded border-gray-300"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                  Customer is active
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        

        {/* Address Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="w-5 h-5 mr-2" />
              Address Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Street Address *"
              {...register('address.street', { required: 'Street address is required' })}
              error={errors.address?.street?.message}
              placeholder="Enter street address"
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="City *"
                {...register('address.city', { required: 'City is required' })}
                error={errors.address?.city?.message}
                placeholder="Enter city"
              />
              
              <Input
                label="State/Province *"
                {...register('address.state', { required: 'State is required' })}
                error={errors.address?.state?.message}
                placeholder="Enter state or province"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="ZIP/Postal Code *"
                {...register('address.zipCode', { required: 'ZIP code is required' })}
                error={errors.address?.zipCode?.message}
                placeholder="Enter ZIP or postal code"
              />
              
              <Select
                label="Country *"
                options={countryOptions}
                {...register('address.country', { required: 'Country is required' })}
                error={errors.address?.country?.message}
                placeholder="Select country"
              />
            </div>

            {/* Billing Address */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-900">Billing Address</h4>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="sameAsAddress"
                    {...register('billingAddress.sameAsAddress')}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="sameAsAddress" className="text-sm font-medium text-gray-700">
                    Same as address
                  </label>
                </div>
              </div>

              {!watchedSameAddress && (
                <div className="space-y-4">
                  <Input
                    label="Billing Street Address"
                    {...register('billingAddress.street')}
                    placeholder="Enter billing street address"
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Billing City"
                      {...register('billingAddress.city')}
                      placeholder="Enter city"
                    />
                    
                    <Input
                      label="Billing State/Province"
                      {...register('billingAddress.state')}
                      placeholder="Enter state or province"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Billing ZIP/Postal Code"
                      {...register('billingAddress.zipCode')}
                      placeholder="Enter ZIP or postal code"
                    />
                    
                    <Select
                      label="Billing Country"
                      options={countryOptions}
                      {...register('billingAddress.country')}
                      placeholder="Select country"
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Customer Classification & Financial Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Crown className="w-5 h-5 mr-2" />
              Customer Classification & Financial Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Group
                </label>
                <div className="flex items-center space-x-4">
                  <Select
                    options={groupOptions}
                    {...register('customerGroup')}
                    className="flex-1"
                  />
                  <div>
                    {getGroupBadge(watchedGroup)}
                  </div>
                </div>
              </div>
              
              <Input
                label="Discount Percentage (%)"
                type="number"
                step="0.01"
                min="0"
                max="100"
                {...register('discountPercentage', {
                  min: { value: 0, message: 'Discount cannot be negative' },
                  max: { value: 100, message: 'Discount cannot exceed 100%' }
                })}
                error={errors.discountPercentage?.message}
                placeholder="0.00"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Credit Limit"
                type="number"
                step="0.01"
                {...register('creditLimit', {
                  min: { value: 0, message: 'Credit limit cannot be negative' }
                })}
                error={errors.creditLimit?.message}
                placeholder="0.00"
              />
              
              <Select
                label="Payment Terms"
                options={paymentTermsOptions}
                {...register('paymentTerms')}
                placeholder="Select payment terms"
              />
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">Customer Group Benefits</h4>
                  <ul className="text-sm text-blue-700 mt-1 space-y-1">
                    <li><strong>Regular:</strong> Standard pricing and terms</li>
                    <li><strong>VIP:</strong> Priority support and exclusive offers</li>
                    <li><strong>Wholesale:</strong> Volume discounts and extended payment terms</li>
                    <li><strong>Retail:</strong> Standard retail pricing and promotions</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Additional Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                {...register('notes')}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Add any additional notes about this customer..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">Customer Information</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Provide accurate customer information to ensure smooth business operations. 
                    All required fields must be completed before saving.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-900">Credit & Payment Terms</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    Setting appropriate credit limits and payment terms helps manage cash flow and customer relationships.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Submit Buttons */}
        <div className="flex items-center justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/customers')}
          >
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            <Save className="w-4 h-4 mr-2" />
            {isEdit ? 'Update Customer' : 'Create Customer'}
          </Button>
        </div>
      </form>
    </div>
  );
};