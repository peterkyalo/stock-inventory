import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types';
import { authAPI } from '../lib/api';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      
      if (token) {
        try {
          // Verify token is still valid by fetching user profile
          const response = await authAPI.getProfile();
          const userData = response.data.data.user;
          
          // Transform the user data to match our User interface
          const transformedUser: User = {
            id: userData.id,
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email,
            role: userData.role,
            permissions: userData.permissions || [],
            phone: userData.phone,
            address: userData.address,
            profileImage: userData.profileImage,
            lastLogin: userData.lastLogin,
            isActive: userData.isActive
          };
          
          setUser(transformedUser);
          localStorage.setItem('user', JSON.stringify(transformedUser));
        } catch (error) {
          console.error('Token validation failed:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      console.log('Attempting login with:', { email, password: '***' });
      
      const response = await authAPI.login({ email, password });
      console.log('Login response:', response.data);
      
      if (response.data.success) {
        const { user: userData, token } = response.data.data;
        
        // Transform the user data to match our User interface
        const transformedUser: User = {
          id: userData.id,
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          role: userData.role,
          permissions: userData.permissions || [],
          phone: userData.phone,
          address: userData.address,
          profileImage: userData.profileImage,
          lastLogin: userData.lastLogin,
          isActive: userData.isActive
        };

        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(transformedUser));
        setUser(transformedUser);
        
        toast.success('Login successful!');
      } else {
        throw new Error(response.data.message || 'Login failed');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      const message = error.response?.data?.message || error.message || 'Login failed';
      throw new Error(message);
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
      // Continue with logout even if API call fails
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      toast.success('Logged out successfully');
    }
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};