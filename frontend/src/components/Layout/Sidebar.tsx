import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Truck,
  BarChart3,
  Settings,
  Archive,
  FileText,
  MapPin,
  Activity,
  UserCheck,
  Tag,
  User,
  Shield
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { clsx } from 'clsx';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, permission: null },
  { name: 'Products', href: '/products', icon: Package, permission: 'products.read' },
  { name: 'Categories', href: '/categories', icon: Tag, permission: 'products.read' },
  { name: 'Inventory', href: '/inventory', icon: Archive, permission: 'inventory.read' },
  { name: 'Purchases', href: '/purchases', icon: ShoppingCart, permission: 'purchases.read' },
  { name: 'Sales', href: '/sales', icon: FileText, permission: 'sales.read' },
  { name: 'Customers', href: '/customers', icon: Users, permission: 'sales.read' },
  { name: 'Suppliers', href: '/suppliers', icon: Truck, permission: 'purchases.read' },
  { name: 'Locations', href: '/inventory/locations', icon: MapPin, permission: 'inventory.read' },
  { name: 'Reports', href: '/reports', icon: BarChart3, permission: 'reports.read' },
  { name: 'Activity Logs', href: '/activity', icon: Activity, permission: 'users.read' },
  { name: 'Users', href: '/users', icon: UserCheck, permission: 'users.read' },
  { name: 'Settings', href: '/settings', icon: Settings, permission: 'settings.read' },
];

export const Sidebar: React.FC = () => {
  const { user } = useAuth();

  const hasPermission = (permission: string | null) => {
    if (!permission) return true;
    if (user?.role === 'admin') return true;
    return user?.permissions?.includes(permission) || false;
  };

  const filteredNavigation = navigation.filter(item => hasPermission(item.permission));

  return (
    <div className="flex flex-col w-64 bg-white border-r border-gray-200">
      <div className="flex items-center justify-center h-16 px-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Package className="w-8 h-8 text-blue-600" />
          <span className="text-xl font-bold text-gray-900">StockFlow</span>
        </div>
      </div>
      
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {filteredNavigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              clsx(
                'group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200',
                isActive
                  ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={clsx(
                    'mr-3 h-5 w-5 transition-colors duration-200',
                    isActive ? 'text-blue-700' : 'text-gray-400 group-hover:text-gray-500'
                  )}
                />
                {item.name}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      
      {user?.role === 'admin' && (
        <div className="px-4 py-2 mb-4">
          <div className="flex items-center px-3 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-lg">
            <Shield className="mr-3 h-5 w-5 text-red-700" />
            Admin Access
          </div>
        </div>
      )}
    </div>
  );
};