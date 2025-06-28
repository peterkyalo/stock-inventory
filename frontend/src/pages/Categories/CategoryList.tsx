import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, Search, Filter, Edit, Trash2, Eye, Tag, 
  Grid, List, SortAsc, SortDesc, Download, Upload,
  Package, FolderTree, MoreVertical, Image as ImageIcon,
  ArrowUp, ArrowDown, Move
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import { Select } from '../../components/UI/Select';
import { Badge } from '../../components/UI/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/UI/Table';
import { Modal } from '../../components/UI/Modal';
import { categoriesAPI } from '../../lib/api';
import { Category } from '../../types';
import { formatDate, debounce } from '../../utils';
import toast from 'react-hot-toast';

export const CategoryList: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'tree'>('list');
  const [showFilters, setShowFilters] = useState(false);
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCategories, setTotalCategories] = useState(0);

  const [filters, setFilters] = useState({
    search: '',
    active: undefined as boolean | undefined,
    parentOnly: false,
    sortBy: 'name',
    sortOrder: 'asc' as 'asc' | 'desc'
  });

  // Debounced search function
  const debouncedSearch = debounce((searchTerm: string) => {
    setFilters(prev => ({ ...prev, search: searchTerm }));
    setCurrentPage(1);
  }, 500);

  useEffect(() => {
    fetchCategories();
  }, [currentPage, filters]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 20,
        ...filters,
        withHierarchy: viewMode === 'tree'
      };

      const response = await categoriesAPI.getAll(params);
      setCategories(response.data.data);
      setTotalPages(response.data.pagination?.pages || 1);
      setTotalCategories(response.data.pagination?.total || 0);
    } catch (error) {
      toast.error('Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        await categoriesAPI.delete(id);
        toast.success('Category deleted successfully');
        fetchCategories();
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Failed to delete category');
      }
    }
  };

  const handleReorder = async (reorderedCategories: { id: string; sortOrder: number }[]) => {
    try {
      await categoriesAPI.bulkReorder(reorderedCategories);
      toast.success('Categories reordered successfully');
      setShowReorderModal(false);
      fetchCategories();
    } catch (error) {
      toast.error('Failed to reorder categories');
    }
  };

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'true', label: 'Active' },
    { value: 'false', label: 'Inactive' }
  ];

  const sortOptions = [
    { value: 'name', label: 'Name' },
    { value: 'sortOrder', label: 'Sort Order' },
    { value: 'productCount', label: 'Product Count' },
    { value: 'createdAt', label: 'Date Created' }
  ];

  const CategoryCard: React.FC<{ category: Category }> = ({ category }) => (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            {category.image ? (
              <img
                src={category.image}
                alt={category.name}
                className="w-10 h-10 rounded-lg object-cover"
              />
            ) : (
              <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                <Tag className="w-5 h-5 text-gray-400" />
              </div>
            )}
            <div>
              <h3 className="font-semibold text-gray-900">{category.name}</h3>
              {category.parentCategory && (
                <p className="text-sm text-gray-500">
                  Parent: {typeof category.parentCategory === 'object' 
                    ? category.parentCategory.name 
                    : category.parentCategory}
                </p>
              )}
            </div>
          </div>
          <Button variant="ghost" size="sm">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>

        {category.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{category.description}</p>
        )}

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <p className="text-lg font-bold text-blue-600">{category.productCount || 0}</p>
              <p className="text-xs text-gray-500">Products</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-green-600">{category.subcategoryCount || 0}</p>
              <p className="text-xs text-gray-500">Subcategories</p>
            </div>
          </div>
          <Badge variant={category.isActive ? 'success' : 'danger'}>
            {category.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <Link to={`/categories/${category._id}`}>
            <Button variant="ghost" size="sm">
              <Eye className="w-4 h-4" />
            </Button>
          </Link>
          <Link to={`/categories/${category._id}/edit`}>
            <Button variant="ghost" size="sm">
              <Edit className="w-4 h-4" />
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(category._id)}
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const TreeView: React.FC<{ categories: Category[]; level?: number }> = ({ categories, level = 0 }) => (
    <div className={`${level > 0 ? 'ml-6 border-l border-gray-200 pl-4' : ''}`}>
      {categories.map((category) => (
        <div key={category._id} className="mb-2">
          <div className="flex items-center justify-between p-3 bg-white rounded-lg border hover:shadow-sm">
            <div className="flex items-center space-x-3">
              {category.image ? (
                <img
                  src={category.image}
                  alt={category.name}
                  className="w-8 h-8 rounded object-cover"
                />
              ) : (
                <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center">
                  <Tag className="w-4 h-4 text-gray-400" />
                </div>
              )}
              <div>
                <h4 className="font-medium text-gray-900">{category.name}</h4>
                <p className="text-sm text-gray-500">
                  {category.productCount || 0} products • {category.subcategoryCount || 0} subcategories
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={category.isActive ? 'success' : 'danger'} size="sm">
                {category.isActive ? 'Active' : 'Inactive'}
              </Badge>
              <div className="flex items-center space-x-1">
                <Link to={`/categories/${category._id}`}>
                  <Button variant="ghost" size="sm">
                    <Eye className="w-4 h-4" />
                  </Button>
                </Link>
                <Link to={`/categories/${category._id}/edit`}>
                  <Button variant="ghost" size="sm">
                    <Edit className="w-4 h-4" />
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(category._id)}
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </div>
          </div>
          {category.subcategories && category.subcategories.length > 0 && (
            <TreeView categories={category.subcategories} level={level + 1} />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-gray-600">
            Manage your product categories ({totalCategories} categories)
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowReorderModal(true)}>
            <Move className="w-4 h-4 mr-2" />
            Reorder
          </Button>
          <Link to="/categories/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Category
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Categories</p>
                <p className="text-2xl font-bold">{totalCategories}</p>
              </div>
              <Tag className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Categories</p>
                <p className="text-2xl font-bold text-green-600">
                  {categories.filter(c => c.isActive).length}
                </p>
              </div>
              <Package className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Parent Categories</p>
                <p className="text-2xl font-bold text-purple-600">
                  {categories.filter(c => !c.parentCategory).length}
                </p>
              </div>
              <FolderTree className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Subcategories</p>
                <p className="text-2xl font-bold text-orange-600">
                  {categories.filter(c => c.parentCategory).length}
                </p>
              </div>
              <ArrowDown className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search categories by name..."
                  onChange={(e) => debouncedSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Select
                options={statusOptions}
                value={filters.active?.toString() || ''}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  active: e.target.value ? e.target.value === 'true' : undefined 
                }))}
                placeholder="Status"
              />
              
              <Select
                options={sortOptions}
                value={filters.sortBy}
                onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
              />
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters(prev => ({ 
                  ...prev, 
                  sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc' 
                }))}
              >
                {filters.sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
              
              <div className="flex items-center border rounded-lg">
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-r-none"
                >
                  <List className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-none"
                >
                  <Grid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'tree' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('tree')}
                  className="rounded-l-none"
                >
                  <FolderTree className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="parentOnly"
                  checked={filters.parentOnly}
                  onChange={(e) => setFilters(prev => ({ ...prev, parentOnly: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <label htmlFor="parentOnly" className="text-sm text-gray-700">
                  Show parent categories only
                </label>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Categories Display */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="animate-pulse space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : viewMode === 'tree' ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FolderTree className="w-5 h-5 mr-2" />
              Category Hierarchy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TreeView categories={categories.filter(c => !c.parentCategory)} />
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <CategoryCard key={category._id} category={category} />
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Tag className="w-5 h-5 mr-2" />
              Categories
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Parent Category</TableHead>
                  <TableHead>Products</TableHead>
                  <TableHead>Subcategories</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category._id}>
                    <TableCell>
                      <div className="flex items-center">
                        {category.image ? (
                          <img
                            src={category.image}
                            alt={category.name}
                            className="w-10 h-10 rounded-lg object-cover mr-3"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center mr-3">
                            <Tag className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{category.name}</p>
                          {category.description && (
                            <p className="text-sm text-gray-500 truncate max-w-xs">
                              {category.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {category.parentCategory ? (
                        typeof category.parentCategory === 'object' 
                          ? category.parentCategory.name 
                          : category.parentCategory
                      ) : (
                        <span className="text-gray-400">Root Category</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{category.productCount || 0}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{category.subcategoryCount || 0}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={category.isActive ? 'success' : 'danger'}>
                        {category.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {formatDate(category.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Link to={`/categories/${category._id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Link to={`/categories/${category._id}/edit`}>
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(category._id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-700">
            Page {currentPage} of {totalPages} ({totalCategories} total categories)
          </p>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Reorder Modal */}
      <Modal
        isOpen={showReorderModal}
        onClose={() => setShowReorderModal(false)}
        title="Reorder Categories"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Drag and drop categories to reorder them. This will affect the display order in your application.
          </p>
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {categories.map((category, index) => (
              <div
                key={category._id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex flex-col space-y-1">
                    <Button variant="ghost" size="sm">
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <ArrowDown className="w-4 h-4" />
                    </Button>
                  </div>
                  <span className="font-medium">{category.name}</span>
                </div>
                <span className="text-sm text-gray-500">Order: {category.sortOrder}</span>
              </div>
            ))}
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setShowReorderModal(false)}>
              Cancel
            </Button>
            <Button onClick={() => handleReorder(categories.map((cat, index) => ({ 
              id: cat._id, 
              sortOrder: index 
            })))}>
              Save Order
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};