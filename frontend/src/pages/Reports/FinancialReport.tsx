import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  DollarSign, Search, Filter, Download, Printer, RefreshCw, 
  ArrowLeft, Calendar, TrendingUp, TrendingDown, 
  SortAsc, SortDesc, BarChart3, PieChart, LineChart as LineChartIcon,
  CreditCard, ShoppingCart, FileText, Info, CheckCircle, XCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import { Select } from '../../components/UI/Select';
import { Badge } from '../../components/UI/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/UI/Table';
import { reportsAPI } from '../../lib/api';
import { formatCurrency, formatDate } from '../../utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Pie, Cell, Legend, LineChart, Line, Area, AreaChart } from 'recharts';
import toast from 'react-hot-toast';

export const FinancialReport: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  
  const [groupedData, setGroupedData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState<'bar' | 'line' | 'area'>('line');
  
  const [filters, setFilters] = useState({
    startDate: queryParams.get('startDate') || '',
    endDate: queryParams.get('endDate') || '',
    period: queryParams.get('period') || 'month',
    includeExpenses: queryParams.get('includeExpenses') || 'true'
  });

  useEffect(() => {
    fetchReport();
  }, [filters]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const response = await reportsAPI.getFinancialReport(filters);
      setGroupedData(response.data.data.groupedData);
      setSummary(response.data.data.summary);
    } catch (error) {
      console.error('Failed to fetch financial report:', error);
      toast.error('Failed to load financial report');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      // For financial reports, we'll export the grouped data
      const csvData = groupedData.map(item => {
        const periodKey = filters.period === 'day' ? 'date' : 
                         filters.period === 'week' ? 'weekStart' : 
                         filters.period === 'month' ? 'month' : 
                         filters.period === 'quarter' ? 'quarter' : 'year';
        
        return {
          period: item[periodKey],
          revenue: item.revenue,
          expenses: item.expenses,
          profit: item.profit,
          orders: item.orders
        };
      });
      
      // Convert to CSV and download
      const csvContent = [
        Object.keys(csvData[0]).join(','),
        ...csvData.map((row: any) => Object.values(row).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `financial-report-${new Date().toISOString().split('T')[0]}.csv`;
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

  const periodOptions = [
    { value: 'day', label: 'Daily' },
    { value: 'week', label: 'Weekly' },
    { value: 'month', label: 'Monthly' },
    { value: 'quarter', label: 'Quarterly' },
    { value: 'year', label: 'Yearly' }
  ];

  // Format chart data
  const getChartData = () => {
    if (!groupedData || groupedData.length === 0) return [];
    
    return groupedData.map(item => {
      const periodKey = filters.period === 'day' ? 'date' : 
                       filters.period === 'week' ? 'weekStart' : 
                       filters.period === 'month' ? 'month' : 
                       filters.period === 'quarter' ? 'quarter' : 'year';
      
      return {
        name: item[periodKey],
        revenue: item.revenue,
        expenses: item.expenses,
        profit: item.profit
      };
    });
  };

  // Calculate growth rates
  const calculateGrowth = (data: any[], key: string) => {
    if (!data || data.length < 2) return 0;
    
    const current = data[data.length - 1][key];
    const previous = data[data.length - 2][key];
    
    if (previous === 0) return 100; // If previous was zero, show 100% growth
    
    return ((current - previous) / previous * 100).toFixed(1);
  };

  // Get period label
  const getPeriodLabel = () => {
    switch (filters.period) {
      case 'day': return 'Day';
      case 'week': return 'Week';
      case 'month': return 'Month';
      case 'quarter': return 'Quarter';
      case 'year': return 'Year';
      default: return 'Period';
    }
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
            <h1 className="text-2xl font-bold text-gray-900">Financial Report</h1>
            <p className="text-gray-600">
              Analyze your revenue, expenses, and profitability
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
                  <p className="text-sm text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(summary.totalRevenue)}</p>
                  {groupedData.length >= 2 && (
                    <div className="flex items-center mt-1">
                      {parseFloat(calculateGrowth(groupedData, 'revenue')) > 0 ? (
                        <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                      )}
                      <span className={`text-sm ${parseFloat(calculateGrowth(groupedData, 'revenue')) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {calculateGrowth(groupedData, 'revenue')}%
                      </span>
                    </div>
                  )}
                </div>
                <FileText className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Expenses</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.totalExpenses)}</p>
                  {groupedData.length >= 2 && (
                    <div className="flex items-center mt-1">
                      {parseFloat(calculateGrowth(groupedData, 'expenses')) > 0 ? (
                        <TrendingUp className="w-4 h-4 text-red-500 mr-1" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-green-500 mr-1" />
                      )}
                      <span className={`text-sm ${parseFloat(calculateGrowth(groupedData, 'expenses')) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {calculateGrowth(groupedData, 'expenses')}%
                      </span>
                    </div>
                  )}
                </div>
                <ShoppingCart className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Profit</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalProfit)}</p>
                  {groupedData.length >= 2 && (
                    <div className="flex items-center mt-1">
                      {parseFloat(calculateGrowth(groupedData, 'profit')) > 0 ? (
                        <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                      )}
                      <span className={`text-sm ${parseFloat(calculateGrowth(groupedData, 'profit')) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {calculateGrowth(groupedData, 'profit')}%
                      </span>
                    </div>
                  )}
                </div>
                <TrendingUp className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Profit Margin</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {summary.profitMargin.toFixed(1)}%
                  </p>
                  <div className="flex items-center mt-1">
                    <span className="text-sm text-gray-600">
                      Based on {summary.totalSales} sales
                    </span>
                  </div>
                </div>
                <CreditCard className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            
            <Select
              label="Period"
              options={periodOptions}
              value={filters.period}
              onChange={(e) => handleFilterChange('period', e.target.value)}
            />
          </div>
          
          <div className="flex justify-between items-center mt-4 pt-4 border-t">
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="includeExpenses"
                  checked={filters.includeExpenses === 'true'}
                  onChange={(e) => handleFilterChange('includeExpenses', e.target.checked ? 'true' : 'false')}
                  className="rounded border-gray-300"
                />
                <label htmlFor="includeExpenses" className="text-sm font-medium text-gray-700">
                  Include Expenses
                </label>
              </div>
            </div>
            
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
                <LineChartIcon className="w-4 h-4" />
              </Button>
              <Button
                variant={chartType === 'area' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('area')}
              >
                <PieChart className="w-4 h-4" />
              </Button>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFilters({
                  startDate: '',
                  endDate: '',
                  period: 'month',
                  includeExpenses: 'true'
                });
                navigate('/reports/financial');
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Financial Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            Financial Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'bar' ? (
                <BarChart data={getChartData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Legend />
                  <Bar dataKey="revenue" name="Revenue" fill="#3B82F6" />
                  {filters.includeExpenses === 'true' && (
                    <Bar dataKey="expenses" name="Expenses" fill="#EF4444" />
                  )}
                  <Bar dataKey="profit" name="Profit" fill="#10B981" />
                </BarChart>
              ) : chartType === 'line' ? (
                <LineChart data={getChartData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#3B82F6" strokeWidth={2} />
                  {filters.includeExpenses === 'true' && (
                    <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#EF4444" strokeWidth={2} />
                  )}
                  <Line type="monotone" dataKey="profit" name="Profit" stroke="#10B981" strokeWidth={2} />
                </LineChart>
              ) : (
                <AreaChart data={getChartData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Legend />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
                  {filters.includeExpenses === 'true' && (
                    <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#EF4444" fill="#EF4444" fillOpacity={0.3} />
                  )}
                  <Area type="monotone" dataKey="profit" name="Profit" stroke="#10B981" fill="#10B981" fillOpacity={0.3} />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Financial Data Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <DollarSign className="w-5 h-5 mr-2" />
            Financial Data
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
          ) : groupedData.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900">No financial data found</h3>
              <p className="text-gray-600 mt-2">
                Try adjusting your date range or filters
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{getPeriodLabel()}</TableHead>
                  <TableHead>Revenue</TableHead>
                  {filters.includeExpenses === 'true' && <TableHead>Expenses</TableHead>}
                  <TableHead>Profit</TableHead>
                  <TableHead>Profit Margin</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Avg. Order Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedData.map((item, index) => {
                  const periodKey = filters.period === 'day' ? 'date' : 
                                   filters.period === 'week' ? 'weekStart' : 
                                   filters.period === 'month' ? 'month' : 
                                   filters.period === 'quarter' ? 'quarter' : 'year';
                  
                  const profitMargin = item.revenue > 0 ? (item.profit / item.revenue * 100).toFixed(1) : 0;
                  const avgOrderValue = item.orders > 0 ? (item.revenue / item.orders).toFixed(2) : 0;
                  
                  return (
                    <TableRow key={index}>
                      <TableCell>
                        <span className="font-medium">{item[periodKey]}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-blue-600 font-medium">{formatCurrency(item.revenue)}</span>
                      </TableCell>
                      {filters.includeExpenses === 'true' && (
                        <TableCell>
                          <span className="text-red-600 font-medium">{formatCurrency(item.expenses)}</span>
                        </TableCell>
                      )}
                      <TableCell>
                        <span className={`font-medium ${item.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(item.profit)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`font-medium ${parseFloat(profitMargin) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {profitMargin}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <span>{item.orders}</span>
                      </TableCell>
                      <TableCell>
                        <span>{formatCurrency(parseFloat(avgOrderValue))}</span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Summary Analysis */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Info className="w-5 h-5 mr-2" />
              Financial Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">Revenue & Profit</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Revenue:</span>
                    <span className="font-medium text-blue-600">{formatCurrency(summary.totalRevenue)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Expenses:</span>
                    <span className="font-medium text-red-600">{formatCurrency(summary.totalExpenses)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Profit:</span>
                    <span className="font-medium text-green-600">{formatCurrency(summary.totalProfit)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Profit Margin:</span>
                    <span className="font-medium text-green-600">{summary.profitMargin.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">Sales Performance</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Sales:</span>
                    <span className="font-medium">{summary.totalSales} orders</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Purchases:</span>
                    <span className="font-medium">{summary.totalPurchases} orders</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Average Order Value:</span>
                    <span className="font-medium">{formatCurrency(summary.averageOrderValue)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Revenue per Order:</span>
                    <span className="font-medium">
                      {formatCurrency(summary.totalSales > 0 ? summary.totalRevenue / summary.totalSales : 0)}
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
                    <h4 className="font-medium text-blue-900">Financial Analysis</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      This report shows your financial performance for the selected period. 
                      {summary.profitMargin >= 20 ? (
                        <span> Your profit margin is healthy at {summary.profitMargin.toFixed(1)}%, indicating good financial health.</span>
                      ) : summary.profitMargin >= 10 ? (
                        <span> Your profit margin is moderate at {summary.profitMargin.toFixed(1)}%, consider strategies to improve profitability.</span>
                      ) : (
                        <span> Your profit margin is low at {summary.profitMargin.toFixed(1)}%, review your pricing and cost structure.</span>
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