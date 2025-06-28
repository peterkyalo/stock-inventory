import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, Edit, Trash2, User as UserIcon, Mail, Phone, 
  MapPin, Shield, Calendar, Activity, Key, Settings,
  CheckCircle, XCircle, Download, Share2, Lock, UserCog,
  BarChart3, Clock, FileText, Plus, Eye, Package, AlertTriangle,
  Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Badge } from '../../components/UI/Badge';
import { Modal } from '../../components/UI/Modal';
import { Input } from '../../components/UI/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/UI/Table';
import { usersAPI } from '../../lib/api';
import { User, ActivityLog } from '../../types';
import { formatDate } from '../../utils';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Pie, Cell, Legend } from 'recharts';

export const UserDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [user, setUser] = useState<User | null>(null);
  const [activityStats, setActivityStats] = useState<any>(null);
  const [userActivity, setUserActivity] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [permissionsData, setPermissionsData] = useState<{
    userPermissions: any[];
    role: string;
  }>({
    userPermissions: [],
    role: ''
  });

  useEffect(() => {
    if (id) {
      fetchUser(id);
      fetchUserActivity(id);
    }
  }, [id]);

  const fetchUser = async (userId: string) => {
    try {
      setLoading(true);
      const response = await usersAPI.getById(userId);
      setUser(response.data.data.user);
      setActivityStats(response.data.data.activityStats);
    } catch (error) {
      toast.error('Failed to fetch user details');
      navigate('/users');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserActivity = async (userId: string) => {
    try {
      const response = await usersAPI.getUserActivity(userId);
      setUserActivity(response.data.data);
    } catch (error) {
      console.error('Failed to fetch user activity');
    }
  };

  const fetchUserPermissions = async (userId: string) => {
    try {
      const response = await usersAPI.getUserPermissions(userId);
      setPermissionsData({
        userPermissions: response.data.data.userPermissions,
        role: response.data.data.role
      });
    } catch (error) {
      console.error('Failed to fetch user permissions');
      toast.error('Failed to load user permissions');
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await usersAPI.delete(user.id);
        toast.success('User deleted successfully');
        navigate('/users');
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Failed to delete user');
      }
    }
  };

  const handleStatusToggle = async () => {
    if (!user) return;

    try {
      await usersAPI.updateStatus(user.id, !user.isActive);
      toast.success(`User ${!user.isActive ? 'activated' : 'deactivated'} successfully`);
      fetchUser(user.id);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update user status');
    }
  };

  const handlePasswordUpdate = async () => {
    if (!user) return;

    if (passwordData.password !== passwordData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      await usersAPI.updatePassword(user.id, {
        password: passwordData.password
      });
      
      toast.success('Password updated successfully');
      setShowPasswordModal(false);
      setPasswordData({
        password: '',
        confirmPassword: ''
      });
    } catch (error) {
      toast.error('Failed to update password');
    }
  };

  const handlePermissionsUpdate = async () => {
    if (!user) return;

    try {
      // Extract granted permissions
      const grantedPermissions = permissionsData.userPermissions.flatMap(group => 
        group.permissions
          .filter((p: any) => p.granted)
          .map((p: any) => p.name)
      );

      await usersAPI.updatePermissions(user.id, {
        permissions: grantedPermissions
      });
      
      toast.success('Permissions updated successfully');
      setShowPermissionsModal(false);
      fetchUser(user.id);
    } catch (error) {
      toast.error('Failed to update permissions');
    }
  };

  const handleTogglePermission = (groupIndex: number, permissionIndex: number) => {
    const updatedPermissions = [...permissionsData.userPermissions];
    const permission = updatedPermissions[groupIndex].permissions[permissionIndex];
    permission.granted = !permission.granted;
    
    setPermissionsData(prev => ({
      ...prev,
      userPermissions: updatedPermissions
    }));
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

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge variant="danger" className="flex items-center gap-1">
          <Shield className="w-3 h-3" />
          Admin
        </Badge>;
      case 'manager':
        return <Badge variant="warning" className="flex items-center gap-1">
          <UserCog className="w-3 h-3" />
          Manager
        </Badge>;
      case 'staff':
        return <Badge variant="info" className="flex items-center gap-1">
          <UserIcon className="w-3 h-3" />
          Staff
        </Badge>;
      default:
        return <Badge variant="default">{role}</Badge>;
    }
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
      default:
        return <Badge variant="default">{action}</Badge>;
    }
  };

  const getResourceBadge = (resource: string) => {
    const variants = {
      user: { variant: 'default' as const, icon: UserIcon },
      product: { variant: 'info' as const, icon: Package },
      category: { variant: 'info' as const, icon: FileText },
      supplier: { variant: 'warning' as const, icon: Activity },
      customer: { variant: 'warning' as const, icon: UserIcon },
      purchase: { variant: 'success' as const, icon: Activity },
      sale: { variant: 'success' as const, icon: Activity },
      inventory: { variant: 'info' as const, icon: Package },
      stock_movement: { variant: 'info' as const, icon: Activity },
      location: { variant: 'info' as const, icon: MapPin },
      settings: { variant: 'default' as const, icon: Settings }
    };
    
    const config = variants[resource as keyof typeof variants] || { variant: 'default' as const, icon: Activity };
    const Icon = config.icon;
    
    return <Badge variant={config.variant} className="flex items-center gap-1">
      <Icon className="w-3 h-3" />
      {resource.replace('_', ' ').charAt(0).toUpperCase() + resource.replace('_', ' ').slice(1)}
    </Badge>;
  };

  // Prepare chart data
  const getActionChartData = () => {
    if (!activityStats || !activityStats.topActions) return [];
    
    return activityStats.topActions.map((action: any) => ({
      name: action._id.charAt(0).toUpperCase() + action._id.slice(1),
      value: action.count,
      color: getActionColor(action._id)
    }));
  };

  const getResourceChartData = () => {
    if (!activityStats || !activityStats.topResources) return [];
    
    return activityStats.topResources.map((resource: any) => ({
      name: resource._id.replace('_', ' ').charAt(0).toUpperCase() + resource._id.replace('_', ' ').slice(1),
      value: resource.count,
      color: getResourceColor(resource._id)
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
      default: return '#6B7280'; // gray
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <UserIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900">User not found</h2>
        <p className="text-gray-600 mt-2">The user you're looking for doesn't exist.</p>
        <Link to="/users">
          <Button className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Users
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
          <Button variant="outline" onClick={() => navigate('/users')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{user.firstName} {user.lastName}</h1>
            <p className="text-gray-600">{user.email}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm">
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
          <Link to={`/users/${user.id}/edit`}>
            <Button variant="outline" size="sm">
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </Link>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              fetchUserPermissions(user.id);
              setShowPermissionsModal(true);
            }}
          >
            <Key className="w-4 h-4 mr-2" />
            Permissions
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowPasswordModal(true)}
          >
            <Lock className="w-4 h-4 mr-2" />
            Password
          </Button>
          <Button variant="outline" size="sm" onClick={handleStatusToggle}>
            {user.isActive ? (
              <>
                <XCircle className="w-4 h-4 mr-2" />
                Deactivate
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Activate
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={handleDelete}>
            <Trash2 className="w-4 h-4 mr-2 text-red-500" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - User Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* User Overview */}
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  {user.profileImage ? (
                    <img
                      src={user.profileImage}
                      alt={`${user.firstName} ${user.lastName}`}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <UserIcon className="w-12 h-12 text-blue-600" />
                  )}
                </div>
                <h2 className="text-xl font-bold text-gray-900">{user.firstName} {user.lastName}</h2>
                <p className="text-gray-600 mt-1">{user.email}</p>
                
                <div className="flex items-center justify-center space-x-2 mt-3">
                  {getRoleBadge(user.role)}
                  {getStatusBadge(user.isActive)}
                </div>

                {user.lastLogin && (
                  <p className="text-sm text-gray-500 mt-3">
                    Last login: {formatDate(user.lastLogin)}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          {activityStats && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Activity Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{activityStats.totalActivities || 0}</p>
                    <p className="text-sm text-gray-600">Total Activities</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{activityStats.recentActivities || 0}</p>
                    <p className="text-sm text-gray-600">Last 30 Days</p>
                  </div>
                </div>

                {activityStats.lastActivity && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-gray-600">Last Activity:</p>
                    <p className="font-medium">{formatDate(activityStats.lastActivity.timestamp)}</p>
                    <p className="text-sm text-gray-600 mt-1">{activityStats.lastActivity.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserIcon className="w-5 h-5 mr-2" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-3">
                <Mail className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900">{user.email}</p>
                  <p className="text-sm text-gray-500">Email</p>
                </div>
              </div>
              
              {user.phone && (
                <div className="flex items-center space-x-3">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">{user.phone}</p>
                    <p className="text-sm text-gray-500">Phone</p>
                  </div>
                </div>
              )}

              {user.address && user.address.street && (
                <div className="flex items-center space-x-3">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">
                      {user.address.street}, {user.address.city}
                    </p>
                    <p className="text-sm text-gray-500">
                      {user.address.state}, {user.address.zipCode}, {user.address.country}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* User Permissions */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Key className="w-5 h-5 mr-2" />
                  User Permissions
                </CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    fetchUserPermissions(user.id);
                    setShowPermissionsModal(true);
                  }}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Role:</span>
                  <span>{getRoleBadge(user.role)}</span>
                </div>
                
                {user.role === 'admin' ? (
                  <div className="bg-blue-50 p-3 rounded-lg mt-2">
                    <p className="text-sm text-blue-700">
                      Admin users have full access to all features and functionality.
                    </p>
                  </div>
                ) : (
                  <div className="mt-2">
                    <p className="text-sm text-gray-600 mb-2">Granted Permissions:</p>
                    <div className="flex flex-wrap gap-2">
                      {user.permissions.map((permission, index) => (
                        <Badge key={index} variant="default" className="capitalize">
                          {permission.split('.')[1]} {permission.split('.')[0]}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Activity and Charts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Activity Charts */}
          {activityStats && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="w-5 h-5 mr-2" />
                  Activity Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Action Distribution */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-4 text-center">Actions Performed</h3>
                    <div className="h-64">
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
                  </div>
                  
                  {/* Resource Distribution */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-4 text-center">Resources Accessed</h3>
                    <div className="h-64">
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
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  Recent Activity
                </CardTitle>
                <Link to={`/activity?user=${user.id}`}>
                  <Button variant="outline" size="sm">
                    View All
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {userActivity.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No activity found</p>
                  <p className="text-sm">This user hasn't performed any actions yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userActivity.map((activity) => (
                      <TableRow key={activity._id}>
                        <TableCell>
                          {formatDate(activity.timestamp)}
                          <div className="text-xs text-gray-500">
                            {new Date(activity.timestamp).toLocaleTimeString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getActionBadge(activity.action)}
                        </TableCell>
                        <TableCell>
                          {getResourceBadge(activity.resource)}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{activity.description}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserIcon className="w-5 h-5 mr-2" />
                Account Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Account Created:</span>
                    <span className="font-medium">{formatDate(user.createdAt || new Date().toISOString())}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Last Login:</span>
                    <span className="font-medium">{user.lastLogin ? formatDate(user.lastLogin) : 'Never'}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span>{getStatusBadge(user.isActive)}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Role:</span>
                    <span>{getRoleBadge(user.role)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Activities:</span>
                    <span className="font-medium">{activityStats?.totalActivities || 0}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Recent Activities:</span>
                    <span className="font-medium">{activityStats?.recentActivities || 0} (30 days)</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Security Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Password</p>
                    <p className="text-sm text-gray-500">Update user's password</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowPasswordModal(true)}
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    Change Password
                  </Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Permissions</p>
                    <p className="text-sm text-gray-500">Manage user's access rights</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      fetchUserPermissions(user.id);
                      setShowPermissionsModal(true);
                    }}
                  >
                    <Key className="w-4 h-4 mr-2" />
                    Manage Permissions
                  </Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Account Status</p>
                    <p className="text-sm text-gray-500">{user.isActive ? 'Active' : 'Inactive'}</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleStatusToggle}
                  >
                    {user.isActive ? (
                      <>
                        <XCircle className="w-4 h-4 mr-2" />
                        Deactivate
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Activate
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Password Update Modal */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title="Update Password"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="New Password"
            type="password"
            value={passwordData.password}
            onChange={(e) => setPasswordData(prev => ({ ...prev, password: e.target.value }))}
            placeholder="Enter new password"
          />
          
          <Input
            label="Confirm Password"
            type="password"
            value={passwordData.confirmPassword}
            onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
            placeholder="Confirm new password"
          />
          
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-900">Password Requirements</h4>
                <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                  <li>At least 6 characters long</li>
                  <li>Include a mix of letters, numbers, and special characters for better security</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setShowPasswordModal(false)}>
              Cancel
            </Button>
            <Button onClick={handlePasswordUpdate}>
              Update Password
            </Button>
          </div>
        </div>
      </Modal>

      {/* Permissions Modal */}
      <Modal
        isOpen={showPermissionsModal}
        onClose={() => setShowPermissionsModal(false)}
        title="User Permissions"
        size="lg"
      >
        <div className="space-y-4">
          {permissionsData.role === 'admin' ? (
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">Admin User</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Admin users have full access to all features and cannot have their permissions modified individually.
                    To change permissions, you must change the user's role.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-blue-50 p-4 rounded-lg mb-4">
                <div className="flex items-start space-x-3">
                  <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900">User Permissions</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Select the permissions you want to grant to this user. Permissions determine what actions the user can perform in the system.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-6">
                {permissionsData.userPermissions.map((group, groupIndex) => (
                  <div key={groupIndex} className="border rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-3">{group.group} Permissions</h3>
                    <div className="space-y-2">
                      {group.permissions.map((permission: any, permIndex: number) => (
                        <div key={permIndex} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`perm-${groupIndex}-${permIndex}`}
                            checked={permission.granted}
                            onChange={() => handleTogglePermission(groupIndex, permIndex)}
                            className="rounded border-gray-300"
                          />
                          <label htmlFor={`perm-${groupIndex}-${permIndex}`} className="text-sm text-gray-700">
                            {permission.name.split('.')[1] === 'read' && 'View'}
                            {permission.name.split('.')[1] === 'write' && 'Create/Edit'}
                            {permission.name.split('.')[1] === 'delete' && 'Delete'}
                            {' '}
                            {permission.name.split('.')[0].charAt(0).toUpperCase() + permission.name.split('.')[0].slice(1)}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-end space-x-3">
                <Button variant="outline" onClick={() => setShowPermissionsModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handlePermissionsUpdate}>
                  Update Permissions
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
};