import { useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { startOfMonth, endOfMonth, subMonths, format, parseISO } from 'date-fns';

const COLORS = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'];

const Charts = () => {
  const { expenses, categories } = useData();

  // Category spending data (current month)
  const categoryData = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now).toISOString().split('T')[0];
    const monthEnd = endOfMonth(now).toISOString().split('T')[0];

    const spending = {};
    expenses.forEach((exp) => {
      if (exp.date >= monthStart && exp.date <= monthEnd) {
        spending[exp.category] = (spending[exp.category] || 0) + exp.amount;
      }
    });

    return Object.entries(spending)
      .map(([name, value]) => ({
        name,
        value: parseFloat(value.toFixed(2)),
        color: categories.find((c) => c.name === name)?.color || '#C9CBCF',
      }))
      .sort((a, b) => b.value - a.value);
  }, [expenses, categories]);

  // Monthly trend data (last 6 months)
  const monthlyTrendData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const month = subMonths(new Date(), i);
      const monthStart = startOfMonth(month).toISOString().split('T')[0];
      const monthEnd = endOfMonth(month).toISOString().split('T')[0];

      const monthExpenses = expenses
        .filter((exp) => exp.date >= monthStart && exp.date <= monthEnd)
        .reduce((sum, exp) => sum + exp.amount, 0);

      months.push({
        month: format(month, 'MMM'),
        expenses: parseFloat(monthExpenses.toFixed(2)),
      });
    }

    return months;
  }, [expenses]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 shadow-lg rounded-lg border border-gray-200">
          <p className="font-semibold">{payload[0].name}</p>
          <p className="text-sm text-gray-600">
            ₹{payload[0].value.toFixed(2)}
          </p>
        </div>
      );
    }
    return null;
  };

  const totalSpending = categoryData.reduce((sum, item) => sum + item.value, 0);

  return (
    <>
      {/* Category Pie Chart */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Spending by Category (This Month)</h3>
        {categoryData.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No expenses this month</p>
          </div>
        ) : (
          <div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            <div className="mt-4 space-y-2">
              {categoryData.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: item.color }}
                    />
                    <span>{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">₹{item.value.toFixed(2)}</span>
                    <span className="text-gray-500">
                      ({((item.value / totalSpending) * 100).toFixed(0)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Monthly Trend Bar Chart */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Monthly Spending Trend</h3>
        {monthlyTrendData.every((d) => d.expenses === 0) ? (
          <div className="text-center py-12 text-gray-500">
            <p>No expense data available</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyTrendData}>
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                }}
              />
              <Legend />
              <Bar dataKey="expenses" fill="#3B82F6" name="Expenses (₹)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </>
  );
};

export default Charts;
