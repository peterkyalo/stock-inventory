import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, Activity, User, Calendar, Clock, 
  FileText, Package, MapPin, Globe, Info, 
  CheckCircle, XCircle, Plus, Edit, Trash2, 
  LogIn, LogOut, Download, Upload, Settings
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Badge } from '../../components/UI/Badge';
import { activityLogsAPI } from '../../lib/api';
import { formatDate, formatDateTime } from '../../utils';
import toast from 'react-hot-toast';

export const ActivityLogDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [log, setLog] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchLog(id);
    }
  }, [id]);

  const fetchLog = async (logId: string) => {
    try {
      setLoading(true);
      const response = await activityLogsAPI.getById(logId);
      setLog(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch activity log details');
      navigate('/activity');
    } finally {
      setLoading(false);
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
          <FileText className="w-3 h-3" />
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
          <Download className="w-3 h-3" />
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
      location: { variant: 'info' as const, icon: MapPin },
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!log) {
    return (
      <div className="text-center py-12">
        <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900">Activity log not found</h2>
        <p className="text-gray-600 mt-2">The activity log you're looking for doesn't exist.</p>
        <Link to="/activity">
          <Button className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Activity Logs
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => navigate('/activity')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Activity Log Details</h1>
            <p className="text-gray-600">{formatDateTime(log.timestamp)}</p>
          </div>
        </div>
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="w-5 h-5 mr-2" />
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Action</p>
                <div className="mt-1">
                  {getActionBadge(log.action)}
                </div>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">Resource</p>
                <div className="mt-1">
                  {getResourceBadge(log.resource)}
                </div>
              </div>
              
              {log.resourceId && (
                <div>
                  <p className="text-sm text-gray-600">Resource ID</p>
                  <p className="font-mono text-sm mt-1">{log.resourceId}</p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Timestamp</p>
                <p className="font-medium mt-1">{formatDateTime(log.timestamp)}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">User</p>
                <div className="flex items-center mt-1">
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
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-gray-600 mb-2">Description</p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-900">{log.description}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Info className="w-5 h-5 mr-2" />
            Additional Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-600">IP Address</p>
              <p className="font-mono text-sm mt-1">{log.ipAddress || 'N/A'}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-600">User Agent</p>
              <p className="text-sm mt-1 break-words">{log.userAgent || 'N/A'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Changes */}
      {log.changes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Edit className="w-5 h-5 mr-2" />
              Changes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600 mb-2">Before</p>
                <div className="bg-red-50 p-4 rounded-lg">
                  <pre className="text-xs text-red-800 overflow-auto max-h-96">
                    {JSON.stringify(log.changes.before, null, 2)}
                  </pre>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-gray-600 mb-2">After</p>
                <div className="bg-green-50 p-4 rounded-lg">
                  <pre className="text-xs text-green-800 overflow-auto max-h-96">
                    {JSON.stringify(log.changes.after, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Related Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Related Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-start space-x-3">
              <Info className="w-5 h-5 text-blue-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900">Activity Log Information</h4>
                <p className="text-sm text-blue-700 mt-1">
                  This activity log records a {log.action} action performed on a {log.resource.replace('_', ' ')} resource.
                  {log.action === 'create' && ' The resource was created.'}
                  {log.action === 'update' && ' The resource was updated with new information.'}
                  {log.action === 'delete' && ' The resource was deleted from the system.'}
                  {log.action === 'login' && ' The user logged into the system.'}
                  {log.action === 'logout' && ' The user logged out of the system.'}
                </p>
                <p className="text-sm text-blue-700 mt-2">
                  Log ID: <span className="font-mono">{log._id}</span>
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};