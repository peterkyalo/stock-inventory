import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { 
  Save, X, User as UserIcon, Mail, Phone, MapPin, 
  Shield, Key, Lock, AlertTriangle, Info,
  Upload, UserCog, UserCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import { Select } from '../../components/UI/Select';
import { Badge } from '../../components/UI/Badge';
import { usersAPI } from '../../lib/api';
import { User } from '../../types';
import { validateEmail, validatePhone } from '../../utils';
import toast from 'react-hot-toast';

interface UserFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  permissions: string[];
  isActive: boolean;
}

export const UserForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEdit);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [permissionsData, setPermissionsData] = useState<{
    userPermissions: any[];
  }>({
    userPermissions: []
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset
  } = useForm<UserFormData>({
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'staff',
      phone: '',
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: ''
      },
      permissions: [],
      isActive: true
    }
  });

  const watchedRole = watch('role');

  useEffect(() => {
    fetchPermissions();
    
    if (isEdit && id) {
      fetchUser(id);
    }
  }, [id, isEdit]);

  const fetchUser = async (userId: string) => {
    try {
      setInitialLoading(true);
      const response = await usersAPI.getById(userId);
      const user = response.data.data.user;
      
      reset({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        password: '',
        confirmPassword: '',
        role: user.role,
        phone: user.phone || '',
        address: {
          street: user.address?.street || '',
          city: user.address?.city || '',
          state: user.address?.state || '',
          zipCode: user.address?.zipCode || '',
          country: user.address?.country || ''
        },
        permissions: user.permissions || [],
        isActive: user.isActive
      });
      
      if (user.profileImage) {
        setPreviewUrl(user.profileImage);
      }
    } catch (error) {
      toast.error('Failed to fetch user details');
      navigate('/users');
    } finally {
      setInitialLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      // Define all available permissions
      const allPermissions = [
        { group: 'Products', permissions: ['products.read', 'products.write', 'products.delete'] },
        { group: 'Inventory', permissions: ['inventory.read', 'inventory.write', 'inventory.delete'] },
        { group: 'Purchases', permissions: ['purchases.read', 'purchases.write', 'purchases.delete'] },
        { group: 'Sales', permissions: ['sales.read', 'sales.write', 'sales.delete'] },
        { group: 'Users', permissions: ['users.read', 'users.write', 'users.delete'] },
        { group: 'Reports', permissions: ['reports.read'] },
        { group: 'Settings', permissions: ['settings.read', 'settings.write'] }
      ];

      // Map user permissions
      const userPermissions = allPermissions.map(group => ({
        group: group.group,
        permissions: group.permissions.map(permission => ({
          name: permission,
          granted: false
        }))
      }));

      setPermissionsData({ userPermissions });
    } catch (error) {
      console.error('Failed to initialize permissions:', error);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast.error('Image size must be less than 2MB');
        return;
      }
      
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    if (previewUrl && !previewUrl.startsWith('/uploads')) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl('');
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

  const onSubmit = async (data: UserFormData) => {
    try {
      setLoading(true);
      
      // Validate email and phone
      if (!validateEmail(data.email)) {
        toast.error('Please provide a valid email address');
        return;
      }
      
      if (data.phone && !validatePhone(data.phone)) {
        toast.error('Please provide a valid phone number');
        return;
      }
      
      // Check if passwords match for new users
      if (!isEdit && data.password !== data.confirmPassword) {
        toast.error('Passwords do not match');
        return;
      }

      // Extract granted permissions
      const grantedPermissions = permissionsData.userPermissions.flatMap(group => 
        group.permissions
          .filter((p: any) => p.granted)
          .map((p: any) => p.name)
      );
      
      const userData = {
        ...data,
        permissions: data.role === 'admin' ? [] : grantedPermissions
      };

      // Remove password if empty for edit
      if (isEdit && !userData.password) {
        delete userData.password;
      }
      delete userData.confirmPassword;

      if (isEdit && id) {
        await usersAPI.update(id, userData);
        
        // Upload profile image if selected
        if (selectedImage) {
          const formData = new FormData();
          formData.append('image', selectedImage);
          await usersAPI.uploadProfileImage(id, formData);
        }
        
        toast.success('User updated successfully');
      } else {
        const response = await usersAPI.create(userData);
        
        // Upload profile image if selected
        if (selectedImage && response.data.data.id) {
          const formData = new FormData();
          formData.append('image', selectedImage);
          await usersAPI.uploadProfileImage(response.data.data.id, formData);
        }
        
        toast.success('User created successfully');
      }
      
      navigate('/users');
    } catch (error: any) {
      console.error('Form submission error:', error);
      toast.error(error.response?.data?.message || 'Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  const roleOptions = [
    { value: 'admin', label: 'Admin' },
    { value: 'manager', label: 'Manager' },
    { value: 'staff', label: 'Staff' }
  ];

  const countryOptions = [
    { value: 'US', label: 'United States' },
    { value: 'CA', label: 'Canada' },
    { value: 'UK', label: 'United Kingdom' },
    { value: 'AU', label: 'Australia' },
    { value: 'DE', label: 'Germany' },
    { value: 'FR', label: 'France' },
    { value: 'IN', label: 'India' },
    { value: 'JP', label: 'Japan' },
    { value: 'CN', label: 'China' },
    { value: 'BR', label: 'Brazil' }
  ];

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
          <UserCheck className="w-3 h-3" />
          Staff
        </Badge>;
      default:
        return <Badge variant="default">{role}</Badge>;
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit User' : 'Add New User'}
          </h1>
          <p className="text-gray-600">
            {isEdit ? 'Update user information' : 'Create a new user account'}
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/users')}>
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <UserIcon className="w-5 h-5 mr-2" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="First Name *"
                {...register('firstName', { 
                  required: 'First name is required',
                  minLength: {
                    value: 2,
                    message: 'First name must be at least 2 characters'
                  }
                })}
                error={errors.firstName?.message}
                placeholder="Enter first name"
              />
              
              <Input
                label="Last Name *"
                {...register('lastName', { 
                  required: 'Last name is required',
                  minLength: {
                    value: 2,
                    message: 'Last name must be at least 2 characters'
                  }
                })}
                error={errors.lastName?.message}
                placeholder="Enter last name"
              />
            </div>

            <Input
              label="Email Address *"
              type="email"
              {...register('email', { 
                required: 'Email is required',
                validate: (value) => validateEmail(value) || 'Please provide a valid email'
              })}
              error={errors.email?.message}
              placeholder="user@example.com"
            />
            
            <Input
              label="Phone Number"
              {...register('phone', {
                validate: (value) => !value || validatePhone(value) || 'Please provide a valid phone number'
              })}
              error={errors.phone?.message}
              placeholder="+1 (555) 123-4567"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role *
                </label>
                <div className="flex items-center space-x-4">
                  <Select
                    options={roleOptions}
                    {...register('role', { required: 'Role is required' })}
                    error={errors.role?.message}
                    className="flex-1"
                  />
                  <div>
                    {getRoleBadge(watchedRole)}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 pt-6">
                <input
                  type="checkbox"
                  id="isActive"
                  {...register('isActive')}
                  className="rounded border-gray-300"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                  User is active
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Password */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Lock className="w-5 h-5 mr-2" />
              {isEdit ? 'Change Password' : 'Set Password'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label={isEdit ? "New Password" : "Password *"}
                type="password"
                {...register('password', { 
                  required: isEdit ? false : 'Password is required',
                  minLength: {
                    value: 6,
                    message: 'Password must be at least 6 characters'
                  }
                })}
                error={errors.password?.message}
                placeholder="Enter password"
              />
              
              <Input
                label={isEdit ? "Confirm New Password" : "Confirm Password *"}
                type="password"
                {...register('confirmPassword', { 
                  required: isEdit ? false : 'Please confirm password',
                  validate: value => 
                    value === watch('password') || 'Passwords do not match'
                })}
                error={errors.confirmPassword?.message}
                placeholder="Confirm password"
              />
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-900">Password Requirements</h4>
                  <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                    <li>At least 6 characters long</li>
                    <li>Include a mix of letters, numbers, and special characters for better security</li>
                    {isEdit && (
                      <li>Leave password fields empty to keep the current password</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Image */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <UserIcon className="w-5 h-5 mr-2" />
              Profile Image
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-6">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Profile preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <UserIcon className="w-12 h-12 text-gray-400" />
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center space-x-4">
                  <label className="block">
                    <span className="sr-only">Choose profile photo</span>
                    <input 
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="block w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-md file:border-0
                        file:text-sm file:font-semibold
                        file:bg-blue-50 file:text-blue-700
                        hover:file:bg-blue-100"
                    />
                  </label>
                  
                  {previewUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={removeImage}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Remove
                    </Button>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  PNG, JPG, GIF up to 2MB
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Address Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="w-5 h-5 mr-2" />
              Address Information (Optional)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Street Address"
              {...register('address.street')}
              placeholder="Enter street address"
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="City"
                {...register('address.city')}
                placeholder="Enter city"
              />
              
              <Input
                label="State/Province"
                {...register('address.state')}
                placeholder="Enter state or province"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="ZIP/Postal Code"
                {...register('address.zipCode')}
                placeholder="Enter ZIP or postal code"
              />
              
              <Select
                label="Country"
                options={countryOptions}
                {...register('address.country')}
                placeholder="Select country"
              />
            </div>
          </CardContent>
        </Card>

        {/* Permissions */}
        {watchedRole !== 'admin' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Key className="w-5 h-5 mr-2" />
                User Permissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-blue-50 p-4 rounded-lg mb-4">
                <div className="flex items-start space-x-3">
                  <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900">About Permissions</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Select the permissions you want to grant to this user. Admin users automatically have all permissions.
                      Manager and Staff users need specific permissions assigned.
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
            </CardContent>
          </Card>
        )}

        {/* Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">User Information</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Provide accurate user information to ensure proper access control and accountability.
                    All required fields must be completed before saving.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-900">Role & Permissions</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    Be careful when assigning roles and permissions. Admin users have full access to all system features.
                    Make sure to only grant necessary permissions to maintain security.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Submit Buttons */}
        <div className="flex items-center justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/users')}
          >
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            <Save className="w-4 h-4 mr-2" />
            {isEdit ? 'Update User' : 'Create User'}
          </Button>
        </div>
      </form>
    </div>
  );
};