import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { 
  Save, X, Plus, Trash2, Upload, Image as ImageIcon, 
  Package, DollarSign, Warehouse, Tag, Calendar,
  AlertTriangle, Info, Star, RefreshCw, Zap, Hash
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import { Select } from '../../components/UI/Select';
import { Badge } from '../../components/UI/Badge';
import { productsAPI, categoriesAPI, suppliersAPI } from '../../lib/api';
import { Product, Category, Supplier, ProductVariant } from '../../types';
import { generateSKU, generateBarcode, generateProductCode, validateSKU, validateBarcode } from '../../utils';
import toast from 'react-hot-toast';

interface ProductFormData {
  name: string;
  description: string;
  sku: string;
  barcode: string;
  category: string;
  brand: string;
  unit: string;
  costPrice: string;
  sellingPrice: string;
  minimumStock: string;
  currentStock: string;
  supplier: string;
  tax: string;
  isPerishable: boolean;
  expiryDate: string;
  manufacturingDate: string;
  batchNumber: string;
  tags: string;
  notes: string;
  specifications: {
    weight: { value: string; unit: string };
    dimensions: { length: string; width: string; height: string; unit: string };
    color: string;
    material: string;
    size: string;
    model: string;
    warranty: { period: string; unit: string };
  };
  variants: ProductVariant[];
}

export const ProductForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<any[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [skuGenerationStrategy, setSkuGenerationStrategy] = useState<'simple' | 'category-brand' | 'timestamp' | 'sequential'>('simple');
  const [barcodeFormat, setBarcodeFormat] = useState<'EAN13' | 'UPC' | 'CODE128' | 'CUSTOM'>('EAN13');

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
    reset,
    trigger
  } = useForm<ProductFormData>({
    mode: 'onChange',
    defaultValues: {
      name: '',
      description: '',
      sku: '',
      barcode: '',
      category: '',
      brand: '',
      unit: 'pcs',
      costPrice: '0',
      sellingPrice: '0',
      minimumStock: '10',
      currentStock: '0',
      supplier: '',
      tax: '0',
      isPerishable: false,
      expiryDate: '',
      manufacturingDate: '',
      batchNumber: '',
      tags: '',
      notes: '',
      specifications: {
        weight: { value: '0', unit: 'kg' },
        dimensions: { length: '0', width: '0', height: '0', unit: 'cm' },
        color: '',
        material: '',
        size: '',
        model: '',
        warranty: { period: '0', unit: 'months' }
      },
      variants: []
    }
  });

  const { fields: variantFields, append: appendVariant, remove: removeVariant } = useFieldArray({
    control,
    name: 'variants'
  });

  const watchedValues = watch();
  const costPrice = parseFloat(watchedValues.costPrice) || 0;
  const sellingPrice = parseFloat(watchedValues.sellingPrice) || 0;
  const profitMargin = costPrice > 0 
    ? ((sellingPrice - costPrice) / costPrice * 100).toFixed(2)
    : '0';

  useEffect(() => {
    fetchCategories();
    fetchSuppliers();
    
    if (isEdit && id) {
      fetchProduct(id);
    } else {
      // Generate initial SKU for new products
      handleGenerateSKU();
    }
  }, [id, isEdit, setValue]);

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getAll({ limit: 100 });
      setCategories(response.data.data);
    } catch (error) {
      console.error('Failed to fetch categories');
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await suppliersAPI.getAll({ limit: 100 });
      setSuppliers(response.data.data);
    } catch (error) {
      console.error('Failed to fetch suppliers');
    }
  };

  const fetchProduct = async (productId: string) => {
    try {
      setLoading(true);
      const response = await productsAPI.getById(productId);
      const product = response.data.data;
      
      // Reset form with product data
      reset({
        name: product.name,
        description: product.description || '',
        sku: product.sku,
        barcode: product.barcode || '',
        category: typeof product.category === 'object' ? product.category._id : product.category,
        brand: product.brand,
        unit: product.unit,
        costPrice: product.costPrice.toString(),
        sellingPrice: product.sellingPrice.toString(),
        minimumStock: product.minimumStock.toString(),
        currentStock: product.currentStock.toString(),
        supplier: typeof product.supplier === 'object' ? product.supplier._id : product.supplier || '',
        tax: product.tax.toString(),
        isPerishable: product.isPerishable,
        expiryDate: product.expiryDate ? new Date(product.expiryDate).toISOString().split('T')[0] : '',
        manufacturingDate: product.manufacturingDate ? new Date(product.manufacturingDate).toISOString().split('T')[0] : '',
        batchNumber: product.batchNumber || '',
        tags: product.tags?.join(', ') || '',
        notes: product.notes || '',
        specifications: {
          weight: {
            value: product.specifications?.weight?.value?.toString() || '0',
            unit: product.specifications?.weight?.unit || 'kg'
          },
          dimensions: {
            length: product.specifications?.dimensions?.length?.toString() || '0',
            width: product.specifications?.dimensions?.width?.toString() || '0',
            height: product.specifications?.dimensions?.height?.toString() || '0',
            unit: product.specifications?.dimensions?.unit || 'cm'
          },
          color: product.specifications?.color || '',
          material: product.specifications?.material || '',
          size: product.specifications?.size || '',
          model: product.specifications?.model || '',
          warranty: {
            period: product.specifications?.warranty?.period?.toString() || '0',
            unit: product.specifications?.warranty?.unit || 'months'
          }
        },
        variants: product.variants || []
      });
      
      setExistingImages(product.images || []);
    } catch (error) {
      toast.error('Failed to fetch product details');
      navigate('/products');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSKU = () => {
    const selectedCategory = categories.find(cat => cat._id === watchedValues.category);
    const categoryName = selectedCategory?.name || '';
    const brandName = watchedValues.brand || '';

    const newSKU = generateSKU({
      strategy: skuGenerationStrategy,
      category: categoryName,
      brand: brandName,
      prefix: 'SKU'
    });

    setValue('sku', newSKU);
    toast.success('SKU generated successfully');
  };

  const handleGenerateBarcode = () => {
    const newBarcode = generateBarcode({
      format: barcodeFormat,
      prefix: watchedValues.brand.substring(0, 3).toUpperCase()
    });

    setValue('barcode', newBarcode);
    toast.success('Barcode generated successfully');
  };

  const handleGenerateProductCode = () => {
    const selectedCategory = categories.find(cat => cat._id === watchedValues.category);
    const categoryName = selectedCategory?.name || 'CAT';
    const brandName = watchedValues.brand || 'BRD';

    const productCode = generateProductCode(categoryName, brandName);
    setValue('sku', productCode);
    toast.success('Product code generated successfully');
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + selectedImages.length + existingImages.length > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }

    setSelectedImages(prev => [...prev, ...files]);
    
    // Create preview URLs
    const newPreviewUrls = files.map(file => URL.createObjectURL(file));
    setPreviewUrls(prev => [...prev, ...newPreviewUrls]);
  };

  const removeImage = (index: number, isExisting: boolean = false) => {
    if (isExisting) {
      setExistingImages(prev => prev.filter((_, i) => i !== index));
    } else {
      setSelectedImages(prev => prev.filter((_, i) => i !== index));
      setPreviewUrls(prev => {
        URL.revokeObjectURL(prev[index]);
        return prev.filter((_, i) => i !== index);
      });
    }
  };

  const onSubmit = async (data: ProductFormData) => {
    try {
      setLoading(true);
      
      // Validate SKU and Barcode
      if (!validateSKU(data.sku)) {
        toast.error('Invalid SKU format. Use only alphanumeric characters, hyphens, and underscores.');
        return;
      }

      if (data.barcode && !validateBarcode(data.barcode)) {
        toast.error('Invalid barcode format.');
        return;
      }
      
      const formData = new FormData();
      
      // Add form fields with proper conversion
      formData.append('name', data.name);
      formData.append('description', data.description);
      formData.append('sku', data.sku);
      formData.append('barcode', data.barcode);
      formData.append('category', data.category);
      formData.append('brand', data.brand);
      formData.append('unit', data.unit);
      formData.append('costPrice', data.costPrice);
      formData.append('sellingPrice', data.sellingPrice);
      formData.append('minimumStock', data.minimumStock);
      formData.append('currentStock', data.currentStock);
      formData.append('supplier', data.supplier);
      formData.append('tax', data.tax);
      formData.append('isPerishable', data.isPerishable.toString());
      formData.append('expiryDate', data.expiryDate);
      formData.append('manufacturingDate', data.manufacturingDate);
      formData.append('batchNumber', data.batchNumber);
      formData.append('tags', data.tags);
      formData.append('notes', data.notes);
      
      // Convert specifications to proper format
      const specifications = {
        weight: {
          value: parseFloat(data.specifications.weight.value) || 0,
          unit: data.specifications.weight.unit
        },
        dimensions: {
          length: parseFloat(data.specifications.dimensions.length) || 0,
          width: parseFloat(data.specifications.dimensions.width) || 0,
          height: parseFloat(data.specifications.dimensions.height) || 0,
          unit: data.specifications.dimensions.unit
        },
        color: data.specifications.color,
        material: data.specifications.material,
        size: data.specifications.size,
        model: data.specifications.model,
        warranty: {
          period: parseInt(data.specifications.warranty.period) || 0,
          unit: data.specifications.warranty.unit
        }
      };
      
      formData.append('specifications', JSON.stringify(specifications));
      formData.append('variants', JSON.stringify(data.variants));
      
      // Add images
      selectedImages.forEach((file) => {
        formData.append('images', file);
      });
      
      // Add existing images for edit
      if (isEdit) {
        formData.append('existingImages', JSON.stringify(existingImages));
      }

      if (isEdit && id) {
        await productsAPI.update(id, formData);
        toast.success('Product updated successfully');
      } else {
        await productsAPI.create(formData);
        toast.success('Product created successfully');
      }
      
      navigate('/products');
    } catch (error: any) {
      console.error('Form submission error:', error);
      toast.error(error.response?.data?.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  const addVariant = () => {
    appendVariant({ name: '', value: '', additionalPrice: 0 });
  };

  const unitOptions = [
    { value: 'pcs', label: 'Pieces' },
    { value: 'kg', label: 'Kilograms' },
    { value: 'gm', label: 'Grams' },
    { value: 'ltr', label: 'Liters' },
    { value: 'ml', label: 'Milliliters' },
    { value: 'mtr', label: 'Meters' },
    { value: 'cm', label: 'Centimeters' },
    { value: 'box', label: 'Box' },
    { value: 'pack', label: 'Pack' },
    { value: 'dozen', label: 'Dozen' },
    { value: 'pair', label: 'Pair' },
    { value: 'set', label: 'Set' }
  ];

  const weightUnits = [
    { value: 'kg', label: 'Kilograms' },
    { value: 'gm', label: 'Grams' },
    { value: 'lbs', label: 'Pounds' },
    { value: 'oz', label: 'Ounces' }
  ];

  const dimensionUnits = [
    { value: 'cm', label: 'Centimeters' },
    { value: 'mm', label: 'Millimeters' },
    { value: 'inch', label: 'Inches' },
    { value: 'ft', label: 'Feet' }
  ];

  const warrantyUnits = [
    { value: 'days', label: 'Days' },
    { value: 'months', label: 'Months' },
    { value: 'years', label: 'Years' }
  ];

  const skuStrategyOptions = [
    { value: 'simple', label: 'Simple (SKU-XXXXXX-XXX)' },
    { value: 'category-brand', label: 'Category + Brand (CATBRDXXXXXX)' },
    { value: 'timestamp', label: 'Timestamp (SKU240101XXX)' },
    { value: 'sequential', label: 'Sequential (SKU-0001)' }
  ];

  const barcodeFormatOptions = [
    { value: 'EAN13', label: 'EAN-13 (13 digits)' },
    { value: 'UPC', label: 'UPC (12 digits)' },
    { value: 'CODE128', label: 'Code 128 (Alphanumeric)' },
    { value: 'CUSTOM', label: 'Custom Format' }
  ];

  if (loading && isEdit) {
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
            {isEdit ? 'Edit Product' : 'Add New Product'}
          </h1>
          <p className="text-gray-600">
            {isEdit ? 'Update product information' : 'Create a new product in your inventory'}
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/products')}>
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Package className="w-5 h-5 mr-2" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Product Name *"
                {...register('name', { 
                  required: 'Product name is required',
                  minLength: {
                    value: 2,
                    message: 'Product name must be at least 2 characters'
                  }
                })}
                error={errors.name?.message}
                placeholder="Enter product name"
              />
              
              <Input
                label="Brand *"
                {...register('brand', { 
                  required: 'Brand is required',
                  minLength: {
                    value: 2,
                    message: 'Brand must be at least 2 characters'
                  }
                })}
                error={errors.brand?.message}
                placeholder="Enter brand name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                {...register('description')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter product description"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Category *"
                options={categories.map(cat => ({ value: cat._id, label: cat.name }))}
                {...register('category', { required: 'Category is required' })}
                error={errors.category?.message}
                placeholder="Select category"
              />
              
              <Select
                label="Supplier"
                options={suppliers.map(sup => ({ value: sup._id, label: sup.name }))}
                {...register('supplier')}
                placeholder="Select supplier"
              />
            </div>

            <Select
              label="Unit *"
              options={unitOptions}
              {...register('unit', { required: 'Unit is required' })}
              error={errors.unit?.message}
            />

            <Input
              label="Tags"
              {...register('tags')}
              placeholder="Enter tags separated by commas"
              helperText="e.g., electronics, mobile, smartphone"
            />
          </CardContent>
        </Card>

        {/* SKU and Barcode Generation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Hash className="w-5 h-5 mr-2" />
              Product Identification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* SKU Generation */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                  SKU (Stock Keeping Unit) *
                </label>
                <div className="flex items-center space-x-2">
                  <Select
                    options={skuStrategyOptions}
                    value={skuGenerationStrategy}
                    onChange={(e) => setSkuGenerationStrategy(e.target.value as any)}
                    className="w-48"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateSKU}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Generate
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateProductCode}
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Smart Code
                  </Button>
                </div>
              </div>
              <Input
                {...register('sku', { 
                  required: 'SKU is required',
                  minLength: {
                    value: 3,
                    message: 'SKU must be at least 3 characters'
                  }
                })}
                error={errors.sku?.message}
                placeholder="Product SKU"
              />
              <p className="text-xs text-gray-500">
                SKU must be unique and contain only letters, numbers, hyphens, and underscores
              </p>
            </div>

            {/* Barcode Generation */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                  Barcode
                </label>
                <div className="flex items-center space-x-2">
                  <Select
                    options={barcodeFormatOptions}
                    value={barcodeFormat}
                    onChange={(e) => setBarcodeFormat(e.target.value as any)}
                    className="w-48"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateBarcode}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Generate
                  </Button>
                </div>
              </div>
              <Input
                {...register('barcode')}
                placeholder="Product barcode"
              />
              <p className="text-xs text-gray-500">
                {barcodeFormat === 'EAN13' && 'EAN-13 format: 13 digits'}
                {barcodeFormat === 'UPC' && 'UPC format: 12 digits'}
                {barcodeFormat === 'CODE128' && 'Code 128 format: Alphanumeric'}
                {barcodeFormat === 'CUSTOM' && 'Custom format: Letters and numbers'}
              </p>
            </div>

            {/* Generation Tips */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">Auto-Generation Tips</h4>
                  <ul className="text-sm text-blue-700 mt-1 list-disc list-inside space-y-1">
                    <li><strong>Simple:</strong> Basic format with timestamp and random characters</li>
                    <li><strong>Category + Brand:</strong> Uses first 3 letters of category and brand</li>
                    <li><strong>Timestamp:</strong> Includes current date for chronological ordering</li>
                    <li><strong>Smart Code:</strong> Intelligent code based on category and brand</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="w-5 h-5 mr-2" />
              Pricing & Profit
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Cost Price *"
                type="number"
                step="0.01"
                {...register('costPrice', { 
                  required: 'Cost price is required',
                  min: { value: 0, message: 'Cost price cannot be negative' }
                })}
                error={errors.costPrice?.message}
                placeholder="0.00"
              />
              
              <Input
                label="Selling Price *"
                type="number"
                step="0.01"
                {...register('sellingPrice', { 
                  required: 'Selling price is required',
                  min: { value: 0, message: 'Selling price cannot be negative' }
                })}
                error={errors.sellingPrice?.message}
                placeholder="0.00"
              />
              
              <Input
                label="Tax (%)"
                type="number"
                step="0.01"
                {...register('tax', {
                  min: { value: 0, message: 'Tax cannot be negative' },
                  max: { value: 100, message: 'Tax cannot exceed 100%' }
                })}
                error={errors.tax?.message}
                placeholder="0.00"
              />
            </div>

            {/* Profit Margin Display */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Profit Margin:</span>
                <div className="flex items-center space-x-2">
                  <Badge variant={parseFloat(profitMargin) > 30 ? 'success' : parseFloat(profitMargin) > 10 ? 'warning' : 'danger'}>
                    {profitMargin}%
                  </Badge>
                  {parseFloat(profitMargin) < 10 && (
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Profit Amount: ${(sellingPrice - costPrice).toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Inventory */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Warehouse className="w-5 h-5 mr-2" />
              Inventory Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Current Stock"
                type="number"
                {...register('currentStock', {
                  min: { value: 0, message: 'Stock cannot be negative' }
                })}
                error={errors.currentStock?.message}
                placeholder="0"
              />
              
              <Input
                label="Minimum Stock Level"
                type="number"
                {...register('minimumStock', {
                  min: { value: 0, message: 'Minimum stock cannot be negative' }
                })}
                error={errors.minimumStock?.message}
                placeholder="10"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isPerishable"
                {...register('isPerishable')}
                className="rounded border-gray-300"
              />
              <label htmlFor="isPerishable" className="text-sm font-medium text-gray-700">
                This product is perishable
              </label>
            </div>

            {watchedValues.isPerishable && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Manufacturing Date"
                  type="date"
                  {...register('manufacturingDate')}
                />
                
                <Input
                  label="Expiry Date"
                  type="date"
                  {...register('expiryDate')}
                />
                
                <Input
                  label="Batch Number"
                  {...register('batchNumber')}
                  placeholder="Batch number"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Product Images */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ImageIcon className="w-5 h-5 mr-2" />
              Product Images
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              <div className="text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-4">
                  <label htmlFor="images" className="cursor-pointer">
                    <span className="mt-2 block text-sm font-medium text-gray-900">
                      Upload product images
                    </span>
                    <span className="mt-1 block text-sm text-gray-500">
                      PNG, JPG, GIF up to 5MB each (max 5 images)
                    </span>
                  </label>
                  <input
                    id="images"
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            {/* Image Previews */}
            {(existingImages.length > 0 || previewUrls.length > 0) && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {existingImages.map((image, index) => (
                  <div key={`existing-${index}`} className="relative">
                    <img
                      src={image.url}
                      alt={image.alt || 'Product image'}
                      className="w-full h-24 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index, true)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    {image.isPrimary && (
                      <Badge className="absolute bottom-1 left-1" size="sm">
                        <Star className="w-3 h-3 mr-1" />
                        Primary
                      </Badge>
                    )}
                  </div>
                ))}
                
                {previewUrls.map((url, index) => (
                  <div key={`new-${index}`} className="relative">
                    <img
                      src={url}
                      alt="Preview"
                      className="w-full h-24 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index, false)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Product Variants */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Tag className="w-5 h-5 mr-2" />
                Product Variants
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addVariant}>
                <Plus className="w-4 h-4 mr-2" />
                Add Variant
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {variantFields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg">
                <Input
                  label="Variant Name"
                  {...register(`variants.${index}.name` as const)}
                  placeholder="e.g., Size, Color"
                />
                
                <Input
                  label="Variant Value"
                  {...register(`variants.${index}.value` as const)}
                  placeholder="e.g., Large, Red"
                />
                
                <Input
                  label="Additional Price"
                  type="number"
                  step="0.01"
                  {...register(`variants.${index}.additionalPrice` as const)}
                  placeholder="0.00"
                />
                
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeVariant(index)}
                    className="w-full"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove
                  </Button>
                </div>
              </div>
            ))}
            
            {variantFields.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Tag className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No variants added yet</p>
                <p className="text-sm">Add variants like size, color, or other options</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Specifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Info className="w-5 h-5 mr-2" />
              Specifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Weight */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Weight</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Weight Value"
                  type="number"
                  step="0.01"
                  {...register('specifications.weight.value')}
                  placeholder="0.00"
                />
                <Select
                  label="Weight Unit"
                  options={weightUnits}
                  {...register('specifications.weight.unit')}
                />
              </div>
            </div>

            {/* Dimensions */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Dimensions</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Input
                  label="Length"
                  type="number"
                  step="0.01"
                  {...register('specifications.dimensions.length')}
                  placeholder="0.00"
                />
                <Input
                  label="Width"
                  type="number"
                  step="0.01"
                  {...register('specifications.dimensions.width')}
                  placeholder="0.00"
                />
                <Input
                  label="Height"
                  type="number"
                  step="0.01"
                  {...register('specifications.dimensions.height')}
                  placeholder="0.00"
                />
                <Select
                  label="Unit"
                  options={dimensionUnits}
                  {...register('specifications.dimensions.unit')}
                />
              </div>
            </div>

            {/* Other Specifications */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Color"
                {...register('specifications.color')}
                placeholder="Product color"
              />
              
              <Input
                label="Material"
                {...register('specifications.material')}
                placeholder="Product material"
              />
              
              <Input
                label="Size"
                {...register('specifications.size')}
                placeholder="Product size"
              />
              
              <Input
                label="Model"
                {...register('specifications.model')}
                placeholder="Product model"
              />
            </div>

            {/* Warranty */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Warranty</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Warranty Period"
                  type="number"
                  {...register('specifications.warranty.period')}
                  placeholder="0"
                />
                <Select
                  label="Warranty Unit"
                  options={warrantyUnits}
                  {...register('specifications.warranty.unit')}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              {...register('notes')}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Any additional notes about this product..."
            />
          </CardContent>
        </Card>

        {/* Submit Buttons */}
        <div className="flex items-center justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/products')}
          >
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            <Save className="w-4 h-4 mr-2" />
            {isEdit ? 'Update Product' : 'Create Product'}
          </Button>
        </div>
      </form>
    </div>
  );
};