import { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { Plus, X, RefreshCw, Calendar, DollarSign, Tag, ToggleLeft, ToggleRight } from 'lucide-react';
import { format } from 'date-fns';

const RecurringExpenses = () => {
  const { recurringExpenses, categories, addRecurringExpense, toggleRecurringExpense, activeYear } = useData();
  const [showForm, setShowForm] = useState(false);

  // Default start date to first day of active year
  const defaultStartDate = `${activeYear}-01-01`;

  const [formData, setFormData] = useState({
    amount: '',
    category: '',
    description: '',
    frequency: 'monthly',
    startDate: defaultStartDate,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await addRecurringExpense({
        amount: parseFloat(formData.amount),
        category: formData.category,
        description: formData.description,
        frequency: formData.frequency,
        startDate: formData.startDate,
      });

      setFormData({
        amount: '',
        category: '',
        description: '',
        frequency: 'monthly',
        startDate: defaultStartDate,
      });
      setShowForm(false);
    } catch (error) {
      console.error('Error adding recurring expense:', error);
      alert('Failed to add recurring expense');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (recurringId) => {
    try {
      await toggleRecurringExpense(recurringId);
    } catch (error) {
      console.error('Error toggling recurring expense:', error);
      alert('Failed to update recurring expense');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Recurring Expenses - {activeYear}</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage expenses that repeat regularly for this year
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-5 h-5" />
          Add Recurring
        </button>
      </div>

      {/* Recurring Expenses List */}
      {recurringExpenses.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg">
          <RefreshCw className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No recurring expenses set up</p>
          <p className="text-sm mt-2">
            Add recurring expenses like rent, subscriptions, or bills
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {recurringExpenses.map((recurring) => (
            <div
              key={recurring.id}
              className={`p-4 rounded-lg border-2 ${
                recurring.isActive
                  ? 'border-blue-200 bg-blue-50'
                  : 'border-gray-200 bg-gray-50 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Tag className="w-5 h-5 text-gray-600" />
                    <h3 className="font-semibold">{recurring.category}</h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        recurring.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {recurring.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {recurring.description && (
                    <p className="text-sm text-gray-600 mb-2">{recurring.description}</p>
                  )}

                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      ₹{recurring.amount.toFixed(2)}
                    </span>
                    <span className="flex items-center gap-1">
                      <RefreshCw className="w-4 h-4" />
                      {recurring.frequency.charAt(0).toUpperCase() + recurring.frequency.slice(1)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Since {format(new Date(recurring.startDate), 'MMM dd, yyyy')}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleToggle(recurring.id)}
                  className="ml-4"
                  title={recurring.isActive ? 'Deactivate' : 'Activate'}
                >
                  {recurring.isActive ? (
                    <ToggleRight className="w-10 h-10 text-blue-600" />
                  ) : (
                    <ToggleLeft className="w-10 h-10 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Recurring Expense Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">Add Recurring Expense</h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                    placeholder="0.00"
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a category</option>
                  {categories.map((cat) => (
                    <option key={cat.name} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Frequency
                </label>
                <select
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="2"
                  placeholder="e.g., Netflix subscription, Monthly rent"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Adding...' : 'Add Recurring'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecurringExpenses;
