import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Truck, Search, Filter, Download, Printer, RefreshCw, 
  ArrowLeft, Calendar, DollarSign, Building, Star, 
  SortAsc, SortDesc, BarChart3, PieChart, TrendingUp, TrendingDown,
  Clock, Eye, CheckCircle, XCircle, Info, Mail, Phone
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import { Select } from '../../components/UI/Select';
import { Badge } from '../../components/UI/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/UI/Table';
import { reportsAPI } from '../../lib/api';
import { formatCurrency, formatDate, debounce } from '../../utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import toast from 'react-hot-toast';

export const SupplierAnalysisReport: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredSuppliers, setFilteredSuppliers] = useState<any[]>([]);
  
  const [filters, setFilters] = useState({
    startDate: queryParams.get('startDate') || '',
    endDate: queryParams.get('endDate') || '',
    sortBy: queryParams.get('sortBy') || 'amount',
    limit: queryParams.get('limit') || '20'
  });

  // Debounced search function
  const debouncedSearch = debounce((searchTerm: string) => {
    if (!searchTerm) {
      setFilteredSuppliers(suppliers);
      return;
    }
    
    const filtered = suppliers.filter(supplier => 
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    setFilteredSuppliers(filtered);
  }, 300);

  useEffect(() => {
    fetchReport();
  }, [filters]);

  useEffect(() => {
    debouncedSearch(searchTerm);
  }, [searchTerm, suppliers]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const response = await reportsAPI.getSupplierAnalysisReport(filters);
      setSuppliers(response.data.data.suppliers);
      setFilteredSuppliers(response.data.data.suppliers);
      setSummary(response.data.data.summary);
    } catch (error) {
      console.error('Failed to fetch supplier analysis report:', error);
      toast.error('Failed to load supplier analysis report');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await reportsAPI.exportReportData({
        reportType: 'supplier-analysis',
        format: 'csv',
        ...filters
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
      link.download = `${response.data.fileName}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Report exported successfully');
    } catch (error) {
      toast.error('Failed to export report');
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

  const getRatingStars = (rating: number | null) => {
    if (rating === null) return <span className="text-gray-500">Not Rated</span>;
    
    return (
      <div className="flex items-center">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
          />
        ))}
        <span className="ml-1 text-sm text-gray-600">({rating})</span>
      </div>
    );
  };

  const getOnTimeDeliveryBadge = (rate: number | null) => {
    if (rate === null) return <Badge variant="default">No Data</Badge>;
    
    if (rate >= 90) {
      return <Badge variant="success" className="flex items-center gap-1">
        <CheckCircle className="w-3 h-3" />
        {rate.toFixed(0)}%
      </Badge>;
    } else if (rate >= 70) {
      return <Badge variant="warning" className="flex items-center gap-1">
        <Clock className="w-3 h-3" />
        {rate.toFixed(0)}%
      </Badge>;
    } else {
      return <Badge variant="danger" className="flex items-center gap-1">
        <XCircle className="w-3 h-3" />
        {rate.toFixed(0)}%
      </Badge>;
    }
  };

  const getRecencyBadge = (daysSinceLastOrder: number | null) => {
    if (daysSinceLastOrder === null) return <Badge variant="default">Never Ordered</Badge>;
    
    if (daysSinceLastOrder <= 30) {
      return <Badge variant="success" className="flex items-center gap-1">
        <Clock className="w-3 h-3" />
        Recent ({daysSinceLastOrder} days)
      </Badge>;
    } else if (daysSinceLastOrder <= 90) {
      return <Badge variant="warning" className="flex items-center gap-1">
        <Clock className="w-3 h-3" />
        {daysSinceLastOrder} days
      </Badge>;
    } else {
      return <Badge variant="danger" className="flex items-center gap-1">
        <Clock className="w-3 h-3" />
        {daysSinceLastOrder} days
      </Badge>;
    }
  };

  const sortByOptions = [
    { value: 'amount', label: 'Purchase Amount' },
    { value: 'orders', label: 'Order Count' },
    { value: 'aov', label: 'Average Order Value' },
    { value: 'rating', label: 'Rating' },
    { value: 'ontime', label: 'On-Time Delivery' },
    { value: 'recency', label: 'Recency' }
  ];

  const limitOptions = [
    { value: '10', label: 'Top 10' },
    { value: '20', label: 'Top 20' },
    { value: '50', label: 'Top 50' },
    { value: '100', label: 'Top 100' }
  ];

  // Prepare chart data
  const getTopSuppliersChartData = () => {
    if (!suppliers || suppliers.length === 0) return [];
    
    return suppliers.slice(0, 10).map(supplier => ({
      name: supplier.name,
      amount: supplier.periodAmount,
      orders: supplier.periodOrders
    }));
  };

  const getRatingDistributionChartData = () => {
    if (!suppliers || suppliers.length === 0) return [];
    
    const ratingCounts = {
      '5': 0,
      '4': 0,
      '3': 0,
      '2': 0,
      '1': 0,
      'Not Rated': 0
    };
    
    suppliers.forEach(supplier => {
      if (supplier.rating === null) {
        ratingCounts['Not Rated']++;
      } else {
        ratingCounts[Math.floor(supplier.rating).toString()]++;
      }
    });
    
    return [
      { name: '5 Stars', value: ratingCounts['5'], color: '#10B981' },
      { name: '4 Stars', value: ratingCounts['4'], color: '#3B82F6' },
      { name: '3 Stars', value: ratingCounts['3'], color: '#F59E0B' },
      { name: '2 Stars', value: ratingCounts['2'], color: '#EF4444' },
      { name: '1 Star', value: ratingCounts['1'], color: '#6B7280' },
      { name: 'Not Rated', value: ratingCounts['Not Rated'], color: '#D1D5DB' }
    ];
  };

  const getOnTimeDeliveryChartData = () => {
    if (!suppliers || suppliers.length === 0) return [];
    
    const onTimeCategories = {
      'Excellent (90-100%)': 0,
      'Good (70-89%)': 0,
      'Fair (50-69%)': 0,
      'Poor (0-49%)': 0,
      'No Data': 0
    };
    
    suppliers.forEach(supplier => {
      if (supplier.onTimeDeliveryRate === null) {
        onTimeCategories['No Data']++;
      } else if (supplier.onTimeDeliveryRate >= 90) {
        onTimeCategories['Excellent (90-100%)']++;
      } else if (supplier.onTimeDeliveryRate >= 70) {
        onTimeCategories['Good (70-89%)']++;
      } else if (supplier.onTimeDeliveryRate >= 50) {
        onTimeCategories['Fair (50-69%)']++;
      } else {
        onTimeCategories['Poor (0-49%)']++;
      }
    });
    
    return [
      { name: 'Excellent (90-100%)', value: onTimeCategories['Excellent (90-100%)'], color: '#10B981' },
      { name: 'Good (70-89%)', value: onTimeCategories['Good (70-89%)'], color: '#3B82F6' },
      { name: 'Fair (50-69%)', value: onTimeCategories['Fair (50-69%)'], color: '#F59E0B' },
      { name: 'Poor (0-49%)', value: onTimeCategories['Poor (0-49%)'], color: '#EF4444' },
      { name: 'No Data', value: onTimeCategories['No Data'], color: '#D1D5DB' }
    ];
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
            <h1 className="text-2xl font-bold text-gray-900">Supplier Analysis Report</h1>
            <p className="text-gray-600">
              Analyze supplier performance, reliability, and cost-effectiveness
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" onClick={() => fetchReport()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
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
                  <p className="text-sm text-gray-600">Total Suppliers</p>
                  <p className="text-2xl font-bold">{summary.totalSuppliers}</p>
                </div>
                <Truck className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Suppliers</p>
                  <p className="text-2xl font-bold text-green-600">{summary.activeSuppliers}</p>
                </div>
                <Building className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Amount</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(summary.totalAmount)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Average Rating</p>
                  <p className="text-2xl font-bold text-yellow-600">{summary.averageRating.toFixed(1)}</p>
                </div>
                <Star className="w-8 h-8 text-yellow-500" />
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
                placeholder="Search suppliers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex items-end space-x-2">
              <Select
                label="Sort By"
                options={sortByOptions}
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="flex-1"
              />
              
              <Select
                options={limitOptions}
                value={filters.limit}
                onChange={(e) => handleFilterChange('limit', e.target.value)}
                className="w-24"
              />
            </div>
            
            <div className="flex items-end space-x-2">
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
          </div>
          
          <div className="flex justify-end items-center mt-4 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFilters({
                  startDate: '',
                  endDate: '',
                  sortBy: 'amount',
                  limit: '20'
                });
                navigate('/reports/supplier-analysis');
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Suppliers Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Top 10 Suppliers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={getTopSuppliersChartData()} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => 
                    typeof value === 'number' && value > 100 ? formatCurrency(value) : value
                  } />
                  <Legend />
                  <Bar dataKey="amount" name="Purchase Amount" fill="#3B82F6" />
                  <Bar dataKey="orders" name="Order Count" fill="#F59E0B" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Supplier Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChart className="w-5 h-5 mr-2" />
              Supplier Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 h-96">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-4 text-center">Rating Distribution</h4>
                <ResponsiveContainer width="100%" height="90%">
                  <PieChart>
                    <Pie
                      data={getRatingDistributionChartData()}
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
                      {getRatingDistributionChartData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [value, 'Count']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-4 text-center">On-Time Delivery</h4>
                <ResponsiveContainer width="100%" height="90%">
                  <PieChart>
                    <Pie
                      data={getOnTimeDeliveryChartData()}
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
                      {getOnTimeDeliveryChartData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [value, 'Count']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Suppliers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Truck className="w-5 h-5 mr-2" />
            Supplier Analysis ({filteredSuppliers.length})
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
          ) : filteredSuppliers.length === 0 ? (
            <div className="text-center py-12">
              <Truck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900">No suppliers found</h3>
              <p className="text-gray-600 mt-2">
                Try adjusting your filters or search criteria
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Period Orders</TableHead>
                  <TableHead>Period Amount</TableHead>
                  <TableHead>Avg. Order Value</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>On-Time Delivery</TableHead>
                  <TableHead>Last Order</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuppliers.map((supplier) => (
                  <TableRow key={supplier._id}>
                    <TableCell>
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-2">
                          <Truck className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">{supplier.name}</p>
                          <p className="text-xs text-gray-500">{supplier.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{supplier.contactPerson}</p>
                        <p className="text-xs text-gray-500">{supplier.phone}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{supplier.periodOrders}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-blue-600">{formatCurrency(supplier.periodAmount)}</span>
                    </TableCell>
                    <TableCell>
                      <span>{formatCurrency(supplier.averageOrderValue)}</span>
                    </TableCell>
                    <TableCell>
                      {getRatingStars(supplier.rating)}
                    </TableCell>
                    <TableCell>
                      {getOnTimeDeliveryBadge(supplier.onTimeDeliveryRate)}
                    </TableCell>
                    <TableCell>
                      {supplier.lastOrderDate ? (
                        <div className="flex flex-col">
                          <span>{formatDate(supplier.lastOrderDate)}</span>
                          <span>{getRecencyBadge(supplier.daysSinceLastOrder)}</span>
                        </div>
                      ) : (
                        <span className="text-gray-500">Never</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/suppliers/${supplier._id}`)}
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

      {/* Supplier Insights */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Info className="w-5 h-5 mr-2" />
              Supplier Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">Supplier Overview</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Suppliers:</span>
                    <span className="font-medium">{summary.totalSuppliers}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Active Suppliers:</span>
                    <span className="font-medium">{summary.activeSuppliers}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Activation Rate:</span>
                    <span className="font-medium">
                      {((summary.activeSuppliers / summary.totalSuppliers) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Average Rating:</span>
                    <div className="flex items-center">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${i < summary.averageRating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                        />
                      ))}
                      <span className="ml-1 text-sm">({summary.averageRating.toFixed(1)})</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">Performance Metrics</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Orders:</span>
                    <span className="font-medium">{summary.totalOrders}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Amount:</span>
                    <span className="font-medium">{formatCurrency(summary.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Average Order Value:</span>
                    <span className="font-medium">{formatCurrency(summary.averageOrderValue)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Average Amount per Supplier:</span>
                    <span className="font-medium">
                      {formatCurrency(summary.totalAmount / summary.totalSuppliers)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900">Supplier Analysis</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      This report shows supplier performance for the period from {filters.startDate || 'all time'} to {filters.endDate || 'present'}.
                      {summary.activeSuppliers / summary.totalSuppliers > 0.7 ? (
                        <span> Your supplier utilization rate is excellent at {((summary.activeSuppliers / summary.totalSuppliers) * 100).toFixed(1)}%, indicating strong supplier relationships.</span>
                      ) : summary.activeSuppliers / summary.totalSuppliers > 0.4 ? (
                        <span> Your supplier utilization rate is moderate at {((summary.activeSuppliers / summary.totalSuppliers) * 100).toFixed(1)}%, showing room for improvement in supplier management.</span>
                      ) : (
                        <span> Your supplier utilization rate is low at {((summary.activeSuppliers / summary.totalSuppliers) * 100).toFixed(1)}%, suggesting a need for supplier consolidation or relationship improvement.</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};