import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { 
  Save, X, Building, User, Mail, Phone, MapPin, 
  CreditCard, Star, FileText, AlertTriangle, Info,
  DollarSign, Calendar, Award, Truck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import { Select } from '../../components/UI/Select';
import { Badge } from '../../components/UI/Badge';
import { suppliersAPI } from '../../lib/api';
import { Supplier } from '../../types';
import { validateEmail, validatePhone } from '../../utils';
import toast from 'react-hot-toast';

interface SupplierFormData {
  name: string;
  email: string;
  phone: string;
  contactPerson: {
    name: string;
    phone: string;
    email: string;
  };
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  taxNumber: string;
  bankDetails: {
    bankName: string;
    accountNumber: string;
    routingNumber: string;
    swift: string;
  };
  paymentTerms: string;
  creditLimit: string;
  rating: string;
  notes: string;
  isActive: boolean;
}

export const SupplierForm: React.FC = () => {
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
  } = useForm<SupplierFormData>({
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      contactPerson: {
        name: '',
        phone: '',
        email: ''
      },
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: ''
      },
      taxNumber: '',
      bankDetails: {
        bankName: '',
        accountNumber: '',
        routingNumber: '',
        swift: ''
      },
      paymentTerms: 'net_30',
      creditLimit: '0',
      rating: '5',
      notes: '',
      isActive: true
    }
  });

  const watchedRating = watch('rating');

  useEffect(() => {
    if (isEdit && id) {
      fetchSupplier(id);
    }
  }, [id, isEdit]);

  const fetchSupplier = async (supplierId: string) => {
    try {
      setInitialLoading(true);
      const response = await suppliersAPI.getById(supplierId);
      const supplier = response.data.data;
      
      reset({
        name: supplier.name,
        email: supplier.email,
        phone: supplier.phone,
        contactPerson: {
          name: supplier.contactPerson.name,
          phone: supplier.contactPerson.phone || '',
          email: supplier.contactPerson.email || ''
        },
        address: {
          street: supplier.address.street,
          city: supplier.address.city,
          state: supplier.address.state,
          zipCode: supplier.address.zipCode,
          country: supplier.address.country
        },
        taxNumber: supplier.taxNumber || '',
        bankDetails: {
          bankName: supplier.bankDetails?.bankName || '',
          accountNumber: supplier.bankDetails?.accountNumber || '',
          routingNumber: supplier.bankDetails?.routingNumber || '',
          swift: supplier.bankDetails?.swift || ''
        },
        paymentTerms: supplier.paymentTerms,
        creditLimit: supplier.creditLimit.toString(),
        rating: supplier.rating?.toString() || '5',
        notes: supplier.notes || '',
        isActive: supplier.isActive
      });
    } catch (error) {
      toast.error('Failed to fetch supplier details');
      navigate('/suppliers');
    } finally {
      setInitialLoading(false);
    }
  };

  const onSubmit = async (data: SupplierFormData) => {
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
      
      if (data.contactPerson.email && !validateEmail(data.contactPerson.email)) {
        toast.error('Please provide a valid contact person email');
        return;
      }
      
      if (data.contactPerson.phone && !validatePhone(data.contactPerson.phone)) {
        toast.error('Please provide a valid contact person phone');
        return;
      }
      
      const supplierData = {
        ...data,
        creditLimit: parseFloat(data.creditLimit) || 0,
        rating: parseFloat(data.rating) || undefined
      };

      if (isEdit && id) {
        await suppliersAPI.update(id, supplierData);
        toast.success('Supplier updated successfully');
      } else {
        await suppliersAPI.create(supplierData);
        toast.success('Supplier created successfully');
      }
      
      navigate('/suppliers');
    } catch (error: any) {
      console.error('Form submission error:', error);
      toast.error(error.response?.data?.message || 'Failed to save supplier');
    } finally {
      setLoading(false);
    }
  };

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

  const getRatingStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-5 h-5 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
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
            {isEdit ? 'Edit Supplier' : 'Add New Supplier'}
          </h1>
          <p className="text-gray-600">
            {isEdit ? 'Update supplier information' : 'Create a new supplier in your network'}
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/suppliers')}>
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building className="w-5 h-5 mr-2" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Supplier Name *"
                {...register('name', { 
                  required: 'Supplier name is required',
                  minLength: {
                    value: 2,
                    message: 'Supplier name must be at least 2 characters'
                  }
                })}
                error={errors.name?.message}
                placeholder="Enter supplier name"
              />
              
              <Input
                label="Email Address *"
                type="email"
                {...register('email', { 
                  required: 'Email is required',
                  validate: (value) => validateEmail(value) || 'Please provide a valid email'
                })}
                error={errors.email?.message}
                placeholder="supplier@example.com"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Phone Number *"
                {...register('phone', { 
                  required: 'Phone number is required',
                  validate: (value) => validatePhone(value) || 'Please provide a valid phone number'
                })}
                error={errors.phone?.message}
                placeholder="+1 (555) 123-4567"
              />
              
              <Input
                label="Tax Number"
                {...register('taxNumber')}
                placeholder="Tax identification number"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isActive"
                {...register('isActive')}
                className="rounded border-gray-300"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                Supplier is active
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Contact Person */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="w-5 h-5 mr-2" />
              Contact Person
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Contact Person Name *"
              {...register('contactPerson.name', { 
                required: 'Contact person name is required',
                minLength: {
                  value: 2,
                  message: 'Contact person name must be at least 2 characters'
                }
              })}
              error={errors.contactPerson?.name?.message}
              placeholder="Enter contact person name"
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Contact Phone"
                {...register('contactPerson.phone', {
                  validate: (value) => !value || validatePhone(value) || 'Please provide a valid phone number'
                })}
                error={errors.contactPerson?.phone?.message}
                placeholder="+1 (555) 123-4567"
              />
              
              <Input
                label="Contact Email"
                type="email"
                {...register('contactPerson.email', {
                  validate: (value) => !value || validateEmail(value) || 'Please provide a valid email'
                })}
                error={errors.contactPerson?.email?.message}
                placeholder="contact@supplier.com"
              />
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
          </CardContent>
        </Card>

        {/* Payment & Financial Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CreditCard className="w-5 h-5 mr-2" />
              Payment & Financial Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Payment Terms"
                options={paymentTermsOptions}
                {...register('paymentTerms')}
                placeholder="Select payment terms"
              />
              
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
            </div>

            {/* Bank Details */}
            <div className="pt-4 border-t">
              <h4 className="font-medium text-gray-900 mb-3">Bank Details (Optional)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Bank Name"
                  {...register('bankDetails.bankName')}
                  placeholder="Enter bank name"
                />
                
                <Input
                  label="Account Number"
                  {...register('bankDetails.accountNumber')}
                  placeholder="Enter account number"
                />
                
                <Input
                  label="Routing Number"
                  {...register('bankDetails.routingNumber')}
                  placeholder="Enter routing number"
                />
                
                <Input
                  label="SWIFT Code"
                  {...register('bankDetails.swift')}
                  placeholder="Enter SWIFT code"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rating & Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Star className="w-5 h-5 mr-2" />
              Rating & Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Supplier Rating
              </label>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  {getRatingStars(parseInt(watchedRating) || 0)}
                </div>
                <Select
                  options={[
                    { value: '1', label: '1 Star' },
                    { value: '2', label: '2 Stars' },
                    { value: '3', label: '3 Stars' },
                    { value: '4', label: '4 Stars' },
                    { value: '5', label: '5 Stars' }
                  ]}
                  {...register('rating')}
                  className="w-32"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                {...register('notes')}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Add any additional notes about this supplier..."
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
                  <h4 className="font-medium text-blue-900">Supplier Information</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Provide accurate supplier information to ensure smooth business operations. 
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
                  <h4 className="font-medium text-yellow-900">Payment Terms</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    Payment terms affect cash flow and supplier relationships. 
                    Choose terms that work best for both parties.
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
            onClick={() => navigate('/suppliers')}
          >
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            <Save className="w-4 h-4 mr-2" />
            {isEdit ? 'Update Supplier' : 'Create Supplier'}
          </Button>
        </div>
      </form>
    </div>
  );
};