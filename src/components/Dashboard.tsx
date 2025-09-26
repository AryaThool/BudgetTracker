import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PiggyBank,
  AlertCircle,
  Plus 
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { supabase, Transaction, Budget } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316'];

export function Dashboard() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [animateCards, setAnimateCards] = useState(false);

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (user) {
      loadData();
      // Trigger card animations after a short delay
      setTimeout(() => {
        setAnimateCards(true);
      }, 100);
    }
  }, [user]);

  const loadData = async () => {
    try {
      const [transactionsResponse, budgetsResponse] = await Promise.all([
        supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user!.id)
          .order('date', { ascending: false }),
        supabase
          .from('budgets')
          .select('*')
          .eq('user_id', user!.id)
          .eq('month', currentMonth)
          .eq('year', currentYear)
      ]);

      if (transactionsResponse.data) {
        setTransactions(transactionsResponse.data);
      }
      if (budgetsResponse.data) {
        setBudgets(budgetsResponse.data);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate current month statistics
  const currentMonthTransactions = transactions.filter(t => {
    const date = new Date(t.date);
    return date.getMonth() + 1 === currentMonth && date.getFullYear() === currentYear;
  });

  const totalIncome = currentMonthTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalExpenses = currentMonthTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const netSavings = totalIncome - totalExpenses;

  // Category spending analysis
  const categorySpending = currentMonthTransactions
    .filter(t => t.type === 'expense')
    .reduce((acc, transaction) => {
      acc[transaction.category] = (acc[transaction.category] || 0) + Number(transaction.amount);
      return acc;
    }, {} as Record<string, number>);

  const categoryData = Object.entries(categorySpending).map(([category, amount]) => ({
    category,
    amount,
    budget: budgets.find(b => b.category === category)?.amount || 0
  }));

  // Monthly trend data (last 6 months)
  const monthlyTrends = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    
    const monthTransactions = transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate.getMonth() + 1 === month && tDate.getFullYear() === year;
    });

    const income = monthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const expenses = monthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    monthlyTrends.push({
      month: date.toLocaleString('default', { month: 'short' }),
      income,
      expenses,
      savings: income - expenses
    });
  }

  const pieData = Object.entries(categorySpending).map(([category, amount]) => ({
    name: category,
    value: amount
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <div className="text-sm text-gray-500">
          {new Date().toLocaleDateString('default', { month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className={`bg-white p-6 rounded-xl shadow-lg border border-gray-200 card-hover ${animateCards ? 'animate-bounce-in' : ''}`}>
          <div className="flex items-center">
            <div className="p-3 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl shadow-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Income</p>
              <p className="text-2xl font-bold text-green-600">₹{totalIncome.toLocaleString('en-IN')}</p>
            </div>
          </div>
        </div>

        <div className={`bg-white p-6 rounded-xl shadow-lg border border-gray-200 card-hover ${animateCards ? 'animate-bounce-in' : ''}`} style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center">
            <div className="p-3 bg-gradient-to-br from-red-400 to-pink-500 rounded-xl shadow-lg">
              <TrendingDown className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Expenses</p>
              <p className="text-2xl font-bold text-red-600">₹{totalExpenses.toLocaleString('en-IN')}</p>
            </div>
          </div>
        </div>

        <div className={`bg-white p-6 rounded-xl shadow-lg border border-gray-200 card-hover ${animateCards ? 'animate-bounce-in' : ''}`} style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center">
            <div className={`p-3 rounded-xl shadow-lg ${netSavings >= 0 ? 'bg-gradient-to-br from-blue-400 to-indigo-500' : 'bg-gradient-to-br from-orange-400 to-red-500'}`}>
              <PiggyBank className={`h-6 w-6 ${netSavings >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Net Savings</p>
              <p className={`text-2xl font-bold ${netSavings >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                ₹{Math.abs(netSavings).toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        </div>

        <div className={`bg-white p-6 rounded-xl shadow-lg border border-gray-200 card-hover ${animateCards ? 'animate-bounce-in' : ''}`} style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center">
            <div className="p-3 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-xl shadow-lg">
              <DollarSign className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Transactions</p>
              <p className="text-2xl font-bold text-purple-600">{currentMonthTransactions.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Budget Alerts */}
      {categoryData.some(c => c.budget > 0 && c.amount > c.budget) && (
        <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-xl p-6 shadow-lg animate-slide-up">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-orange-600 mr-2" />
            <h3 className="text-sm font-medium text-orange-800">Budget Alerts</h3>
          </div>
          <div className="mt-2 space-y-1">
            {categoryData
              .filter(c => c.budget > 0 && c.amount > c.budget)
              .map(category => (
                <p key={category.category} className="text-sm text-orange-700">
                  <span className="font-medium">{category.category}</span> is over budget by $
                  {(category.amount - category.budget).toLocaleString()}
                </p>
              ))}
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Monthly Trends */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 card-hover">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Trends</h3>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, '']} />
              <Line 
                type="monotone" 
                dataKey="income" 
                stroke="#10B981" 
                strokeWidth={2}
                name="Income"
              />
              <Line 
                type="monotone" 
                dataKey="expenses" 
                stroke="#EF4444" 
                strokeWidth={2}
                name="Expenses"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 card-hover">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Spending by Category</h3>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, '']} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Income vs Expenses */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 card-hover">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Income vs Expenses</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, '']} />
              <Bar dataKey="income" fill="#10B981" name="Income" />
              <Bar dataKey="expenses" fill="#EF4444" name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Budget Progress */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 card-hover">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Budget Progress</h3>
          <div className="space-y-4">
            {categoryData.length > 0 ? (
              categoryData.map(category => (
                <div key={category.category}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-700">{category.category}</span>
                    <span className="text-sm text-gray-500">
                      ₹{category.amount.toLocaleString('en-IN')} / ₹{category.budget.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-3 rounded-full transition-all duration-1000 ease-out ${
                        category.amount > category.budget ? 'bg-red-500' : 'bg-blue-500'
                      }`}
                      style={{
                        width: `${Math.min((category.amount / Math.max(category.budget, 1)) * 100, 100)}%`
                      }}
                    ></div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No budget data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 card-hover">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="hidden sm:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.slice(0, 5).map((transaction) => (
                <tr key={transaction.id}>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(transaction.date).toLocaleDateString()}
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-sm text-gray-900">
                    <div className="truncate max-w-xs">{transaction.notes || 'No description'}</div>
                    <div className="sm:hidden text-xs text-gray-500 mt-1">{transaction.category}</div>
                  </td>
                  <td className="hidden sm:table-cell px-4 sm:px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                      {transaction.category}
                    </span>
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <span className={transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                      {transaction.type === 'income' ? '+' : '-'}₹{Number(transaction.amount).toLocaleString('en-IN')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {transactions.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No transactions yet. Start by adding your first transaction!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );