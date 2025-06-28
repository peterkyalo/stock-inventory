import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, Search, Filter, Edit, Trash2, Eye, User as UserIcon, 
  Grid, List, SortAsc, SortDesc, Download, Upload,
  CheckCircle, XCircle, Clock, AlertTriangle, Settings,
  Shield, Key, Activity, Calendar, Mail, Phone, Lock,
  MoreVertical, UserCog, Users
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import { Select } from '../../components/UI/Select';
import { Badge } from '../../components/UI/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/UI/Table';
import { Modal } from '../../components/UI/Modal';
import { usersAPI } from '../../lib/api';
import { User } from '../../types';
import { formatDate, debounce } from '../../utils';
import toast from 'react-hot-toast';

export const UserList: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [stats, setStats] = useState<any>(null);

  const [filters, setFilters] = useState({
    search: '',
    role: '',
    status: '',
    sortBy: 'createdAt',
    sortOrder: 'desc' as 'asc' | 'desc'
  });

  const [bulkUpdateData, setBulkUpdateData] = useState({
    isActive: true,
    role: ''
  });

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

  // Debounced search function
  const debouncedSearch = debounce((searchTerm: string) => {
    setFilters(prev => ({ ...prev, search: searchTerm }));
    setCurrentPage(1);
  }, 500);

  useEffect(() => {
    fetchUsers();
  }, [currentPage, filters]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 10,
        ...filters
      };

      const response = await usersAPI.getAll(params);
      setUsers(response.data.data);
      setStats(response.data.stats);
      setTotalPages(response.data.pagination?.pages || 1);
      setTotalUsers(response.data.pagination?.total || 0);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
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
      console.error('Failed to fetch user permissions:', error);
      toast.error('Failed to load user permissions');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await usersAPI.delete(id);
        toast.success('User deleted successfully');
        fetchUsers();
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Failed to delete user');
      }
    }
  };

  const handleStatusToggle = async (id: string, currentStatus: boolean) => {
    try {
      await usersAPI.updateStatus(id, !currentStatus);
      toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update user status');
    }
  };

  const handlePasswordUpdate = async () => {
    if (!selectedUserId) return;

    if (passwordData.password !== passwordData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      await usersAPI.updatePassword(selectedUserId, {
        password: passwordData.password
      });
      
      toast.success('Password updated successfully');
      setShowPasswordModal(false);
      setPasswordData({
        password: '',
        confirmPassword: ''
      });
      setSelectedUserId('');
    } catch (error) {
      toast.error('Failed to update password');
    }
  };

  const handlePermissionsUpdate = async () => {
    if (!selectedUserId) return;

    try {
      // Extract granted permissions
      const grantedPermissions = permissionsData.userPermissions.flatMap(group => 
        group.permissions
          .filter((p: any) => p.granted)
          .map((p: any) => p.name)
      );

      await usersAPI.updatePermissions(selectedUserId, {
        permissions: grantedPermissions
      });
      
      toast.success('Permissions updated successfully');
      setShowPermissionsModal(false);
      setSelectedUserId('');
    } catch (error) {
      toast.error('Failed to update permissions');
    }
  };

  const handleBulkUpdate = async () => {
    if (selectedUsers.length === 0) {
      toast.error('Please select users to update');
      return;
    }

    try {
      const updates: any = {};
      if (bulkUpdateData.isActive !== undefined) updates.isActive = bulkUpdateData.isActive;
      if (bulkUpdateData.role) updates.role = bulkUpdateData.role;

      await usersAPI.bulkUpdate({
        userIds: selectedUsers,
        updates
      });
      
      toast.success(`Updated ${selectedUsers.length} users successfully`);
      setShowBulkModal(false);
      setSelectedUsers([]);
      fetchUsers();
    } catch (error) {
      toast.error('Failed to update users');
    }
  };

  const handleExport = async () => {
    try {
      const response = await usersAPI.export({ format: 'csv', filters });
      
      // Convert to CSV and download
      const csvContent = [
        Object.keys(response.data.data[0]).join(','),
        ...response.data.data.map((row: any) => Object.values(row).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `users-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Users exported successfully');
    } catch (error) {
      toast.error('Failed to export users');
    }
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(u => u.id));
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

  const roleOptions = [
    { value: '', label: 'All Roles' },
    { value: 'admin', label: 'Admin' },
    { value: 'manager', label: 'Manager' },
    { value: 'staff', label: 'Staff' }
  ];

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' }
  ];

  const sortOptions = [
    { value: 'firstName', label: 'First Name' },
    { value: 'lastName', label: 'Last Name' },
    { value: 'email', label: 'Email' },
    { value: 'role', label: 'Role' },
    { value: 'lastLogin', label: 'Last Login' },
    { value: 'createdAt', label: 'Date Created' }
  ];

  const UserCard: React.FC<{ user: User }> = ({ user }) => (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <input
            type="checkbox"
            checked={selectedUsers.includes(user.id)}
            onChange={() => handleSelectUser(user.id)}
            className="rounded border-gray-300"
          />
          <div className="flex items-center space-x-1">
            <Button variant="ghost" size="sm">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-center">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
              {user.profileImage ? (
                <img
                  src={user.profileImage}
                  alt={`${user.firstName} ${user.lastName}`}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <UserIcon className="w-10 h-10 text-blue-600" />
              )}
            </div>
          </div>

          <div className="text-center">
            <h3 className="font-semibold text-gray-900 text-lg">{user.firstName} {user.lastName}</h3>
            <p className="text-sm text-gray-500">{user.email}</p>
            <div className="flex items-center justify-center space-x-2 mt-2">
              {getRoleBadge(user.role)}
              {getStatusBadge(user.isActive)}
            </div>
          </div>

          <div className="space-y-2">
            {user.phone && (
              <div className="flex items-center text-sm text-gray-600">
                <Phone className="w-4 h-4 mr-2" />
                {user.phone}
              </div>
            )}
            {user.lastLogin && (
              <div className="flex items-center text-sm text-gray-600">
                <Clock className="w-4 h-4 mr-2" />
                Last login: {formatDate(user.lastLogin)}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 mt-4 border-t">
            <Link to={`/users/${user.id}`}>
              <Button variant="ghost" size="sm">
                <Eye className="w-4 h-4" />
              </Button>
            </Link>
            <Link to={`/users/${user.id}/edit`}>
              <Button variant="ghost" size="sm">
                <Edit className="w-4 h-4" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedUserId(user.id);
                setShowPasswordModal(true);
              }}
            >
              <Lock className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedUserId(user.id);
                fetchUserPermissions(user.id);
                setShowPermissionsModal(true);
              }}
            >
              <Key className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleStatusToggle(user.id, user.isActive)}
            >
              {user.isActive ? (
                <XCircle className="w-4 h-4 text-red-500" />
              ) : (
                <CheckCircle className="w-4 h-4 text-green-500" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(user.id)}
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-600">
            Manage your system users ({totalUsers} users)
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Link to="/users/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold">{stats.totalUsers}</p>
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Users</p>
                  <p className="text-2xl font-bold text-green-600">{stats.activeUsers}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Admins</p>
                  <p className="text-2xl font-bold text-red-600">{stats.adminUsers}</p>
                </div>
                <Shield className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Managers</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.managerUsers}</p>
                </div>
                <UserCog className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Staff</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.staffUsers}</p>
                </div>
                <UserIcon className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Recently Active</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.recentlyActive}</p>
                </div>
                <Activity className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search users by name, email..."
                  onChange={(e) => debouncedSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Select
                options={roleOptions}
                value={filters.role}
                onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
                placeholder="Role"
              />
              
              <Select
                options={statusOptions}
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
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

      {/* Bulk Actions */}
      {selectedUsers.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {selectedUsers.length} user(s) selected
              </p>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBulkModal(true)}
                >
                  Bulk Update
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedUsers([])}
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users Display */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="flex items-center justify-center">
                    <div className="w-20 h-20 bg-gray-200 rounded-full"></div>
                  </div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/3 mx-auto"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {users.map((user) => (
            <UserCard key={user.id} user={user} />
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Users
              </CardTitle>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedUsers.length === users.length && users.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-600">Select All</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Select</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => handleSelectUser(user.id)}
                        className="rounded border-gray-300"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                          {user.profileImage ? (
                            <img
                              src={user.profileImage}
                              alt={`${user.firstName} ${user.lastName}`}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <UserIcon className="w-5 h-5 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.firstName} {user.lastName}</p>
                          <p className="text-sm text-gray-500">{user.phone || ''}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Mail className="w-4 h-4 text-gray-400 mr-2" />
                        <span>{user.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getRoleBadge(user.role)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(user.isActive)}
                    </TableCell>
                    <TableCell>
                      {user.lastLogin ? formatDate(user.lastLogin) : 'Never'}
                    </TableCell>
                    <TableCell>
                      {formatDate(user.createdAt || new Date().toISOString())}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Link to={`/users/${user.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Link to={`/users/${user.id}/edit`}>
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedUserId(user.id);
                            setShowPasswordModal(true);
                          }}
                        >
                          <Lock className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedUserId(user.id);
                            fetchUserPermissions(user.id);
                            setShowPermissionsModal(true);
                          }}
                        >
                          <Key className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStatusToggle(user.id, user.isActive)}
                        >
                          {user.isActive ? (
                            <XCircle className="w-4 h-4 text-red-500" />
                          ) : (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(user.id)}
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
            Page {currentPage} of {totalPages} ({totalUsers} total users)
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

      {/* Bulk Update Modal */}
      <Modal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        title="Bulk Update Users"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Update {selectedUsers.length} selected users
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="updateStatus"
                checked={bulkUpdateData.isActive}
                onChange={(e) => setBulkUpdateData(prev => ({ 
                  ...prev, 
                  isActive: e.target.checked 
                }))}
                className="rounded border-gray-300"
              />
              <label htmlFor="updateStatus" className="text-sm text-gray-700">
                Set as Active
              </label>
            </div>
            
            <Select
              label="Role"
              options={[
                { value: '', label: 'No change' },
                ...roleOptions.filter(opt => opt.value)
              ]}
              value={bulkUpdateData.role}
              onChange={(e) => setBulkUpdateData(prev => ({ 
                ...prev, 
                role: e.target.value 
              }))}
              placeholder="Select role"
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setShowBulkModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkUpdate}>
              Update Users
            </Button>
          </div>
        </div>
      </Modal>

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