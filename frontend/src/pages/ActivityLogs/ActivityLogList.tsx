import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Activity, Search, Filter, Download, Printer, RefreshCw, 
  ArrowLeft, Calendar, User, FileText, Package, 
  SortAsc, SortDesc, BarChart3, PieChart, Clock,
  Info, CheckCircle, XCircle, Eye, Edit, Trash2,
  LogIn, LogOut, Download as DownloadIcon, Upload,
  Plus, AlertTriangle, Settings, MoreVertical
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import { Select } from '../../components/UI/Select';
import { Badge } from '../../components/UI/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/UI/Table';
import { Modal } from '../../components/UI/Modal';
import { activityLogsAPI, usersAPI } from '../../lib/api';
import { formatDate, formatDateTime, debounce } from '../../utils';
import toast from 'react-hot-toast';

export const ActivityLogList: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  
  const [logs, setLogs] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredLogs, setFilteredLogs] = useState<any[]>([]);
  const [showClearModal, setShowClearModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  
  const [filters, setFilters] = useState({
    startDate: queryParams.get('startDate') || '',
    endDate: queryParams.get('endDate') || '',
    user: queryParams.get('user') || '',
    action: queryParams.get('action') || '',
    resource: queryParams.get('resource') || '',
    limit: queryParams.get('limit') || '100',
    sortBy: queryParams.get('sortBy') || 'timestamp',
    sortOrder: queryParams.get('sortOrder') || 'desc'
  });

  const [exportData, setExportData] = useState({
    format: 'csv',
    includeAll: false,
    dateRange: '30days',
    customStartDate: '',
    customEndDate: ''
  });

  const [clearData, setClearData] = useState({
    olderThan: '30days'
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
    fetchLogs();
  }, [currentPage, filters]);

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

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        ...filters
      };

      const response = await activityLogsAPI.getAll(params);
      setLogs(response.data.data.logs);
      setFilteredLogs(response.data.data.logs);
      setSummary(response.data.data.summary);
      setTotalPages(response.data.pagination?.pages || 1);
      setTotalLogs(response.data.pagination?.total || 0);
    } catch (error) {
      console.error('Failed to fetch activity logs:', error);
      toast.error('Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      // Prepare date range based on selection
      let startDate = '';
      let endDate = '';
      
      const today = new Date();
      
      switch (exportData.dateRange) {
        case '7days':
          startDate = new Date(today.setDate(today.getDate() - 7)).toISOString().split('T')[0];
          endDate = new Date().toISOString().split('T')[0];
          break;
        case '30days':
          startDate = new Date(today.setDate(today.getDate() - 30)).toISOString().split('T')[0];
          endDate = new Date().toISOString().split('T')[0];
          break;
        case '90days':
          startDate = new Date(today.setDate(today.getDate() - 90)).toISOString().split('T')[0];
          endDate = new Date().toISOString().split('T')[0];
          break;
        case 'custom':
          startDate = exportData.customStartDate;
          endDate = exportData.customEndDate;
          break;
      }
      
      const response = await activityLogsAPI.export({
        format: exportData.format,
        filters: exportData.includeAll ? {} : {
          ...filters,
          startDate,
          endDate
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
      link.download = `activity-logs-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Activity logs exported successfully');
      setShowExportModal(false);
    } catch (error) {
      toast.error('Failed to export activity logs');
    }
  };

  const handleClearOldLogs = async () => {
    try {
      const response = await activityLogsAPI.clearOldLogs({
        olderThan: clearData.olderThan as '30days' | '90days' | '6months' | '1year'
      });
      
      toast.success(response.data.message);
      setShowClearModal(false);
      fetchLogs();
    } catch (error) {
      toast.error('Failed to clear old logs');
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
    
    // Update URL query params
    const params = new URLSearchParams(location.search);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    navigate({ search: params.toString() });
  };

  const handleViewLog = (log: any) => {
    setSelectedLog(log);
    setShowDetailModal(true);
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
      case 'approve':
        return <Badge variant="success" className="flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          Approve
        </Badge>;
      case 'reject':
        return <Badge variant="danger" className="flex items-center gap-1">
          <XCircle className="w-3 h-3" />
          Reject
        </Badge>;
      case 'cancel':
        return <Badge variant="danger" className="flex items-center gap-1">
          <XCircle className="w-3 h-3" />
          Cancel
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
      settings: { variant: 'default' as const, icon: Settings },
      activity_log: { variant: 'default' as const, icon: Activity }
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
    { value: 'import', label: 'Import' },
    { value: 'approve', label: 'Approve' },
    { value: 'reject', label: 'Reject' },
    { value: 'cancel', label: 'Cancel' }
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
    { value: 'settings', label: 'Settings' },
    { value: 'activity_log', label: 'Activity Log' }
  ];

  const limitOptions = [
    { value: '50', label: 'Last 50' },
    { value: '100', label: 'Last 100' },
    { value: '200', label: 'Last 200' },
    { value: '500', label: 'Last 500' },
    { value: '1000', label: 'Last 1000' }
  ];

  const sortOptions = [
    { value: 'timestamp', label: 'Date & Time' },
    { value: 'action', label: 'Action' },
    { value: 'resource', label: 'Resource' }
  ];

  const exportFormatOptions = [
    { value: 'csv', label: 'CSV' },
    { value: 'excel', label: 'Excel' },
    { value: 'pdf', label: 'PDF' }
  ];

  const dateRangeOptions = [
    { value: '7days', label: 'Last 7 Days' },
    { value: '30days', label: 'Last 30 Days' },
    { value: '90days', label: 'Last 90 Days' },
    { value: 'custom', label: 'Custom Range' }
  ];

  const clearPeriodOptions = [
    { value: '30days', label: 'Older than 30 days' },
    { value: '90days', label: 'Older than 90 days' },
    { value: '6months', label: 'Older than 6 months' },
    { value: '1year', label: 'Older than 1 year' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity Logs</h1>
          <p className="text-gray-600">
            Track user actions and system changes ({totalLogs} logs)
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" onClick={() => setShowExportModal(true)}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Link to="/activity/dashboard">
            <Button variant="outline" size="sm">
              <BarChart3 className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={() => setShowClearModal(true)}>
            <Trash2 className="w-4 h-4 mr-2" />
            Clear Old Logs
          </Button>
          <Button variant="outline" size="sm" onClick={() => fetchLogs()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              
              <Select
                options={sortOptions}
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="w-40"
              />
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleFilterChange('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {filters.sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
              </Button>
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
                  limit: '100',
                  sortBy: 'timestamp',
                  sortOrder: 'desc'
                });
                navigate('/activity');
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Activity Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="w-5 h-5 mr-2" />
            Activity Logs
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
                  <TableHead>Actions</TableHead>
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
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewLog(log)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-700">
            Page {currentPage} of {totalPages} ({totalLogs} total logs)
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

      {/* Export Modal */}
      <Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Export Activity Logs"
        size="md"
      >
        <div className="space-y-4">
          <Select
            label="Export Format"
            options={exportFormatOptions}
            value={exportData.format}
            onChange={(e) => setExportData(prev => ({ ...prev, format: e.target.value }))}
          />
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="includeAll"
              checked={exportData.includeAll}
              onChange={(e) => setExportData(prev => ({ ...prev, includeAll: e.target.checked }))}
              className="rounded border-gray-300"
            />
            <label htmlFor="includeAll" className="text-sm font-medium text-gray-700">
              Include all logs (ignore filters)
            </label>
          </div>
          
          {!exportData.includeAll && (
            <>
              <Select
                label="Date Range"
                options={dateRangeOptions}
                value={exportData.dateRange}
                onChange={(e) => setExportData(prev => ({ ...prev, dateRange: e.target.value }))}
              />
              
              {exportData.dateRange === 'custom' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <Input
                      type="date"
                      value={exportData.customStartDate}
                      onChange={(e) => setExportData(prev => ({ ...prev, customStartDate: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <Input
                      type="date"
                      value={exportData.customEndDate}
                      onChange={(e) => setExportData(prev => ({ ...prev, customEndDate: e.target.value }))}
                    />
                  </div>
                </div>
              )}
            </>
          )}
          
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

      {/* Clear Logs Modal */}
      <Modal
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        title="Clear Old Activity Logs"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-900">Warning</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  This action will permanently delete old activity logs. This cannot be undone.
                  Please make sure you have exported any logs you want to keep.
                </p>
              </div>
            </div>
          </div>
          
          <Select
            label="Delete Logs"
            options={clearPeriodOptions}
            value={clearData.olderThan}
            onChange={(e) => setClearData({ olderThan: e.target.value })}
          />
          
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setShowClearModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleClearOldLogs}>
              Clear Logs
            </Button>
          </div>
        </div>
      </Modal>

      {/* Log Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="Activity Log Details"
        size="lg"
      >
        {selectedLog && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Basic Information</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Timestamp:</span>
                    <span className="font-medium">{formatDateTime(selectedLog.timestamp)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">User:</span>
                    <span className="font-medium">
                      {typeof selectedLog.user === 'object' 
                        ? `${selectedLog.user.firstName} ${selectedLog.user.lastName}`
                        : 'Unknown User'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Action:</span>
                    <span>{getActionBadge(selectedLog.action)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Resource:</span>
                    <span>{getResourceBadge(selectedLog.resource)}</span>
                  </div>
                  {selectedLog.resourceId && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Resource ID:</span>
                      <span className="font-mono text-sm">{selectedLog.resourceId}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Additional Details</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">IP Address:</span>
                    <span className="font-mono text-sm">{selectedLog.ipAddress || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">User Agent:</span>
                    <span className="text-sm truncate max-w-xs">{selectedLog.userAgent || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Log ID:</span>
                    <span className="font-mono text-sm">{selectedLog._id}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Description</h3>
              <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{selectedLog.description}</p>
            </div>
            
            {selectedLog.changes && (
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Changes</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-red-50 p-3 rounded-lg">
                    <h4 className="text-sm font-medium text-red-900 mb-2">Before</h4>
                    <pre className="text-xs text-red-800 overflow-auto max-h-40">
                      {JSON.stringify(selectedLog.changes.before, null, 2)}
                    </pre>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <h4 className="text-sm font-medium text-green-900 mb-2">After</h4>
                    <pre className="text-xs text-green-800 overflow-auto max-h-40">
                      {JSON.stringify(selectedLog.changes.after, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setShowDetailModal(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};