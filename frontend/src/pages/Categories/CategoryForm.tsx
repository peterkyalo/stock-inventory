import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { 
  Save, X, Upload, Image as ImageIcon, 
  Tag, FolderTree, Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import { Select } from '../../components/UI/Select';
import { categoriesAPI } from '../../lib/api';
import { Category } from '../../types';
import toast from 'react-hot-toast';

interface CategoryFormData {
  name: string;
  description: string;
  parentCategory: string;
  sortOrder: string;
  isActive: boolean;
}

export const CategoryForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [existingImage, setExistingImage] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string>('');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    reset
  } = useForm<CategoryFormData>({
    defaultValues: {
      name: '',
      description: '',
      parentCategory: '',
      sortOrder: '0',
      isActive: true
    }
  });

  useEffect(() => {
    fetchCategories();
    
    if (isEdit && id) {
      fetchCategory(id);
    }
  }, [id, isEdit]);

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getAll({ limit: 100 });
      setCategories(response.data.data);
    } catch (error) {
      console.error('Failed to fetch categories');
    }
  };

  const fetchCategory = async (categoryId: string) => {
    try {
      setLoading(true);
      const response = await categoriesAPI.getById(categoryId);
      const category = response.data.data;
      
      reset({
        name: category.name,
        description: category.description || '',
        parentCategory: typeof category.parentCategory === 'object' 
          ? category.parentCategory._id 
          : category.parentCategory || '',
        sortOrder: category.sortOrder.toString(),
        isActive: category.isActive
      });
      
      if (category.image) {
        setExistingImage(category.image);
      }
    } catch (error) {
      toast.error('Failed to fetch category details');
      navigate('/categories');
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast.error('Image size must be less than 2MB');
        return;
      }
      
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setExistingImage('');
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
    }
  };

  const onSubmit = async (data: CategoryFormData) => {
    try {
      setLoading(true);
      
      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('description', data.description);
      formData.append('parentCategory', data.parentCategory);
      formData.append('sortOrder', data.sortOrder);
      formData.append('isActive', data.isActive.toString());
      
      if (selectedImage) {
        formData.append('image', selectedImage);
      }

      if (isEdit && id) {
        await categoriesAPI.update(id, formData);
        toast.success('Category updated successfully');
      } else {
        await categoriesAPI.create(formData);
        toast.success('Category created successfully');
      }
      
      navigate('/categories');
    } catch (error: any) {
      console.error('Form submission error:', error);
      toast.error(error.response?.data?.message || 'Failed to save category');
    } finally {
      setLoading(false);
    }
  };

  // Filter out current category from parent options to prevent circular reference
  const parentCategoryOptions = categories
    .filter(cat => cat._id !== id)
    .map(cat => ({ value: cat._id, label: cat.name }));

  if (loading && isEdit) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Category' : 'Add New Category'}
          </h1>
          <p className="text-gray-600">
            {isEdit ? 'Update category information' : 'Create a new product category'}
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/categories')}>
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Tag className="w-5 h-5 mr-2" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Category Name *"
              {...register('name', { required: 'Category name is required' })}
              error={errors.name?.message}
              placeholder="Enter category name"
            />
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                {...register('description')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter category description"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Parent Category"
                options={parentCategoryOptions}
                {...register('parentCategory')}
                placeholder="Select parent category (optional)"
              />
              
              <Input
                label="Sort Order"
                type="number"
                {...register('sortOrder')}
                placeholder="0"
                helperText="Lower numbers appear first"
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
                Category is active
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Category Image */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ImageIcon className="w-5 h-5 mr-2" />
              Category Image
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              <div className="text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-4">
                  <label htmlFor="image" className="cursor-pointer">
                    <span className="mt-2 block text-sm font-medium text-gray-900">
                      Upload category image
                    </span>
                    <span className="mt-1 block text-sm text-gray-500">
                      PNG, JPG, GIF up to 2MB
                    </span>
                  </label>
                  <input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            {/* Image Preview */}
            {(previewUrl || existingImage) && (
              <div className="relative inline-block">
                <img
                  src={previewUrl || existingImage}
                  alt="Category preview"
                  className="w-32 h-32 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Hierarchy Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FolderTree className="w-5 h-5 mr-2" />
              Category Hierarchy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">About Category Hierarchy</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Categories can be organized in a hierarchical structure. Parent categories can contain 
                    subcategories, making it easier to organize and navigate your product catalog.
                  </p>
                  <ul className="text-sm text-blue-700 mt-2 list-disc list-inside">
                    <li>Leave parent category empty to create a root category</li>
                    <li>Select a parent to create a subcategory</li>
                    <li>Sort order determines the display sequence</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Buttons */}
        <div className="flex items-center justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/categories')}
          >
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            <Save className="w-4 h-4 mr-2" />
            {isEdit ? 'Update Category' : 'Create Category'}
          </Button>
        </div>
      </form>
    </div>
  );
};