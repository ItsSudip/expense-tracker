import { useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Expense dates are stored as 'YYYY-MM-DD' strings; slice the month out directly
// so the result does not drift with the browser's timezone.
const monthOf = (dateStr) => parseInt((dateStr || '').slice(5, 7), 10);

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

const Charts = () => {
  // `expenses` is already filtered by the selected month (or whole year when "All Months").
  // `allExpenses` is the full active year and drives the trend chart.
  const { expenses, allExpenses, categories, activeYear, activeMonth } = useData();

  const periodLabel = activeMonth
    ? `${MONTH_NAMES[activeMonth - 1]} ${activeYear}`
    : `All of ${activeYear}`;

  // Category spending for the selected period
  const categoryData = useMemo(() => {
    const spending = {};
    expenses.forEach((exp) => {
      spending[exp.category] = (spending[exp.category] || 0) + exp.amount;
    });

    return Object.entries(spending)
      .map(([name, value]) => ({
        name,
        value: parseFloat(value.toFixed(2)),
        color: categories.find((c) => c.name === name)?.color || '#C9CBCF',
      }))
      .sort((a, b) => b.value - a.value);
  }, [expenses, categories]);

  // Monthly trend across the active year (up to the current month if viewing this year)
  const monthlyTrendData = useMemo(() => {
    const totals = new Array(12).fill(0);
    allExpenses.forEach((exp) => {
      const m = monthOf(exp.date);
      if (m >= 1 && m <= 12) totals[m - 1] += exp.amount;
    });

    const now = new Date();
    const lastMonth = activeYear === now.getFullYear() ? now.getMonth() + 1 : 12;

    return MONTH_LABELS.slice(0, lastMonth).map((label, i) => ({
      month: label,
      expenses: parseFloat(totals[i].toFixed(2)),
      isSelected: activeMonth === i + 1,
    }));
  }, [allExpenses, activeYear, activeMonth]);

  const totalSpending = categoryData.reduce((sum, item) => sum + item.value, 0);

  return (
    <>
      {/* Category Pie Chart */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Spending by Category ({periodLabel})</h3>
        {categoryData.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No expenses for {periodLabel}</p>
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
        <h3 className="text-lg font-semibold mb-4">Monthly Spending Trend ({activeYear})</h3>
        {monthlyTrendData.every((d) => d.expenses === 0) ? (
          <div className="text-center py-12 text-gray-500">
            <p>No expense data available for {activeYear}</p>
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
              <Bar dataKey="expenses" fill="#3B82F6" name="Expenses (₹)" radius={[8, 8, 0, 0]}>
                {monthlyTrendData.map((entry) => (
                  <Cell key={entry.month} fill={entry.isSelected ? '#1D4ED8' : '#3B82F6'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </>
  );
};

export default Charts;
