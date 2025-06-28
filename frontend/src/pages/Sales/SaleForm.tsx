import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { 
  Save, X, Plus, Trash2, User as UserIcon, FileText, Package, 
  DollarSign, Truck, Calendar, Info, AlertTriangle,
  CreditCard, ShoppingBag, Search, ArrowRight, RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import { Select } from '../../components/UI/Select';
import { Badge } from '../../components/UI/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/UI/Table';
import { Modal } from '../../components/UI/Modal';
import { salesAPI, customersAPI, productsAPI, usersAPI } from '../../lib/api';
import { Customer, Product, User, SaleItem } from '../../types';
import { formatCurrency, formatDate, debounce } from '../../utils';
import toast from 'react-hot-toast';

interface SaleFormData {
  customer: string;
  items: {
    product: string;
    quantity: string;
    unitPrice: string;
    discount: string;
    tax: string;
  }[];
  status: string;
  saleDate: string;
  paymentStatus: string;
  paymentMethod: string;
  shippingCost: string;
  salesPerson: string;
  notes: string;
}

export const SaleForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isEdit = Boolean(id);
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEdit);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productQuantity, setProductQuantity] = useState('1');
  const [productDiscount, setProductDiscount] = useState('0');
  const [productTax, setProductTax] = useState('0');
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);

  // Get customer ID from query params if available
  const queryParams = new URLSearchParams(location.search);
  const customerIdFromQuery = queryParams.get('customer');

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { errors }
  } = useForm<SaleFormData>({
    defaultValues: {
      customer: customerIdFromQuery || '',
      items: [],
      status: 'draft',
      saleDate: new Date().toISOString().split('T')[0],
      paymentStatus: 'unpaid',
      paymentMethod: 'cash',
      shippingCost: '0',
      salesPerson: '',
      notes: ''
    }
  });

  const { fields, append, remove, update } = useFieldArray({
    control,
    name: 'items'
  });

  const watchedItems = watch('items');
  const watchedCustomer = watch('customer');
  const watchedShippingCost = watch('shippingCost');

  // Calculate totals
  const subtotal = watchedItems.reduce((sum, item) => {
    const quantity = parseFloat(item.quantity) || 0;
    const unitPrice = parseFloat(item.unitPrice) || 0;
    return sum + (quantity * unitPrice);
  }, 0);

  const totalDiscount = watchedItems.reduce((sum, item) => {
    return sum + (parseFloat(item.discount) || 0);
  }, 0);

  const totalTax = watchedItems.reduce((sum, item) => {
    return sum + (parseFloat(item.tax) || 0);
  }, 0);

  const shippingCost = parseFloat(watchedShippingCost) || 0;
  const grandTotal = subtotal - totalDiscount + totalTax + shippingCost;

  // Debounced product search
  const debouncedProductSearch = debounce((searchTerm: string) => {
    if (!searchTerm) {
      setFilteredProducts(products);
      return;
    }
    
    const filtered = products.filter(product => 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.brand.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    setFilteredProducts(filtered);
  }, 300);

  useEffect(() => {
    fetchCustomers();
    fetchProducts();
    fetchUsers();
    
    if (isEdit && id) {
      fetchSale(id);
    }
  }, [id, isEdit]);

  useEffect(() => {
    if (customerIdFromQuery) {
      fetchCustomerDetails(customerIdFromQuery);
    }
  }, [customerIdFromQuery]);

  useEffect(() => {
    if (watchedCustomer && watchedCustomer !== selectedCustomer?._id) {
      fetchCustomerDetails(watchedCustomer);
    }
  }, [watchedCustomer]);

  useEffect(() => {
    setFilteredProducts(products);
  }, [products]);

  const fetchCustomers = async () => {
    try {
      const response = await customersAPI.getAll({ limit: 100, active: true });
      setCustomers(response.data.data);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await productsAPI.getAll({ limit: 100, status: 'in_stock' });
      setProducts(response.data.data);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await usersAPI.getAll({ limit: 100 });
      setUsers(response.data.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchCustomerDetails = async (customerId: string) => {
    try {
      const response = await customersAPI.getById(customerId);
      setSelectedCustomer(response.data.data);
    } catch (error) {
      console.error('Failed to fetch customer details:', error);
    }
  };

  const fetchSale = async (saleId: string) => {
    try {
      setInitialLoading(true);
      const response = await salesAPI.getById(saleId);
      const sale = response.data.data;
      
      // Format items for form
      const formattedItems = sale.items.map((item: SaleItem) => ({
        product: typeof item.product === 'object' ? item.product._id : item.product,
        quantity: item.quantity.toString(),
        unitPrice: item.unitPrice.toString(),
        discount: item.discount.toString(),
        tax: item.tax.toString()
      }));
      
      // Reset form with sale data
      reset({
        customer: typeof sale.customer === 'object' ? sale.customer._id : sale.customer,
        items: formattedItems,
        status: sale.status,
        saleDate: new Date(sale.saleDate).toISOString().split('T')[0],
        paymentStatus: sale.paymentStatus,
        paymentMethod: sale.paymentMethod || 'cash',
        shippingCost: sale.shippingCost.toString(),
        salesPerson: typeof sale.salesPerson === 'object' ? sale.salesPerson.id : sale.salesPerson || '',
        notes: sale.notes || ''
      });
      
      // Set selected customer
      if (typeof sale.customer === 'object') {
        setSelectedCustomer(sale.customer);
      } else {
        fetchCustomerDetails(sale.customer);
      }
    } catch (error) {
      toast.error('Failed to fetch sale details');
      navigate('/sales');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    setProductQuantity('1');
    setProductDiscount('0');
    setProductTax('0');
    setEditingItemIndex(null);
  };

  const handleAddProduct = () => {
    if (!selectedProduct) return;
    
    const quantity = parseInt(productQuantity) || 1;
    const discount = parseFloat(productDiscount) || 0;
    const tax = parseFloat(productTax) || 0;
    
    // Check if quantity is valid
    if (quantity <= 0) {
      toast.error('Quantity must be greater than zero');
      return;
    }
    
    // Check if product has enough stock
    if (quantity > selectedProduct.currentStock) {
      toast.error(`Insufficient stock. Available: ${selectedProduct.currentStock}`);
      return;
    }
    
    if (editingItemIndex !== null) {
      // Update existing item
      update(editingItemIndex, {
        product: selectedProduct._id,
        quantity: quantity.toString(),
        unitPrice: selectedProduct.sellingPrice.toString(),
        discount: discount.toString(),
        tax: tax.toString()
      });
    } else {
      // Add new item
      append({
        product: selectedProduct._id,
        quantity: quantity.toString(),
        unitPrice: selectedProduct.sellingPrice.toString(),
        discount: discount.toString(),
        tax: tax.toString()
      });
    }
    
    // Reset product selection
    setShowProductModal(false);
    setSelectedProduct(null);
    setProductQuantity('1');
    setProductDiscount('0');
    setProductTax('0');
    setEditingItemIndex(null);
  };

  const handleEditItem = (index: number) => {
    const item = watchedItems[index];
    const product = products.find(p => p._id === item.product);
    
    if (product) {
      setSelectedProduct(product);
      setProductQuantity(item.quantity);
      setProductDiscount(item.discount);
      setProductTax(item.tax);
      setEditingItemIndex(index);
      setShowProductModal(true);
    }
  };

  const onSubmit = async (data: SaleFormData) => {
    try {
      setLoading(true);
      
      if (data.items.length === 0) {
        toast.error('Please add at least one product');
        return;
      }
      
      // Format data
      const formattedData = {
        ...data,
        items: data.items.map(item => ({
          product: item.product,
          quantity: parseInt(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
          discount: parseFloat(item.discount) || 0,
          tax: parseFloat(item.tax) || 0
        })),
        shippingCost: parseFloat(data.shippingCost) || 0
      };

      if (isEdit && id) {
        await salesAPI.update(id, formattedData);
        toast.success('Sale updated successfully');
      } else {
        await salesAPI.create(formattedData);
        toast.success('Sale created successfully');
      }
      
      navigate('/sales');
    } catch (error: any) {
      console.error('Form submission error:', error);
      toast.error(error.response?.data?.message || 'Failed to save sale');
    } finally {
      setLoading(false);
    }
  };

  const statusOptions = [
    { value: 'draft', label: 'Draft' },
    { value: 'confirmed', label: 'Confirmed' }
  ];

  const paymentStatusOptions = [
    { value: 'unpaid', label: 'Unpaid' },
    { value: 'partially_paid', label: 'Partially Paid' },
    { value: 'paid', label: 'Paid' }
  ];

  const paymentMethodOptions = [
    { value: 'cash', label: 'Cash' },
    { value: 'check', label: 'Check' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'credit_card', label: 'Credit Card' },
    { value: 'other', label: 'Other' }
  ];

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Sale' : 'Create New Sale'}
          </h1>
          <p className="text-gray-600">
            {isEdit ? 'Update sale information' : 'Create a new sale invoice'}
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/sales')}>
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <UserIcon className="w-5 h-5 mr-2" />
              Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              label="Customer *"
              options={customers.map(customer => ({ 
                value: customer._id, 
                label: `${customer.name} ${customer.businessName ? `(${customer.businessName})` : ''}` 
              }))}
              {...register('customer', { required: 'Customer is required' })}
              error={errors.customer?.message}
              placeholder="Select customer"
            />
            
            {selectedCustomer && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    {selectedCustomer.type === 'business' ? (
                      <ShoppingBag className="w-5 h-5 text-blue-600" />
                    ) : (
                      <UserIcon className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-blue-900">{selectedCustomer.name}</h4>
                    <p className="text-sm text-blue-700">{selectedCustomer.email} • {selectedCustomer.phone}</p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-blue-600">Group</p>
                        <p className="text-sm font-medium text-blue-800 capitalize">{selectedCustomer.customerGroup}</p>
                      </div>
                      <div>
                        <p className="text-xs text-blue-600">Discount</p>
                        <p className="text-sm font-medium text-blue-800">{selectedCustomer.discountPercentage}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-blue-600">Payment Terms</p>
                        <p className="text-sm font-medium text-blue-800">{selectedCustomer.paymentTerms.replace('_', ' ').toUpperCase()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-blue-600">Credit Limit</p>
                        <p className="text-sm font-medium text-blue-800">{formatCurrency(selectedCustomer.creditLimit)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sale Items */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <Package className="w-5 h-5 mr-2" />
                Sale Items
              </CardTitle>
              <Button 
                type="button" 
                onClick={() => setShowProductModal(true)}
                disabled={!selectedCustomer}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {fields.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No items added yet</p>
                <p className="text-sm">Click "Add Product" to add items to this sale</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Tax</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, index) => {
                    const item = watchedItems[index];
                    const product = products.find(p => p._id === item.product);
                    const quantity = parseFloat(item.quantity) || 0;
                    const unitPrice = parseFloat(item.unitPrice) || 0;
                    const discount = parseFloat(item.discount) || 0;
                    const tax = parseFloat(item.tax) || 0;
                    const total = (quantity * unitPrice) - discount + tax;
                    
                    return (
                      <TableRow key={field.id}>
                        <TableCell>
                          <div className="flex items-center">
                            {product?.images && product.images[0] ? (
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
                              <p className="font-medium">{product?.name || 'Unknown Product'}</p>
                              <p className="text-xs text-gray-500">{product?.sku || ''}</p>
                            </div>
                          </div>
                          <input
                            type="hidden"
                            {...register(`items.${index}.product` as const)}
                          />
                        </TableCell>
                        <TableCell>
                          <input
                            type="hidden"
                            {...register(`items.${index}.quantity` as const)}
                          />
                          <span className="font-medium">
                            {quantity} {product?.unit || ''}
                          </span>
                        </TableCell>
                        <TableCell>
                          <input
                            type="hidden"
                            {...register(`items.${index}.unitPrice` as const)}
                          />
                          <span className="font-medium">{formatCurrency(unitPrice)}</span>
                        </TableCell>
                        <TableCell>
                          <input
                            type="hidden"
                            {...register(`items.${index}.discount` as const)}
                          />
                          {discount > 0 ? (
                            <span className="font-medium text-red-600">{formatCurrency(discount)}</span>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <input
                            type="hidden"
                            {...register(`items.${index}.tax` as const)}
                          />
                          {tax > 0 ? (
                            <span className="font-medium">{formatCurrency(tax)}</span>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{formatCurrency(total)}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditItem(index)}
                            >
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => remove(index)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
            
            {/* Totals */}
            {fields.length > 0 && (
              <div className="mt-6 flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">{formatCurrency(subtotal)}</span>
                  </div>
                  {totalDiscount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Discount:</span>
                      <span className="font-medium text-red-600">-{formatCurrency(totalDiscount)}</span>
                    </div>
                  )}
                  {totalTax > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tax:</span>
                      <span className="font-medium">{formatCurrency(totalTax)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shipping:</span>
                    <span className="font-medium">{formatCurrency(shippingCost)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="font-semibold">Total:</span>
                    <span className="font-bold">{formatCurrency(grandTotal)}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sale Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Sale Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-4">
                <Select
                  label="Status"
                  options={statusOptions}
                  {...register('status')}
                />
                
                <Input
                  label="Sale Date"
                  type="date"
                  {...register('saleDate', { required: 'Sale date is required' })}
                  error={errors.saleDate?.message}
                />
                
                <Input
                  label="Shipping Cost"
                  type="number"
                  step="0.01"
                  {...register('shippingCost')}
                  placeholder="0.00"
                />
              </div>
              
              <div className="space-y-4">
                <Select
                  label="Payment Status"
                  options={paymentStatusOptions}
                  {...register('paymentStatus')}
                />
                
                <Select
                  label="Payment Method"
                  options={paymentMethodOptions}
                  {...register('paymentMethod')}
                />
                
                <Select
                  label="Sales Person"
                  options={[
                    { value: '', label: 'Select sales person (optional)' },
                    ...users.map(user => ({ 
                      value: user.id, 
                      label: `${user.firstName} ${user.lastName}` 
                    }))
                  ]}
                  {...register('salesPerson')}
                  placeholder="Select sales person"
                />
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    {...register('notes')}
                    rows={5}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Add notes about this sale..."
                  />
                </div>
              </div>
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
                  <h4 className="font-medium text-blue-900">Sale Information</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Create a new sale by selecting a customer and adding products. 
                    The system will automatically calculate totals and update inventory when the sale is confirmed.
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
                  <h4 className="font-medium text-yellow-900">Important Note</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    When a sale is confirmed, product stock will be automatically reduced.
                    Make sure all information is correct before changing the status from "Draft".
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
            onClick={() => navigate('/sales')}
          >
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            <Save className="w-4 h-4 mr-2" />
            {isEdit ? 'Update Sale' : 'Create Sale'}
          </Button>
        </div>
      </form>

      {/* Product Selection Modal */}
      <Modal
        isOpen={showProductModal}
        onClose={() => {
          setShowProductModal(false);
          setSelectedProduct(null);
          setEditingItemIndex(null);
        }}
        title={editingItemIndex !== null ? "Edit Product" : "Add Product"}
        size="lg"
      >
        <div className="space-y-4">
          {/* Product Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search products by name, SKU, or brand..."
              value={productSearch}
              onChange={(e) => {
                setProductSearch(e.target.value);
                debouncedProductSearch(e.target.value);
              }}
              className="pl-10"
            />
          </div>

          {/* Product List */}
          {!selectedProduct ? (
            <div className="h-96 overflow-y-auto">
              {filteredProducts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No products found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredProducts.map(product => (
                    <div
                      key={product._id}
                      className={`p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                        product.currentStock === 0 ? 'opacity-50' : ''
                      }`}
                      onClick={() => product.currentStock > 0 && handleProductSelect(product)}
                    >
                      <div className="flex items-center space-x-3">
                        {product.images && product.images[0] ? (
                          <img
                            src={product.images[0].url}
                            alt={product.name}
                            className="w-12 h-12 rounded object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                            <Package className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{product.name}</h4>
                          <p className="text-sm text-gray-500">{product.sku}</p>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-sm font-medium">{formatCurrency(product.sellingPrice)}</span>
                            <div className="flex items-center">
                              <span className={`text-sm ${
                                product.currentStock === 0 ? 'text-red-600' :
                                product.currentStock <= product.minimumStock ? 'text-yellow-600' : 'text-green-600'
                              }`}>
                                {product.currentStock} {product.unit}
                              </span>
                              {product.currentStock === 0 && (
                                <Badge variant="danger" size="sm" className="ml-2">Out of Stock</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Selected Product Details */}
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  {selectedProduct.images && selectedProduct.images[0] ? (
                    <img
                      src={selectedProduct.images[0].url}
                      alt={selectedProduct.name}
                      className="w-16 h-16 rounded object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                      <Package className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-medium text-blue-900">{selectedProduct.name}</h3>
                    <p className="text-sm text-blue-700">SKU: {selectedProduct.sku}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm font-medium">{formatCurrency(selectedProduct.sellingPrice)}</span>
                      <span className="text-sm text-blue-700">Available: {selectedProduct.currentStock} {selectedProduct.unit}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quantity and Price */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Quantity *"
                  type="number"
                  min="1"
                  max={selectedProduct.currentStock.toString()}
                  value={productQuantity}
                  onChange={(e) => setProductQuantity(e.target.value)}
                  placeholder="Enter quantity"
                />
                
                <Input
                  label="Unit Price *"
                  type="number"
                  step="0.01"
                  value={selectedProduct.sellingPrice.toString()}
                  disabled
                />
              </div>

              {/* Discount and Tax */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Discount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={productDiscount}
                  onChange={(e) => setProductDiscount(e.target.value)}
                  placeholder="0.00"
                />
                
                <Input
                  label="Tax"
                  type="number"
                  step="0.01"
                  min="0"
                  value={productTax}
                  onChange={(e) => setProductTax(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              {/* Total */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-medium">Total:</span>
                  <span className="text-lg font-bold">
                    {formatCurrency(
                      (parseFloat(productQuantity) || 0) * selectedProduct.sellingPrice - 
                      (parseFloat(productDiscount) || 0) + 
                      (parseFloat(productTax) || 0)
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowProductModal(false);
                setSelectedProduct(null);
                setEditingItemIndex(null);
              }}
            >
              Cancel
            </Button>
            {selectedProduct && (
              <Button onClick={handleAddProduct}>
                {editingItemIndex !== null ? 'Update Product' : 'Add Product'}
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};