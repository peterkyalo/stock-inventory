import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, Edit, Trash2, Tag, Package, 
  FolderTree, Calendar, User, BarChart3,
  Eye, Plus, Grid, List
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Badge } from '../../components/UI/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/UI/Table';
import { categoriesAPI, productsAPI } from '../../lib/api';
import { Category, Product } from '../../types';
import { formatDate, formatCurrency } from '../../utils';
import toast from 'react-hot-toast';

export const CategoryDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [productsViewMode, setProductsViewMode] = useState<'grid' | 'list'>('list');

  useEffect(() => {
    if (id) {
      fetchCategory(id);
      fetchCategoryProducts(id);
      fetchCategoryStats(id);
    }
  }, [id]);

  const fetchCategory = async (categoryId: string) => {
    try {
      setLoading(true);
      const response = await categoriesAPI.getById(categoryId);
      setCategory(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch category details');
      navigate('/categories');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategoryProducts = async (categoryId: string) => {
    try {
      const response = await productsAPI.getByCategory(categoryId);
      setProducts(response.data.data);
    } catch (error) {
      console.error('Failed to fetch category products');
    }
  };

  const fetchCategoryStats = async (categoryId: string) => {
    try {
      const response = await categoriesAPI.getStats(categoryId);
      setStats(response.data.data);
    } catch (error) {
      console.error('Failed to fetch category stats');
    }
  };

  const handleDelete = async () => {
    if (!category) return;
    
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        await categoriesAPI.delete(category._id);
        toast.success('Category deleted successfully');
        navigate('/categories');
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Failed to delete category');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="text-center py-12">
        <Tag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900">Category not found</h2>
        <p className="text-gray-600 mt-2">The category you're looking for doesn't exist.</p>
        <Link to="/categories">
          <Button className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Categories
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
          <Button variant="outline" onClick={() => navigate('/categories')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{category.name}</h1>
            <p className="text-gray-600">Category Details</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <Link to={`/categories/${category._id}/edit`}>
            <Button variant="outline" size="sm">
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={handleDelete}>
            <Trash2 className="w-4 h-4 mr-2 text-red-500" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Category Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Category Image */}
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                {category.image ? (
                  <img
                    src={category.image}
                    alt={category.name}
                    className="w-32 h-32 mx-auto rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-32 h-32 mx-auto bg-gray-200 rounded-lg flex items-center justify-center">
                    <Tag className="w-16 h-16 text-gray-400" />
                  </div>
                )}
                <h2 className="text-xl font-bold text-gray-900 mt-4">{category.name}</h2>
                {category.description && (
                  <p className="text-gray-600 mt-2">{category.description}</p>
                )}
                <div className="mt-4">
                  <Badge variant={category.isActive ? 'success' : 'danger'}>
                    {category.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Category Stats */}
          {stats && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{stats.totalProducts}</p>
                    <p className="text-sm text-gray-600">Products</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{stats.totalStock}</p>
                    <p className="text-sm text-gray-600">Total Stock</p>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <p className="text-2xl font-bold text-purple-600">
                      {formatCurrency(stats.totalValue)}
                    </p>
                    <p className="text-sm text-gray-600">Total Value</p>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <p className="text-2xl font-bold text-yellow-600">{stats.lowStockCount}</p>
                    <p className="text-sm text-gray-600">Low Stock</p>
                  </div>
                </div>
                
                {stats.averagePrice && (
                  <div className="pt-4 border-t">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Average Price:</span>
                      <span className="font-medium">{formatCurrency(stats.averagePrice)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Category Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Tag className="w-5 h-5 mr-2" />
                Category Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Sort Order:</span>
                <span className="font-medium">{category.sortOrder}</span>
              </div>
              
              {category.parentCategory && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Parent Category:</span>
                  <span className="font-medium">
                    {typeof category.parentCategory === 'object' 
                      ? category.parentCategory.name 
                      : category.parentCategory}
                  </span>
                </div>
              )}
              
              <div className="flex justify-between">
                <span className="text-gray-600">Created:</span>
                <span className="font-medium">{formatDate(category.createdAt)}</span>
              </div>
              
              {category.createdBy && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Created By:</span>
                  <span className="font-medium">
                    {typeof category.createdBy === 'object' 
                      ? `${category.createdBy.firstName} ${category.createdBy.lastName}`
                      : category.createdBy}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Subcategories */}
          {category.subcategories && category.subcategories.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FolderTree className="w-5 h-5 mr-2" />
                  Subcategories
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {category.subcategories.map((subcategory) => (
                    <Link
                      key={subcategory._id}
                      to={`/categories/${subcategory._id}`}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <span className="font-medium">{subcategory.name}</span>
                      <Badge variant={subcategory.isActive ? 'success' : 'danger'} size="sm">
                        {subcategory.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Products */}
        <div className="lg:col-span-2 space-y-6">
          {/* Products Header */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Package className="w-5 h-5 mr-2" />
                  Products in this Category ({products.length})
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Link to={`/products/new?category=${category._id}`}>
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Product
                    </Button>
                  </Link>
                  <div className="flex items-center border rounded-lg">
                    <Button
                      variant={productsViewMode === 'list' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setProductsViewMode('list')}
                      className="rounded-r-none"
                    >
                      <List className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={productsViewMode === 'grid' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setProductsViewMode('grid')}
                      className="rounded-l-none"
                    >
                      <Grid className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            
            {products.length === 0 ? (
              <CardContent>
                <div className="text-center py-12">
                  <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900">No products found</h3>
                  <p className="text-gray-600 mt-2">
                    This category doesn't have any products yet.
                  </p>
                  <Link to={`/products/new?category=${category._id}`}>
                    <Button className="mt-4">
                      <Plus className="w-4 h-4 mr-2" />
                      Add First Product
                    </Button>
                  </Link>
                </div>
              </CardContent>
            ) : productsViewMode === 'grid' ? (
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {products.map((product) => (
                    <div key={product._id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="aspect-square bg-gray-100 rounded-lg mb-3 overflow-hidden">
                        {product.primaryImage || product.images?.[0] ? (
                          <img
                            src={product.primaryImage?.url || product.images[0].url}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <h4 className="font-medium text-gray-900 mb-1">{product.name}</h4>
                      <p className="text-sm text-gray-600 mb-2">{product.brand}</p>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-lg">{formatCurrency(product.sellingPrice)}</span>
                        <Link to={`/products/${product._id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            ) : (
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product._id}>
                        <TableCell>
                          <div className="flex items-center">
                            {product.primaryImage || product.images?.[0] ? (
                              <img
                                src={product.primaryImage?.url || product.images[0].url}
                                alt={product.name}
                                className="w-10 h-10 rounded object-cover mr-3"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center mr-3">
                                <Package className="w-5 h-5 text-gray-400" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-gray-900">{product.name}</p>
                              <p className="text-sm text-gray-500">{product.brand}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm">{product.sku}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{product.currentStock} {product.unit}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{formatCurrency(product.sellingPrice)}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            product.currentStock === 0 ? 'danger' :
                            product.currentStock <= product.minimumStock ? 'warning' : 'success'
                          }>
                            {product.currentStock === 0 ? 'Out of Stock' :
                             product.currentStock <= product.minimumStock ? 'Low Stock' : 'In Stock'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Link to={`/products/${product._id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};