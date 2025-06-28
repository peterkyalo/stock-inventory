import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Activity, User, Calendar, Clock, FileText, 
  Package, BarChart3, PieChart, TrendingUp, TrendingDown,
  Plus, Edit, Trash2, LogIn, LogOut, Download, Upload,
  RefreshCw, ArrowLeft, Filter, Search, Settings,
  CheckCircle, XCircle, AlertTriangle, Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import { Select } from '../../components/UI/Select';
import { Badge } from '../../components/UI/Badge';
import { activityLogsAPI, usersAPI } from '../../lib/api';
import { formatDate } from '../../utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Pie, Cell, Legend, LineChart, Line, Area, AreaChart } from 'recharts';
import toast from 'react-hot-toast';

export const ActivityLogDashboard: React.FC = () => {
  const navigate = useNavigate();
  
  const [summary, setSummary] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState<'bar' | 'line' | 'area'>('bar');
  
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    period: '30days'
  });

  useEffect(() => {
    fetchUsers();
    fetchSummary();
  }, [filters]);

  const fetchUsers = async () => {
    try {
      const response = await usersAPI.getAll({ limit: 100 });
      setUsers(response.data.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchSummary = async () => {
    try {
      setLoading(true);
      
      // Calculate date range based on period
      let startDate = '';
      let endDate = '';
      
      if (filters.startDate && filters.endDate) {
        startDate = filters.startDate;
        endDate = filters.endDate;
      } else {
        const today = new Date();
        endDate = today.toISOString().split('T')[0];
        
        switch (filters.period) {
          case '7days':
            const sevenDaysAgo = new Date(today);
            sevenDaysAgo.setDate(today.getDate() - 7);
            startDate = sevenDaysAgo.toISOString().split('T')[0];
            break;
          case '30days':
            const thirtyDaysAgo = new Date(today);
            thirtyDaysAgo.setDate(today.getDate() - 30);
            startDate = thirtyDaysAgo.toISOString().split('T')[0];
            break;
          case '90days':
            const ninetyDaysAgo = new Date(today);
            ninetyDaysAgo.setDate(today.getDate() - 90);
            startDate = ninetyDaysAgo.toISOString().split('T')[0];
            break;
          case '1year':
            const oneYearAgo = new Date(today);
            oneYearAgo.setFullYear(today.getFullYear() - 1);
            startDate = oneYearAgo.toISOString().split('T')[0];
            break;
        }
      }
      
      const response = await activityLogsAPI.getSummary({
        startDate,
        endDate
      });
      
      setSummary(response.data.data);
    } catch (error) {
      console.error('Failed to fetch activity summary:', error);
      toast.error('Failed to load activity summary');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchSummary();
    toast.success('Dashboard data refreshed');
  };

  const handlePeriodChange = (period: string) => {
    setFilters(prev => ({
      ...prev,
      period,
      startDate: '',
      endDate: ''
    }));
  };

  const handleDateChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Prepare chart data
  const getActionChartData = () => {
    if (!summary || !summary.actionCounts) return [];
    
    return Object.entries(summary.actionCounts).map(([action, count]: [string, any]) => ({
      name: action.charAt(0).toUpperCase() + action.slice(1),
      value: count,
      color: getActionColor(action)
    }));
  };

  const getResourceChartData = () => {
    if (!summary || !summary.resourceCounts) return [];
    
    return Object.entries(summary.resourceCounts)
      .filter(([_, count]: [string, any]) => count > 0)
      .map(([resource, count]: [string, any]) => ({
        name: resource.replace('_', ' ').charAt(0).toUpperCase() + resource.replace('_', ' ').slice(1),
        value: count,
        color: getResourceColor(resource)
      }));
  };

  const getActivityByDateData = () => {
    if (!summary || !summary.activityByDate) return [];
    
    return summary.activityByDate.map((item: any) => ({
      date: item._id,
      total: item.count,
      create: item.createCount,
      update: item.updateCount,
      delete: item.deleteCount,
      read: item.readCount
    }));
  };

  const getTopUsersData = () => {
    if (!summary || !summary.topUsers) return [];
    
    return summary.topUsers.map((user: any, index: number) => ({
      name: user.name,
      value: user.count,
      color: [
        '#3B82F6', '#10B981', '#F59E0B', '#EF4444', 
        '#8B5CF6', '#EC4899', '#0EA5E9', '#14B8A6', 
        '#6B7280', '#D1D5DB'
      ][index % 10]
    }));
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create': return '#10B981'; // green
      case 'read': return '#6B7280'; // gray
      case 'update': return '#3B82F6'; // blue
      case 'delete': return '#EF4444'; // red
      case 'login': return '#8B5CF6'; // purple
      case 'logout': return '#F59E0B'; // yellow
      case 'export': return '#0EA5E9'; // light blue
      case 'import': return '#14B8A6'; // teal
      case 'approve': return '#10B981'; // green
      case 'reject': return '#EF4444'; // red
      case 'cancel': return '#F59E0B'; // yellow
      default: return '#6B7280'; // gray
    }
  };

  const getResourceColor = (resource: string) => {
    switch (resource) {
      case 'user': return '#6B7280'; // gray
      case 'product': return '#3B82F6'; // blue
      case 'category': return '#8B5CF6'; // purple
      case 'supplier': return '#F59E0B'; // yellow
      case 'customer': return '#10B981'; // green
      case 'purchase': return '#0EA5E9'; // light blue
      case 'sale': return '#14B8A6'; // teal
      case 'inventory': return '#EF4444'; // red
      case 'stock_movement': return '#EC4899'; // pink
      case 'location': return '#8B5CF6'; // purple
      case 'settings': return '#6B7280'; // gray
      case 'activity_log': return '#6B7280'; // gray
      default: return '#6B7280'; // gray
    }
  };

  const periodOptions = [
    { value: '7days', label: 'Last 7 Days' },
    { value: '30days', label: 'Last 30 Days' },
    { value: '90days', label: 'Last 90 Days' },
    { value: '1year', label: 'Last Year' },
    { value: 'custom', label: 'Custom Range' }
  ];

  if (loading && !summary) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => navigate('/activity')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Activity Dashboard</h1>
            <p className="text-gray-600">
              Analyze user activity and system changes
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Link to="/activity">
            <Button variant="outline" size="sm">
              <Activity className="w-4 h-4 mr-2" />
              View Logs
            </Button>
          </Link>
        </div>
      </div>

      {/* Date Range Selector */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <Select
                label="Time Period"
                options={periodOptions}
                value={filters.period}
                onChange={(e) => handlePeriodChange(e.target.value)}
              />
            </div>
            
            {filters.period === 'custom' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <Input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => handleDateChange('startDate', e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <Input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => handleDateChange('endDate', e.target.value)}
                  />
                </div>
              </>
            )}
            
            <div className="flex items-center space-x-2">
              <Button
                variant={chartType === 'bar' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('bar')}
              >
                <BarChart3 className="w-4 h-4" />
              </Button>
              <Button
                variant={chartType === 'line' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('line')}
              >
                <TrendingUp className="w-4 h-4" />
              </Button>
              <Button
                variant={chartType === 'area' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('area')}
              >
                <PieChart className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

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
                  <p className="text-2xl font-bold text-green-600">
                    {summary.actionCounts?.find((a: any) => a._id === 'create')?.count || 0}
                  </p>
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
                  <p className="text-2xl font-bold text-blue-600">
                    {summary.actionCounts?.find((a: any) => a._id === 'update')?.count || 0}
                  </p>
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
                  <p className="text-2xl font-bold text-red-600">
                    {summary.actionCounts?.find((a: any) => a._id === 'delete')?.count || 0}
                  </p>
                </div>
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity by Date Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Activity Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'bar' ? (
                  <BarChart data={getActivityByDateData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="total" name="Total" fill="#3B82F6" />
                    <Bar dataKey="create" name="Create" fill="#10B981" />
                    <Bar dataKey="update" name="Update" fill="#F59E0B" />
                    <Bar dataKey="delete" name="Delete" fill="#EF4444" />
                  </BarChart>
                ) : chartType === 'line' ? (
                  <LineChart data={getActivityByDateData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="total" name="Total" stroke="#3B82F6" strokeWidth={2} />
                    <Line type="monotone" dataKey="create" name="Create" stroke="#10B981" strokeWidth={2} />
                    <Line type="monotone" dataKey="update" name="Update" stroke="#F59E0B" strokeWidth={2} />
                    <Line type="monotone" dataKey="delete" name="Delete" stroke="#EF4444" strokeWidth={2} />
                  </LineChart>
                ) : (
                  <AreaChart data={getActivityByDateData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="total" name="Total" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
                    <Area type="monotone" dataKey="create" name="Create" stroke="#10B981" fill="#10B981" fillOpacity={0.3} />
                    <Area type="monotone" dataKey="update" name="Update" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.3} />
                    <Area type="monotone" dataKey="delete" name="Delete" stroke="#EF4444" fill="#EF4444" fillOpacity={0.3} />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Users Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="w-5 h-5 mr-2" />
              Top Active Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={getTopUsersData()} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => [value, 'Activities']} />
                  <Bar dataKey="value" name="Activities">
                    {getTopUsersData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action and Resource Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Action Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              Action Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={getActionChartData()}
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
                    {getActionChartData().map((entry, index) => (
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

        {/* Resource Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Package className="w-5 h-5 mr-2" />
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

      {/* Activity Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Info className="w-5 h-5 mr-2" />
            Activity Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Top Actions</h3>
              <div className="space-y-2">
                {summary?.actionCounts?.slice(0, 5).map((action: any) => (
                  <div key={action._id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${getActionColor(action._id)}20` }}>
                        {action._id === 'create' && <Plus className="w-4 h-4" style={{ color: getActionColor(action._id) }} />}
                        {action._id === 'update' && <Edit className="w-4 h-4" style={{ color: getActionColor(action._id) }} />}
                        {action._id === 'delete' && <Trash2 className="w-4 h-4" style={{ color: getActionColor(action._id) }} />}
                        {action._id === 'read' && <FileText className="w-4 h-4" style={{ color: getActionColor(action._id) }} />}
                        {action._id === 'login' && <LogIn className="w-4 h-4" style={{ color: getActionColor(action._id) }} />}
                        {action._id === 'logout' && <LogOut className="w-4 h-4" style={{ color: getActionColor(action._id) }} />}
                        {action._id === 'export' && <Download className="w-4 h-4" style={{ color: getActionColor(action._id) }} />}
                        {action._id === 'import' && <Upload className="w-4 h-4" style={{ color: getActionColor(action._id) }} />}
                      </div>
                      <span className="ml-2 font-medium capitalize">{action._id}</span>
                    </div>
                    <span className="font-bold">{action.count}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Top Resources</h3>
              <div className="space-y-2">
                {summary?.resourceCounts?.slice(0, 5).map((resource: any) => (
                  <div key={resource._id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${getResourceColor(resource._id)}20` }}>
                        {resource._id === 'user' && <User className="w-4 h-4" style={{ color: getResourceColor(resource._id) }} />}
                        {resource._id === 'product' && <Package className="w-4 h-4" style={{ color: getResourceColor(resource._id) }} />}
                        {resource._id === 'category' && <FileText className="w-4 h-4" style={{ color: getResourceColor(resource._id) }} />}
                        {resource._id === 'supplier' && <Activity className="w-4 h-4" style={{ color: getResourceColor(resource._id) }} />}
                        {resource._id === 'customer' && <User className="w-4 h-4" style={{ color: getResourceColor(resource._id) }} />}
                        {resource._id === 'purchase' && <Activity className="w-4 h-4" style={{ color: getResourceColor(resource._id) }} />}
                        {resource._id === 'sale' && <Activity className="w-4 h-4" style={{ color: getResourceColor(resource._id) }} />}
                        {resource._id === 'inventory' && <Package className="w-4 h-4" style={{ color: getResourceColor(resource._id) }} />}
                        {resource._id === 'stock_movement' && <Activity className="w-4 h-4" style={{ color: getResourceColor(resource._id) }} />}
                        {resource._id === 'location' && <Activity className="w-4 h-4" style={{ color: getResourceColor(resource._id) }} />}
                        {resource._id === 'settings' && <Settings className="w-4 h-4" style={{ color: getResourceColor(resource._id) }} />}
                      </div>
                      <span className="ml-2 font-medium capitalize">{resource._id.replace('_', ' ')}</span>
                    </div>
                    <span className="font-bold">{resource.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">Activity Analysis</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    This dashboard shows activity patterns for the period from {summary?.dateRange?.start ? formatDate(summary.dateRange.start) : 'start'} to {summary?.dateRange?.end ? formatDate(summary.dateRange.end) : 'now'}.
                    {summary?.totalLogs > 0 ? (
                      <>
                        {' '}During this period, there were {summary.totalLogs} activities recorded in the system.
                        {summary.actionCounts?.length > 0 && ` The most common action was "${summary.actionCounts[0]._id}" with ${summary.actionCounts[0].count} occurrences.`}
                        {summary.resourceCounts?.length > 0 && ` The most accessed resource was "${summary.resourceCounts[0]._id.replace('_', ' ')}" with ${summary.resourceCounts[0].count} activities.`}
                      </>
                    ) : (
                      ' No activities were recorded during this period.'
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <div className="p-3 rounded-lg bg-blue-500">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">View All Logs</h3>
                <p className="text-sm text-gray-600 mt-1">Browse and search through all activity logs</p>
                <Link to="/activity">
                  <Button variant="outline" size="sm" className="mt-3 w-full">
                    View Logs
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <div className="p-3 rounded-lg bg-green-500">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">User Activity</h3>
                <p className="text-sm text-gray-600 mt-1">View activity logs filtered by specific users</p>
                <Select
                  options={[
                    { value: '', label: 'Select a user' },
                    ...users.map(user => ({ value: user.id, label: `${user.firstName} ${user.lastName}` }))
                  ]}
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      navigate(`/activity?user=${e.target.value}`);
                    }
                  }}
                  className="mt-3"
                />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <div className="p-3 rounded-lg bg-purple-500">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Advanced Reports</h3>
                <p className="text-sm text-gray-600 mt-1">View detailed activity reports and analytics</p>
                <Link to="/reports/activity-logs">
                  <Button variant="outline" size="sm" className="mt-3 w-full">
                    View Reports
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};