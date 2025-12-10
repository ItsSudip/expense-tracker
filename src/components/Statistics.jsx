import { useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { TrendingUp, TrendingDown, Calendar, Target } from 'lucide-react';
import dayjs from 'dayjs';

const Statistics = () => {
  const { expenses, income, budgets, activeYear, activeMonth, allExpenses, allIncome } = useData();

  const stats = useMemo(() => {
    // If showing all months, calculate for entire year
    if (!activeMonth) {
      const yearExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
      const yearIncome = income.reduce((sum, inc) => sum + inc.amount, 0);
      const totalBudget = budgets.reduce((sum, b) => {
        // Sum all 12 months for each category
        const yearlyBudget = Object.values(b.months || {}).reduce((s, val) => s + val, 0);
        return sum + yearlyBudget;
      }, 0);

      return {
        thisMonthExpenses: yearExpenses,
        thisMonthIncome: yearIncome,
        lastMonthExpenses: 0,
        expenseChange: 0,
        avgDailySpending: yearExpenses / 365,
        totalBudget,
        budgetUsedPercentage: totalBudget > 0 ? (yearExpenses / totalBudget) * 100 : 0,
        isYearView: true,
      };
    }

    // Active month calculations (expenses and income are already filtered by DataContext)
    const thisMonthExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const thisMonthIncome = income.reduce((sum, inc) => sum + inc.amount, 0);

    // Calculate previous month for comparison
    let prevMonth = activeMonth - 1;
    let prevYear = activeYear;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear = activeYear - 1;
    }

    const prevMonthStart = dayjs().year(prevYear).month(prevMonth - 1).startOf('month').format('YYYY-MM-DD');
    const prevMonthEnd = dayjs().year(prevYear).month(prevMonth - 1).endOf('month').format('YYYY-MM-DD');

    const lastMonthExpenses = allExpenses
      .filter((exp) => exp.date >= prevMonthStart && exp.date <= prevMonthEnd)
      .reduce((sum, exp) => sum + exp.amount, 0);

    // Calculate changes
    const expenseChange =
      lastMonthExpenses > 0
        ? ((thisMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100
        : 0;

    // Average daily spending
    const daysInMonth = dayjs().year(activeYear).month(activeMonth - 1).daysInMonth();
    const avgDailySpending = thisMonthExpenses / daysInMonth;

    // Total budget for active month (sum all category budgets for this month)
    const totalBudget = budgets.reduce((sum, b) => {
      const monthBudget = b.months?.[activeMonth] || 0;
      return sum + monthBudget;
    }, 0);
    const budgetUsedPercentage = totalBudget > 0 ? (thisMonthExpenses / totalBudget) * 100 : 0;

    return {
      thisMonthExpenses,
      thisMonthIncome,
      lastMonthExpenses,
      expenseChange,
      avgDailySpending,
      totalBudget,
      budgetUsedPercentage,
      isYearView: false,
    };
  }, [expenses, income, budgets, activeYear, activeMonth, allExpenses, allIncome]);

  const periodLabel = stats.isYearView ? `${activeYear}` : dayjs().year(activeYear).month(activeMonth - 1).format('MMMM YYYY');

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Statistics</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* This Month/Year Spending */}
        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-red-700 mb-1">{stats.isYearView ? 'This Year' : 'This Month'}</p>
              <p className="text-2xl font-bold text-red-900">
                ₹{stats.thisMonthExpenses.toFixed(2)}
              </p>
              <div className="flex items-center gap-1 mt-2">
                {!stats.isYearView && stats.expenseChange > 0 ? (
                  <>
                    <TrendingUp className="w-4 h-4 text-red-600" />
                    <span className="text-xs text-red-600">
                      +{stats.expenseChange.toFixed(1)}% from last month
                    </span>
                  </>
                ) : !stats.isYearView && stats.expenseChange < 0 ? (
                  <>
                    <TrendingDown className="w-4 h-4 text-green-600" />
                    <span className="text-xs text-green-600">
                      {stats.expenseChange.toFixed(1)}% from last month
                    </span>
                  </>
                ) : !stats.isYearView ? (
                  <span className="text-xs text-gray-600">No change from last month</span>
                ) : (
                  <span className="text-xs text-red-600">Total expenses</span>
                )}
              </div>
            </div>
            <TrendingDown className="w-10 h-10 text-red-300" />
          </div>
        </div>

        {/* Average Daily */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-blue-700 mb-1">Avg. Daily Spending</p>
              <p className="text-2xl font-bold text-blue-900">
                ₹{stats.avgDailySpending.toFixed(2)}
              </p>
              <p className="text-xs text-blue-600 mt-2">
                Based on {periodLabel}
              </p>
            </div>
            <Calendar className="w-10 h-10 text-blue-300" />
          </div>
        </div>

        {/* Budget Usage */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-purple-700 mb-1">Budget Used</p>
              <p className="text-2xl font-bold text-purple-900">
                {stats.totalBudget > 0 ? `${stats.budgetUsedPercentage.toFixed(0)}%` : 'N/A'}
              </p>
              {stats.totalBudget > 0 && (
                <div className="mt-2">
                  <div className="w-full bg-purple-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${
                        stats.budgetUsedPercentage > 100 ? 'bg-red-500' : 'bg-purple-600'
                      }`}
                      style={{ width: `${Math.min(stats.budgetUsedPercentage, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-purple-600 mt-1">
                    ₹{stats.thisMonthExpenses.toFixed(2)} / ₹{stats.totalBudget.toFixed(2)}
                  </p>
                </div>
              )}
            </div>
            <Target className="w-10 h-10 text-purple-300" />
          </div>
        </div>

        {/* This Month/Year Income */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-green-700 mb-1">{stats.isYearView ? 'This Year Income' : 'This Month Income'}</p>
              <p className="text-2xl font-bold text-green-900">
                ₹{stats.thisMonthIncome.toFixed(2)}
              </p>
              <p className="text-xs text-green-600 mt-2">
                Net: ₹{(stats.thisMonthIncome - stats.thisMonthExpenses).toFixed(2)}
              </p>
            </div>
            <TrendingUp className="w-10 h-10 text-green-300" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Statistics;
