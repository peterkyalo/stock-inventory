import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, Search, Filter, Edit, Trash2, Eye, Warehouse, Grid, List, SortAsc, SortDesc, Download, Upload,
  MapPin, Building, Store, Factory, MicOff as Office, Package, CheckCircle, XCircle, BarChart3, ArrowUpDown,
  Move, AlertTriangle, Archive, Box
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import { Select } from '../../components/UI/Select';
import { Badge } from '../../components/UI/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/UI/Table';
import { Modal } from '../../components/UI/Modal';
import { inventoryAPI } from '../../lib/api';
import { Location } from '../../types';
import { formatCurrency, formatDate, debounce } from '../../utils';
import toast from 'react-hot-toast';

export const LocationList: React.FC = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [showFilters, setShowFilters] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLocations, setTotalLocations] = useState(0);

  const [filters, setFilters] = useState({
    search: '',
    type: '',
    active: undefined as boolean | undefined,
    sortBy: 'name',
    sortOrder: 'asc' as 'asc' | 'desc'
  });

  const [locationData, setLocationData] = useState({
    name: '',
    code: '',
    type: 'warehouse',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: ''
    },
    contactPerson: {
      name: '',
      phone: '',
      email: ''
    },
    capacity: '',
    currentUtilization: '',
    notes: '',
    isActive: true
  });

  const [exportData, setExportData] = useState({
    format: 'csv',
    includeInactive: true
  });

  // Debounced search function
  const debouncedSearch = debounce((searchTerm: string) => {
    setFilters(prev => ({ ...prev, search: searchTerm }));
    setCurrentPage(1);
  }, 500);

  useEffect(() => {
    fetchLocations();
  }, [currentPage, filters]);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 12,
        ...filters,
        active: filters.active?.toString()
      };

      const response = await inventoryAPI.getLocations(params);
      setLocations(response.data.data);
      setTotalPages(response.data.pagination?.pages || 1);
      setTotalLocations(response.data.pagination?.total || 0);
    } catch (error) {
      toast.error('Failed to fetch locations');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLocation = async () => {
    try {
      if (!locationData.name || !locationData.code || !locationData.type) {
        toast.error('Please fill in all required fields');
        return;
      }

      // Format data
      const formattedData = {
        ...locationData,
        capacity: locationData.capacity ? parseInt(locationData.capacity) : undefined,
        currentUtilization: locationData.currentUtilization ? parseInt(locationData.currentUtilization) : undefined
      };

      if (editingLocation) {
        await inventoryAPI.updateLocation(editingLocation._id, formattedData);
        toast.success('Location updated successfully');
      } else {
        await inventoryAPI.createLocation(formattedData);
        toast.success('Location created successfully');
      }
      
      setShowLocationModal(false);
      resetLocationForm();
      fetchLocations();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save location');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this location?')) {
      try {
        await inventoryAPI.deleteLocation(id);
        toast.success('Location deleted successfully');
        fetchLocations();
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Failed to delete location');
      }
    }
  };

  const handleStatusToggle = async (id: string, currentStatus: boolean) => {
    try {
      await inventoryAPI.updateLocationStatus(id, !currentStatus);
      toast.success(`Location ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      fetchLocations();
    } catch (error) {
      toast.error('Failed to update location status');
    }
  };

  const handleExport = async () => {
    try {
      const response = await inventoryAPI.exportLocations({
        format: exportData.format,
        filters: {
          ...filters,
          active: exportData.includeInactive ? undefined : 'true'
        }
      });
      
      // Convert to CSV and download
      const csvContent = [
        Object.keys(response.data.data[0]).join(','),
        ...response.data.data.map((row: any) => Object.values(row).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `locations-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Locations exported successfully');
      setShowExportModal(false);
    } catch (error) {
      toast.error('Failed to export locations');
    }
  };

  const handleEditLocation = (location: Location) => {
    setEditingLocation(location);
    setLocationData({
      name: location.name,
      code: location.code,
      type: location.type,
      address: {
        street: location.address?.street || '',
        city: location.address?.city || '',
        state: location.address?.state || '',
        zipCode: location.address?.zipCode || '',
        country: location.address?.country || ''
      },
      contactPerson: {
        name: location.contactPerson?.name || '',
        phone: location.contactPerson?.phone || '',
        email: location.contactPerson?.email || ''
      },
      capacity: location.capacity?.toString() || '',
      currentUtilization: location.currentUtilization?.toString() || '',
      notes: location.notes || '',
      isActive: location.isActive
    });
    setShowLocationModal(true);
  };

  const resetLocationForm = () => {
    setEditingLocation(null);
    setLocationData({
      name: '',
      code: '',
      type: 'warehouse',
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: ''
      },
      contactPerson: {
        name: '',
        phone: '',
        email: ''
      },
      capacity: '',
      currentUtilization: '',
      notes: '',
      isActive: true
    });
  };

  const getLocationTypeIcon = (type: string) => {
    switch (type) {
      case 'warehouse':
        return <Warehouse className="w-5 h-5 text-blue-600" />;
      case 'store':
        return <Store className="w-5 h-5 text-green-600" />;
      case 'outlet':
        return <Building className="w-5 h-5 text-purple-600" />;
      case 'factory':
        return <Factory className="w-5 h-5 text-orange-600" />;
      case 'office':
        return <Office className="w-5 h-5 text-gray-600" />;
      default:
        return <MapPin className="w-5 h-5 text-gray-600" />;
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

  const getUtilizationBadge = (current: number, capacity: number | undefined) => {
    if (!capacity) return null;
    
    const percentage = Math.round((current / capacity) * 100);
    
    if (percentage >= 90) {
      return <Badge variant="danger" className="flex items-center gap-1">
        <AlertTriangle className="w-3 h-3" />
        {percentage}% Full
      </Badge>;
    } else if (percentage >= 70) {
      return <Badge variant="warning">
        {percentage}% Full
      </Badge>;
    } else {
      return <Badge variant="success">
        {percentage}% Full
      </Badge>;
    }
  };

  const typeOptions = [
    { value: '', label: 'All Types' },
    { value: 'warehouse', label: 'Warehouse' },
    { value: 'store', label: 'Store' },
    { value: 'outlet', label: 'Outlet' },
    { value: 'factory', label: 'Factory' },
    { value: 'office', label: 'Office' }
  ];

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'true', label: 'Active' },
    { value: 'false', label: 'Inactive' }
  ];

  const sortOptions = [
    { value: 'name', label: 'Name' },
    { value: 'code', label: 'Code' },
    { value: 'type', label: 'Type' },
    { value: 'currentUtilization', label: 'Utilization' },
    { value: 'createdAt', label: 'Date Created' }
  ];

  const LocationCard: React.FC<{ location: Location }> = ({ location }) => (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              {getLocationTypeIcon(location.type)}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{location.name}</h3>
              <p className="text-sm text-gray-500">{location.code}</p>
            </div>
          </div>
          <div>
            {getStatusBadge(location.isActive)}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Type:</span>
            <span className="text-sm font-medium capitalize">{location.type}</span>
          </div>
          
          {location.capacity && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Capacity:</span>
              <span className="text-sm font-medium">{location.capacity} units</span>
            </div>
          )}
          
          {location.capacity && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Utilization:</span>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">{location.currentUtilization} units</span>
                {getUtilizationBadge(location.currentUtilization, location.capacity)}
              </div>
            </div>
          )}
          
          {location.productCount !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Products:</span>
              <span className="text-sm font-medium">{location.productCount}</span>
            </div>
          )}
          
          {location.stockValue !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Stock Value:</span>
              <span className="text-sm font-medium">{formatCurrency(location.stockValue)}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 mt-4 border-t">
          <Link to={`/inventory/locations/${location._id}`}>
            <Button variant="ghost" size="sm">
              <Eye className="w-4 h-4" />
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEditLocation(location)}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleStatusToggle(location._id, location.isActive)}
          >
            {location.isActive ? (
              <XCircle className="w-4 h-4 text-red-500" />
            ) : (
              <CheckCircle className="w-4 h-4 text-green-500" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(location._id)}
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Locations</h1>
          <p className="text-gray-600">
            Manage your inventory storage locations ({totalLocations} locations)
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" onClick={() => setShowExportModal(true)}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Link to="/inventory/transfer">
            <Button variant="outline" size="sm">
              <Move className="w-4 h-4 mr-2" />
              Transfer Stock
            </Button>
          </Link>
          <Button onClick={() => {
            resetLocationForm();
            setShowLocationModal(true);
          }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Location
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Locations</p>
                <p className="text-2xl font-bold">{totalLocations}</p>
              </div>
              <MapPin className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Warehouses</p>
                <p className="text-2xl font-bold text-blue-600">
                  {locations.filter(l => l.type === 'warehouse').length}
                </p>
              </div>
              <Warehouse className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Stores</p>
                <p className="text-2xl font-bold text-green-600">
                  {locations.filter(l => l.type === 'store').length}
                </p>
              </div>
              <Store className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Other Locations</p>
                <p className="text-2xl font-bold text-purple-600">
                  {locations.filter(l => !['warehouse', 'store'].includes(l.type)).length}
                </p>
              </div>
              <Building className="w-8 h-8 text-purple-500" />
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
                  placeholder="Search locations by name or code..."
                  onChange={(e) => debouncedSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Select
                options={typeOptions}
                value={filters.type}
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                placeholder="Type"
              />
              
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
                  className="rounded-l-none"
                >
                  <Grid className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Additional filters can be added here */}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Locations Display */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
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
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {locations.map((location) => (
            <LocationCard key={location._id} location={location} />
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="w-5 h-5 mr-2" />
              Locations
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Location</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Utilization</TableHead>
                  <TableHead>Products</TableHead>
                  <TableHead>Stock Value</TableHead>
                  <TableHead>Recent Activity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.map((location) => (
                  <TableRow key={location._id}>
                    <TableCell>
                      <div className="flex items-center">
                        <div className="p-2 bg-gray-100 rounded-lg mr-3">
                          {getLocationTypeIcon(location.type)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{location.name}</p>
                          <p className="text-sm text-gray-500">{location.code}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="capitalize">{location.type}</span>
                    </TableCell>
                    <TableCell>
                      {location.capacity ? `${location.capacity} units` : 'Not set'}
                    </TableCell>
                    <TableCell>
                      {location.capacity ? (
                        <div>
                          <div className="flex items-center space-x-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  location.utilizationPercentage >= 90 ? 'bg-red-500' :
                                  location.utilizationPercentage >= 70 ? 'bg-yellow-500' : 'bg-green-500'
                                }`}
                                style={{ width: `${Math.min(location.utilizationPercentage || 0, 100)}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">
                              {location.utilizationPercentage}%
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {location.currentUtilization} / {location.capacity} units
                          </p>
                        </div>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{location.productCount || 0}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{formatCurrency(location.stockValue || 0)}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{location.recentMovements || 0}</span>
                      <p className="text-xs text-gray-500">movements (30d)</p>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(location.isActive)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Link to={`/inventory/locations/${location._id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditLocation(location)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStatusToggle(location._id, location.isActive)}
                        >
                          {location.isActive ? (
                            <XCircle className="w-4 h-4 text-red-500" />
                          ) : (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(location._id)}
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
            Page {currentPage} of {totalPages} ({totalLocations} total locations)
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

      {/* Location Modal */}
      <Modal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        title={editingLocation ? "Edit Location" : "Add New Location"}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Location Name *"
              value={locationData.name}
              onChange={(e) => setLocationData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter location name"
            />
            
            <Input
              label="Location Code *"
              value={locationData.code}
              onChange={(e) => setLocationData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
              placeholder="Enter location code (e.g., WH-001)"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Location Type *"
              options={[
                { value: 'warehouse', label: 'Warehouse' },
                { value: 'store', label: 'Store' },
                { value: 'outlet', label: 'Outlet' },
                { value: 'factory', label: 'Factory' },
                { value: 'office', label: 'Office' }
              ]}
              value={locationData.type}
              onChange={(e) => setLocationData(prev => ({ ...prev, type: e.target.value }))}
            />
            
            <div className="flex items-center space-x-2 pt-6">
              <input
                type="checkbox"
                id="isActive"
                checked={locationData.isActive}
                onChange={(e) => setLocationData(prev => ({ ...prev, isActive: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                Location is active
              </label>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Capacity (Units)"
              type="number"
              value={locationData.capacity}
              onChange={(e) => setLocationData(prev => ({ ...prev, capacity: e.target.value }))}
              placeholder="Enter storage capacity"
            />
            
            <Input
              label="Current Utilization (Units)"
              type="number"
              value={locationData.currentUtilization}
              onChange={(e) => setLocationData(prev => ({ ...prev, currentUtilization: e.target.value }))}
              placeholder="Enter current utilization"
            />
          </div>
          
          <div>
            <h3 className="text-md font-medium text-gray-900 mb-2">Address Information (Optional)</h3>
            <div className="space-y-4">
              <Input
                label="Street Address"
                value={locationData.address.street}
                onChange={(e) => setLocationData(prev => ({ 
                  ...prev, 
                  address: { ...prev.address, street: e.target.value } 
                }))}
                placeholder="Enter street address"
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="City"
                  value={locationData.address.city}
                  onChange={(e) => setLocationData(prev => ({ 
                    ...prev, 
                    address: { ...prev.address, city: e.target.value } 
                  }))}
                  placeholder="Enter city"
                />
                
                <Input
                  label="State/Province"
                  value={locationData.address.state}
                  onChange={(e) => setLocationData(prev => ({ 
                    ...prev, 
                    address: { ...prev.address, state: e.target.value } 
                  }))}
                  placeholder="Enter state or province"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="ZIP/Postal Code"
                  value={locationData.address.zipCode}
                  onChange={(e) => setLocationData(prev => ({ 
                    ...prev, 
                    address: { ...prev.address, zipCode: e.target.value } 
                  }))}
                  placeholder="Enter ZIP or postal code"
                />
                
                <Input
                  label="Country"
                  value={locationData.address.country}
                  onChange={(e) => setLocationData(prev => ({ 
                    ...prev, 
                    address: { ...prev.address, country: e.target.value } 
                  }))}
                  placeholder="Enter country"
                />
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-md font-medium text-gray-900 mb-2">Contact Person (Optional)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Name"
                value={locationData.contactPerson.name}
                onChange={(e) => setLocationData(prev => ({ 
                  ...prev, 
                  contactPerson: { ...prev.contactPerson, name: e.target.value } 
                }))}
                placeholder="Enter contact name"
              />
              
              <Input
                label="Phone"
                value={locationData.contactPerson.phone}
                onChange={(e) => setLocationData(prev => ({ 
                  ...prev, 
                  contactPerson: { ...prev.contactPerson, phone: e.target.value } 
                }))}
                placeholder="Enter contact phone"
              />
              
              <Input
                label="Email"
                type="email"
                value={locationData.contactPerson.email}
                onChange={(e) => setLocationData(prev => ({ 
                  ...prev, 
                  contactPerson: { ...prev.contactPerson, email: e.target.value } 
                }))}
                placeholder="Enter contact email"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={locationData.notes}
              onChange={(e) => setLocationData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Add notes about this location..."
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setShowLocationModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateLocation}>
              {editingLocation ? 'Update Location' : 'Create Location'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Export Modal */}
      <Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Export Locations"
        size="md"
      >
        <div className="space-y-4">
          <Select
            label="Export Format"
            options={[
              { value: 'csv', label: 'CSV' },
              { value: 'excel', label: 'Excel' },
              { value: 'pdf', label: 'PDF' }
            ]}
            value={exportData.format}
            onChange={(e) => setExportData(prev => ({ ...prev, format: e.target.value }))}
          />
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="includeInactive"
              checked={exportData.includeInactive}
              onChange={(e) => setExportData(prev => ({ ...prev, includeInactive: e.target.checked }))}
              className="rounded border-gray-300"
            />
            <label htmlFor="includeInactive" className="text-sm font-medium text-gray-700">
              Include inactive locations
            </label>
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setShowExportModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleExport}>
              Export
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};