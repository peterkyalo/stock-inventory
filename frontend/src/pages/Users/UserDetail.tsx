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
      category: { variant: 'info' as const, icon: FileTextLet's start by implementing the enhanced users module. I'll create both the backend and frontend components with advanced features and a beautiful UI.

<boltArtifact id="enhanced-users-module" title="Enhanced Users Module Implementation">