import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Activity, Search, Filter, Download, Printer, RefreshCw, 
  ArrowLeft, Calendar, User, FileText, Package, 
  SortAsc, SortDesc, BarChart3, PieChart, Clock,
  Info, CheckCircle, XCircle, Eye, Edit, Trash2,
  LogIn, LogOut, Download as DownloadIcon, Upload
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import { Select } from '../../components/UI/Select';
import { Badge } from '../../components/UI/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/UI/Table';
import { reportsAPI, usersAPI } from '../../lib/api';
import { formatDate, debounce } from '../../utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import toast from 'react-hot-toast';

export const ActivityLogReport: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  
  const [logs, setLogs] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredLogs, setFilteredLogs] = useState<any[]>([]);
  
  const [filters, setFilters] = useState({
    startDate: queryParams.get('startDate') || '',
    endDate: queryParams.get('endDate') || '',
    user: queryParams.get('user') || '',
    action: queryParams.get('action') || '',
    resource: queryParams.get('resource') || '',
    limit: queryParams.get('limit') || '100'
  });

  // Debounced search function
  const debouncedSearch = debounce((searchTerm: string) => {
    if (!searchTerm) {
      setFilteredLogs(logs);
      return;
    }
    
    const filtered = logs.filter(log => 
      log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (typeof log.user === 'object' && 
        (`${log.user.firstName} ${log.user.lastName}`).toLowerCase().includes(searchTerm.toLowerCase()))
    );
    
    setFilteredLogs(filtered);
  }, 300);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [filters]);

  useEffect(() => {
    debouncedSearch(searchTerm);
  }, [searchTerm, logs]);

  const fetchUsers = async () => {
    try {
      const response = await usersAPI.getAll({ limit: 100 });
      setUsers(response.data.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      const response = await reportsAPI.getActivityLogReport(filters);
      setLogs(response.data.data.logs);
      setFilteredLogs(response.data.data.logs);
      setSummary(response.data.data.summary);
    } catch (error) {
      console.error('Failed to fetch activity log report:', error);
      toast.error('Failed to load activity log report');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    
    // Update URL query params
    const params = new URLSearchParams(location.search);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    navigate({ search: params.toString() });
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'create':
        return <Badge variant="success" className="flex items-center gap-1">
          <Plus className="w-3 h-3" />
          Create
        </Badge>;
      case 'read':
        return <Badge variant="default" className="flex items-center gap-1">
          <Eye className="w-3 h-3" />
          Read
        </Badge>;
      case 'update':
        return <Badge variant="info" className="flex items-center gap-1">
          <Edit className="w-3 h-3" />
          Update
        </Badge>;
      case 'delete':
        return <Badge variant="danger" className="flex items-center gap-1">
          <Trash2 className="w-3 h-3" />
          Delete
        </Badge>;
      case 'login':
        return <Badge variant="success" className="flex items-center gap-1">
          <LogIn className="w-3 h-3" />
          Login
        </Badge>;
      case 'logout':
        return <Badge variant="warning" className="flex items-center gap-1">
          <LogOut className="w-3 h-3" />
          Logout
        </Badge>;
      case 'export':
        return <Badge variant="info" className="flex items-center gap-1">
          <DownloadIcon className="w-3 h-3" />
          Export
        </Badge>;
      case 'import':
        return <Badge variant="info" className="flex items-center gap-1">
          <Upload className="w-3 h-3" />
          Import
        </Badge>;
      default:
        return <Badge variant="default">{action}</Badge>;
    }
  };

  const getResourceBadge = (resource: string) => {
    const variants = {
      user: { variant: 'default' as const, icon: User },
      product: { variant: 'info' as const, icon: Package },
      category: { variant: 'info' as const, icon: FileText },
      supplier: { variant: 'warning' as const, icon: Activity },
      customer: { variant: 'warning' as const, icon: User },
      purchase: { variant: 'success' as const, icon: Activity },
      sale: { variant: 'success' as const, icon: Activity },
      inventory: { variant: 'info' as const, icon: Package },
      stock_movement: { variant: 'info' as const, icon: Activity },
      location: { variant: 'info' as const, icon: Activity },
      settings: { variant: 'default' as const, icon: Activity }
    };
    
    const config = variants[resource as keyof typeof variants] || { variant: 'default' as const, icon: Activity };
    const Icon = config.icon;
    
    return <Badge variant={config.variant} className="flex items-center gap-1">
      <Icon className="w-3 h-3" />
      {resource.replace('_', ' ').charAt(0).toUpperCase() + resource.replace('_', ' ').slice(1)}
    </Badge>;
  };

  const actionOptions = [
    { value: '', label: 'All Actions' },
    { value: 'create', label: 'Create' },
    { value: 'read', label: 'Read' },
    { value: 'update', label: 'Update' },
    { value: 'delete', label: 'Delete' },
    { value: 'login', label: 'Login' },
    { value: 'logout', label: 'Logout' },
    { value: 'export', label: 'Export' },
    { value: 'import', label: 'Import' }
  ];

  const resourceOptions = [
    { value: '', label: 'All Resources' },
    { value: 'user', label: 'User' },
    { value: 'product', label: 'Product' },
    { value: 'category', label: 'Category' },
    { value: 'supplier', label: 'Supplier' },
    { value: 'customer', label: 'Customer' },
    { value: 'purchase', label: 'Purchase' },
    { value: 'sale', label: 'Sale' },
    { value: 'inventory', label: 'Inventory' },
    { value: 'stock_movement', label: 'Stock Movement' },
    { value: 'location', label: 'Location' },
    { value: 'settings', label: 'Settings' }
  ];

  const limitOptions = [
    { value: '50', label: 'Last 50' },
    { value: '100', label: 'Last 100' },
    { value: '200', label: 'Last 200' },
    { value: '500', label: 'Last 500' },
    { value: '1000', label: 'Last 1000' }
  ];

  // Prepare chart data
  const getActionChartData = () => {
    if (!summary) return [];
    
    return [
      { name: 'Create', value: summary.actionCounts.create, color: '#10B981' },
      { name: 'Read', value: summary.actionCounts.read, color: '#6B7280' },
      { name: 'Update', value: summary.actionCounts.update, color: '#3B82F6' },
      { name: 'Delete', value: summary.actionCounts.delete, color: '#EF4444' },
      { name: 'Login', value: summary.actionCounts.login, color: '#8B5CF6' },
      { name: 'Logout', value: summary.actionCounts.logout, color: '#F59E0B' },
      { name: 'Export', value: summary.actionCounts.export, color: '#0EA5E9' },
      { name: 'Import', value: summary.actionCounts.import, color: '#14B8A6' }
    ];
  };

  const getResourceChartData = () => {
    if (!summary) return [];
    
    return [
      { name: 'User', value: summary.resourceCounts.user, color: '#6B7280' },
      { name: 'Product', value: summary.resourceCounts.product, color: '#3B82F6' },
      { name: 'Category', value: summary.resourceCounts.category, color: '#8B5CF6' },
      { name: 'Supplier', value: summary.resourceCounts.supplier, color: '#F59E0B' },
      { name: 'Customer', value: summary.resourceCounts.customer, color: '#10B981' },
      { name: 'Purchase', value: summary.resourceCounts.purchase, color: '#0EA5E9' },
      { name: 'Sale', value: summary.resourceCounts.sale, color: '#14B8A6' },
      { name: 'Inventory', value: summary.resourceCounts.inventory, color: '#EF4444' },
      { name: 'Stock Movement', value: summary.resourceCounts.stock_movement, color: '#EC4899' },
      { name: 'Location', value: summary.resourceCounts.location, color: '#8B5CF6' },
      { name: 'Settings', value: summary.resourceCounts.settings, color: '#6B7280' }
    ];
  };

  const getUserActivityChartData = () => {
    if (!summary || !summary.userCounts) return [];
    
    return Object.entries(summary.userCounts).map(([userId, data]: [string, any], index) => ({
      name: data.name,
      count: data.count,
      color: [
        '#3B82F6', '#10B981', '#F59E0B', '#EF4444', 
        '#8B5CF6', '#EC4899', '#0EA5E9', '#14B8A6', 
        '#6B7280', '#D1D5DB'
      ][index % 10]
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => navigate('/reports')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Activity Log Report</h1>
            <p className="text-gray-600">
              Track user actions and system changes
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" onClick={() => fetchReport()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Logs</p>
                  <p className="text-2xl font-bold">{summary.totalLogs}</p>
                </div>
                <Activity className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Create Actions</p>
                  <p className="text-2xl font-bold text-green-600">{summary.actionCounts.create}</p>
                </div>
                <Plus className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Update Actions</p>
                  <p className="text-2xl font-bold text-blue-600">{summary.actionCounts.update}</p>
                </div>
                <Edit className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Delete Actions</p>
                  <p className="text-2xl font-bold text-red-600">{summary.actionCounts.delete}</p>
                </div>
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search activity logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select
              options={[
                { value: '', label: 'All Users' },
                ...users.map(user => ({ value: user.id, label: `${user.firstName} ${user.lastName}` }))
              ]}
              value={filters.user}
              onChange={(e) => handleFilterChange('user', e.target.value)}
              placeholder="Filter by user"
            />
            
            <Select
              options={actionOptions}
              value={filters.action}
              onChange={(e) => handleFilterChange('action', e.target.value)}
              placeholder="Filter by action"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <Select
              options={resourceOptions}
              value={filters.resource}
              onChange={(e) => handleFilterChange('resource', e.target.value)}
              placeholder="Filter by resource"
            />
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex justify-between items-center mt-4 pt-4 border-t">
            <div className="flex items-center space-x-2">
              <Select
                options={limitOptions}
                value={filters.limit}
                onChange={(e) => handleFilterChange('limit', e.target.value)}
                className="w-32"
              />
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFilters({
                  startDate: '',
                  endDate: '',
                  user: '',
                  action: '',
                  resource: '',
                  limit: '100'
                });
                navigate('/reports/activity-logs');
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Action Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Action Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={getActionChartData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => [value, 'Count']} />
                  <Bar dataKey="value" name="Count" fill="#3B82F6">
                    {getActionChartData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Resource Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChart className="w-5 h-5 mr-2" />
              Resource Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={getResourceChartData()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => 
                      percent > 0.05 ? `${name}: ${(percent * 100).toFixed(0)}%` : ''
                    }
                  >
                    {getResourceChartData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [value, 'Count']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Activity Chart */}
      {summary && summary.userCounts && Object.keys(summary.userCounts).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="w-5 h-5 mr-2" />
              User Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={getUserActivityChartData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => [value, 'Actions']} />
                  <Bar dataKey="count" name="Actions" fill="#3B82F6">
                    {getUserActivityChartData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="w-5 h-5 mr-2" />
            Activity Logs ({filteredLogs.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6">
              <div className="animate-pulse space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900">No activity logs found</h3>
              <p className="text-gray-600 mt-2">
                Try adjusting your filters or search criteria
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log._id}>
                    <TableCell>
                      {formatDate(log.timestamp)}
                      <div className="text-xs text-gray-500">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-2">
                          <User className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {typeof log.user === 'object' 
                              ? `${log.user.firstName} ${log.user.lastName}`
                              : 'Unknown User'
                            }
                          </p>
                          <p className="text-xs text-gray-500">
                            {typeof log.user === 'object' ? log.user.email : ''}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getActionBadge(log.action)}
                    </TableCell>
                    <TableCell>
                      {getResourceBadge(log.resource)}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{log.description}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-mono">{log.ipAddress || 'N/A'}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};