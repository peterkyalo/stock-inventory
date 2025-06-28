import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Users, Search, Filter, Download, Printer, RefreshCw, 
  ArrowLeft, Calendar, DollarSign, User, ShoppingBag, 
  SortAsc, SortDesc, BarChart3, PieChart, TrendingUp, TrendingDown,
  Clock, Eye, Crown, Target, Info, Mail, Phone
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

export const CustomerAnalysisReport: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  
  const [customers, setCustomers] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState<any[]>([]);
  
  const [filters, setFilters] = useState({
    startDate: queryParams.get('startDate') || '',
    endDate: queryParams.get('endDate') || '',
    customerGroup: queryParams.get('customerGroup') || '',
    sortBy: queryParams.get('sortBy') || 'revenue',
    limit: queryParams.get('limit') || '20'
  });

  // Debounced search function
  const debouncedSearch = debounce((searchTerm: string) => {
    if (!searchTerm) {
      setFilteredCustomers(customers);
      return;
    }
    
    const filtered = customers.filter(customer => 
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.businessName && customer.businessName.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    
    setFilteredCustomers(filtered);
  }, 300);

  useEffect(() => {
    fetchReport();
  }, [filters]);

  useEffect(() => {
    debouncedSearch(searchTerm);
  }, [searchTerm, customers]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const response = await reportsAPI.getCustomerAnalysisReport(filters);
      setCustomers(response.data.data.customers);
      setFilteredCustomers(response.data.data.customers);
      setSummary(response.data.data.summary);
    } catch (error) {
      console.error('Failed to fetch customer analysis report:', error);
      toast.error('Failed to load customer analysis report');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await reportsAPI.exportReportData({
        reportType: 'customer-analysis',
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

  const getCustomerTypeBadge = (type: string) => {
    return type === 'business' ? (
      <Badge variant="purple" className="flex items-center gap-1">
        <ShoppingBag className="w-3 h-3" />
        Business
      </Badge>
    ) : (
      <Badge variant="blue" className="flex items-center gap-1">
        <User className="w-3 h-3" />
        Individual
      </Badge>
    );
  };

  const getCustomerGroupBadge = (group: string) => {
    const variants = {
      regular: { variant: 'default' as const, icon: User, color: 'text-gray-600' },
      vip: { variant: 'warning' as const, icon: Crown, color: 'text-yellow-600' },
      wholesale: { variant: 'info' as const, icon: ShoppingBag, color: 'text-blue-600' },
      retail: { variant: 'success' as const, icon: Target, color: 'text-green-600' }
    };
    
    const config = variants[group as keyof typeof variants] || variants.regular;
    const Icon = config.icon;
    
    return <Badge variant={config.variant} className="flex items-center gap-1">
      <Icon className="w-3 h-3" />
      {group.charAt(0).toUpperCase() + group.slice(1)}
    </Badge>;
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

  const customerGroupOptions = [
    { value: '', label: 'All Groups' },
    { value: 'regular', label: 'Regular' },
    { value: 'vip', label: 'VIP' },
    { value: 'wholesale', label: 'Wholesale' },
    { value: 'retail', label: 'Retail' }
  ];

  const sortByOptions = [
    { value: 'revenue', label: 'Revenue' },
    { value: 'orders', label: 'Order Count' },
    { value: 'profit', label: 'Profit' },
    { value: 'aov', label: 'Average Order Value' },
    { value: 'clv', label: 'Customer Lifetime Value' },
    { value: 'recency', label: 'Recency' }
  ];

  const limitOptions = [
    { value: '10', label: 'Top 10' },
    { value: '20', label: 'Top 20' },
    { value: '50', label: 'Top 50' },
    { value: '100', label: 'Top 100' }
  ];

  // Prepare chart data
  const getTopCustomersChartData = () => {
    if (!customers || customers.length === 0) return [];
    
    return customers.slice(0, 10).map(customer => ({
      name: customer.name,
      revenue: customer.periodRevenue,
      profit: customer.periodProfit,
      orders: customer.periodOrders
    }));
  };

  const getCustomerGroupChartData = () => {
    if (!summary) return [];
    
    return [
      { name: 'Regular', value: summary.customerGroupCounts.regular, color: '#6B7280' },
      { name: 'VIP', value: summary.customerGroupCounts.vip, color: '#F59E0B' },
      { name: 'Wholesale', value: summary.customerGroupCounts.wholesale, color: '#3B82F6' },
      { name: 'Retail', value: summary.customerGroupCounts.retail, color: '#10B981' }
    ];
  };

  const getCustomerTypeChartData = () => {
    if (!customers || customers.length === 0) return [];
    
    const businessCount = customers.filter(customer => customer.type === 'business').length;
    const individualCount = customers.filter(customer => customer.type === 'individual').length;
    
    return [
      { name: 'Business', value: businessCount, color: '#8B5CF6' },
      { name: 'Individual', value: individualCount, color: '#3B82F6' }
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
            <h1 className="text-2xl font-bold text-gray-900">Customer Analysis Report</h1>
            <p className="text-gray-600">
              Analyze customer behavior, spending patterns, and profitability
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
                  <p className="text-sm text-gray-600">Total Customers</p>
                  <p className="text-2xl font-bold">{summary.totalCustomers}</p>
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Customers</p>
                  <p className="text-2xl font-bold text-green-600">{summary.activeCustomers}</p>
                </div>
                <User className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(summary.totalRevenue)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Average Order Value</p>
                  <p className="text-2xl font-bold text-purple-600">{formatCurrency(summary.averageOrderValue)}</p>
                </div>
                <ShoppingBag className="w-8 h-8 text-purple-500" />
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
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select
              options={customerGroupOptions}
              value={filters.customerGroup}
              onChange={(e) => handleFilterChange('customerGroup', e.target.value)}
              placeholder="Filter by customer group"
            />
            
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
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
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
          
          <div className="flex justify-end items-center mt-4 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFilters({
                  startDate: '',
                  endDate: '',
                  customerGroup: '',
                  sortBy: 'revenue',
                  limit: '20'
                });
                navigate('/reports/customer-analysis');
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Customers Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Top 10 Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={getTopCustomersChartData()} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => 
                    typeof value === 'number' && value > 100 ? formatCurrency(value) : value
                  } />
                  <Legend />
                  <Bar dataKey="revenue" name="Revenue" fill="#3B82F6" />
                  <Bar dataKey="profit" name="Profit" fill="#10B981" />
                  <Bar dataKey="orders" name="Orders" fill="#F59E0B" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Customer Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChart className="w-5 h-5 mr-2" />
              Customer Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 h-96">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-4 text-center">By Customer Group</h4>
                <ResponsiveContainer width="100%" height="90%">
                  <PieChart>
                    <Pie
                      data={getCustomerGroupChartData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {getCustomerGroupChartData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [value, 'Count']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-4 text-center">By Customer Type</h4>
                <ResponsiveContainer width="100%" height="90%">
                  <PieChart>
                    <Pie
                      data={getCustomerTypeChartData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {getCustomerTypeChartData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [value, 'Count']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Customer Analysis ({filteredCustomers.length})
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
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900">No customers found</h3>
              <p className="text-gray-600 mt-2">
                Try adjusting your filters or search criteria
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Group</TableHead>
                  <TableHead>Period Orders</TableHead>
                  <TableHead>Period Revenue</TableHead>
                  <TableHead>Period Profit</TableHead>
                  <TableHead>Avg. Order Value</TableHead>
                  <TableHead>Last Order</TableHead>
                  <TableHead>Lifetime Value</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow key={customer._id}>
                    <TableCell>
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-2">
                          {customer.type === 'business' ? (
                            <ShoppingBag className="w-4 h-4 text-blue-600" />
                          ) : (
                            <User className="w-4 h-4 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{customer.name}</p>
                          <p className="text-xs text-gray-500">{customer.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getCustomerTypeBadge(customer.type)}
                    </TableCell>
                    <TableCell>
                      {getCustomerGroupBadge(customer.customerGroup)}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{customer.periodOrders}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-blue-600">{formatCurrency(customer.periodRevenue)}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-green-600">{formatCurrency(customer.periodProfit)}</span>
                    </TableCell>
                    <TableCell>
                      <span>{formatCurrency(customer.averageOrderValue)}</span>
                    </TableCell>
                    <TableCell>
                      {customer.lastOrderDate ? (
                        <div className="flex flex-col">
                          <span>{formatDate(customer.lastOrderDate)}</span>
                          <span>{getRecencyBadge(customer.daysSinceLastOrder)}</span>
                        </div>
                      ) : (
                        <span className="text-gray-500">Never</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{formatCurrency(customer.customerLifetimeValue)}</span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/customers/${customer._id}`)}
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

      {/* Customer Insights */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Info className="w-5 h-5 mr-2" />
              Customer Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">Customer Segments</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Regular Customers:</span>
                    <span className="font-medium">{summary.customerGroupCounts.regular}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">VIP Customers:</span>
                    <span className="font-medium">{summary.customerGroupCounts.vip}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Wholesale Customers:</span>
                    <span className="font-medium">{summary.customerGroupCounts.wholesale}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Retail Customers:</span>
                    <span className="font-medium">{summary.customerGroupCounts.retail}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">Performance Metrics</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Active Rate:</span>
                    <span className="font-medium">
                      {((summary.activeCustomers / summary.totalCustomers) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Average Revenue per Customer:</span>
                    <span className="font-medium">
                      {formatCurrency(summary.totalRevenue / summary.totalCustomers)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Average Profit per Customer:</span>
                    <span className="font-medium">
                      {formatCurrency(summary.totalProfit / summary.totalCustomers)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Average Order Value:</span>
                    <span className="font-medium">{formatCurrency(summary.averageOrderValue)}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900">Customer Analysis</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      This report shows customer performance for the period from {filters.startDate || 'all time'} to {filters.endDate || 'present'}.
                      {summary.activeCustomers / summary.totalCustomers > 0.7 ? (
                        <span> Your customer activation rate is excellent at {((summary.activeCustomers / summary.totalCustomers) * 100).toFixed(1)}%, indicating strong customer engagement.</span>
                      ) : summary.activeCustomers / summary.totalCustomers > 0.4 ? (
                        <span> Your customer activation rate is moderate at {((summary.activeCustomers / summary.totalCustomers) * 100).toFixed(1)}%, showing room for improvement in customer engagement.</span>
                      ) : (
                        <span> Your customer activation rate is low at {((summary.activeCustomers / summary.totalCustomers) * 100).toFixed(1)}%, suggesting a need for customer reactivation strategies.</span>
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