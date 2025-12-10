import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import GoogleSheetsService from '../services/googleSheetsService';
import { message } from 'antd';

const DataContext = createContext(null);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
};

export const DataProvider = ({ children }) => {
  const { accessToken, isAuthenticated, handleTokenExpired } = useAuth();
  const [sheetsService, setSheetsService] = useState(null);
  const [loading, setLoading] = useState(false);

  // Year/Month management
  const [activeYear, setActiveYear] = useState(new Date().getFullYear());
  const [activeMonth, setActiveMonth] = useState(null); // null = show all months
  const [availableYears, setAvailableYears] = useState([]);

  // Data state
  const [expenses, setExpenses] = useState([]);
  const [income, setIncome] = useState([]);
  const [categories, setCategories] = useState([]);
  const [budgets, setBudgets] = useState([]); // Will be parsed from 12-month structure
  const [recurringExpenses, setRecurringExpenses] = useState([]);

  // Initialize Google Sheets service
  useEffect(() => {
    if (accessToken) {
      const service = new GoogleSheetsService(accessToken, handleTokenExpired);
      setSheetsService(service);
    }
  }, [accessToken, handleTokenExpired]);

  // Discover available years when service is ready
  useEffect(() => {
    const discoverYears = async () => {
      if (!sheetsService || !isAuthenticated) return;

      try {
        const years = await sheetsService.discoverAvailableYears();
        setAvailableYears(years);

        // If no years found, current year will be created on first data load
        if (years.length === 0) {
          setAvailableYears([activeYear]);
        }
      } catch (error) {
        console.error('Error discovering years:', error);
      }
    };

    discoverYears();
  }, [sheetsService, isAuthenticated, activeYear]);

  // Load all data for the active year
  const loadData = useCallback(async () => {
    if (!sheetsService || !isAuthenticated) return;

    setLoading(true);
    try {
      // Ensure both config and year spreadsheets exist
      await sheetsService.findOrCreateConfigSpreadsheet();
      await sheetsService.findOrCreateYearSpreadsheet(activeYear);

      // Set active year in service
      sheetsService.setActiveYear(activeYear);

      // Load all data in parallel
      const [expensesData, incomeData, categoriesData, budgetsData, recurringData] =
        await Promise.all([
          sheetsService.getRows('Expenses', '', activeYear),
          sheetsService.getRows('Income', '', activeYear),
          sheetsService.getRows('Categories'), // From config spreadsheet
          sheetsService.getRows('Budgets', '', activeYear),
          sheetsService.getRows('RecurringExpenses', '', activeYear),
        ]);

      // Parse expenses (skip header row)
      const parsedExpenses = expensesData.slice(1).map((row, index) => ({
        id: row[0] || `exp-${index}`,
        date: row[1] || '',
        amount: parseFloat(row[2]) || 0,
        category: row[3] || '',
        description: row[4] || '',
        isRecurring: row[5] === 'TRUE',
        recurringId: row[6] || null,
        rowIndex: index + 2,
      }));

      // Parse income
      const parsedIncome = incomeData.slice(1).map((row, index) => ({
        id: row[0] || `inc-${index}`,
        date: row[1] || '',
        amount: parseFloat(row[2]) || 0,
        source: row[3] || '',
        description: row[4] || '',
        rowIndex: index + 2,
      }));

      // Parse categories and remove duplicates
      const parsedCategories = categoriesData.slice(1)
        .map((row, index) => ({
          id: `cat-${index}`,
          name: row[0] || '',
          color: row[1] || '#C9CBCF',
        }))
        .filter((cat, index, self) =>
          cat.name && index === self.findIndex(c => c.name === cat.name)
        );

      // Parse budgets (new 12-month structure: Category | Jan | Feb | ... | Dec)
      const parsedBudgets = budgetsData.slice(1).map((row, index) => ({
        category: row[0] || '',
        months: {
          1: parseFloat(row[1]) || 0,  // Jan
          2: parseFloat(row[2]) || 0,  // Feb
          3: parseFloat(row[3]) || 0,  // Mar
          4: parseFloat(row[4]) || 0,  // Apr
          5: parseFloat(row[5]) || 0,  // May
          6: parseFloat(row[6]) || 0,  // Jun
          7: parseFloat(row[7]) || 0,  // Jul
          8: parseFloat(row[8]) || 0,  // Aug
          9: parseFloat(row[9]) || 0,  // Sep
          10: parseFloat(row[10]) || 0, // Oct
          11: parseFloat(row[11]) || 0, // Nov
          12: parseFloat(row[12]) || 0, // Dec
        },
        rowIndex: index + 2,
      }));

      // Parse recurring expenses
      const parsedRecurring = recurringData.slice(1).map((row, index) => ({
        id: row[0] || `rec-${index}`,
        amount: parseFloat(row[1]) || 0,
        category: row[2] || '',
        description: row[3] || '',
        frequency: row[4] || 'monthly',
        startDate: row[5] || '',
        isActive: row[6] !== 'FALSE',
        rowIndex: index + 2,
      }));

      setExpenses(parsedExpenses);
      setIncome(parsedIncome);
      setCategories(parsedCategories);
      setBudgets(parsedBudgets);
      setRecurringExpenses(parsedRecurring);
    } catch (error) {
      console.error('Error loading data:', error);
      message.error('Failed to load data. Please try refreshing.');
    } finally {
      setLoading(false);
    }
  }, [sheetsService, isAuthenticated, activeYear]);

  // Load data when service is ready or year changes
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered expenses by active month (memoized)
  const filteredExpenses = useMemo(() => {
    if (!activeMonth) return expenses; // Show all months

    return expenses.filter(exp => {
      const expenseDate = new Date(exp.date);
      const expMonth = expenseDate.getMonth() + 1; // 0-indexed to 1-indexed
      return expMonth === activeMonth;
    });
  }, [expenses, activeMonth]);

  // Filtered income by active month (memoized)
  const filteredIncome = useMemo(() => {
    if (!activeMonth) return income; // Show all months

    return income.filter(inc => {
      const incomeDate = new Date(inc.date);
      const incMonth = incomeDate.getMonth() + 1;
      return incMonth === activeMonth;
    });
  }, [income, activeMonth]);

  // Switch to a different year
  const switchYear = useCallback(async (year) => {
    setActiveYear(year);
    if (sheetsService) {
      sheetsService.setActiveYear(year);
    }
    // loadData will be triggered by useEffect when activeYear changes
  }, [sheetsService]);

  // Switch to a different month (within same year)
  const switchMonth = useCallback((month) => {
    setActiveMonth(month); // null for all months, 1-12 for specific month
  }, []);

  // Navigate to previous month
  const goToPreviousMonth = useCallback(() => {
    if (!activeMonth) {
      // If showing all months, go to December of current year
      setActiveMonth(12);
    } else if (activeMonth === 1) {
      // Go to previous year's December
      switchYear(activeYear - 1);
      setActiveMonth(12);
    } else {
      setActiveMonth(activeMonth - 1);
    }
  }, [activeMonth, activeYear, switchYear]);

  // Navigate to next month
  const goToNextMonth = useCallback(() => {
    if (!activeMonth) {
      // If showing all months, go to January of current year
      setActiveMonth(1);
    } else if (activeMonth === 12) {
      // Go to next year's January
      switchYear(activeYear + 1);
      setActiveMonth(1);
    } else {
      setActiveMonth(activeMonth + 1);
    }
  }, [activeMonth, activeYear, switchYear]);

  // Add expense with cross-year validation
  const addExpense = async (expense) => {
    const expenseDate = new Date(expense.date);
    const expenseYear = expenseDate.getFullYear();

    // Check if expense belongs to different year
    if (expenseYear !== activeYear) {
      message.warning(`This expense is for ${expenseYear}. Switching to that year...`);
      await switchYear(expenseYear);
      // Wait a bit for year switch to complete
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const id = `exp-${Date.now()}`;
    const row = [
      id,
      expense.date,
      expense.amount,
      expense.category,
      expense.description || '',
      expense.isRecurring ? 'TRUE' : 'FALSE',
      expense.recurringId || '',
    ];

    await sheetsService.appendRows('Expenses', [row], expenseYear);
    await loadData();
  };

  // Update expense
  const updateExpense = async (expenseId, updatedData) => {
    const expense = expenses.find((e) => e.id === expenseId);
    if (!expense) return;

    const row = [
      expense.id,
      updatedData.date,
      updatedData.amount,
      updatedData.category,
      updatedData.description || '',
      updatedData.isRecurring ? 'TRUE' : 'FALSE',
      updatedData.recurringId || '',
    ];

    await sheetsService.updateRow('Expenses', `A${expense.rowIndex}:G${expense.rowIndex}`, row, activeYear);
    await loadData();
  };

  // Delete expense
  const deleteExpense = async (expenseId) => {
    const expense = expenses.find((e) => e.id === expenseId);
    if (!expense) return;

    await sheetsService.deleteRow('Expenses', expense.rowIndex - 1, activeYear);
    await loadData();
  };

  // Add income with cross-year validation
  const addIncome = async (incomeData) => {
    const incomeDate = new Date(incomeData.date);
    const incomeYear = incomeDate.getFullYear();

    // Check if income belongs to different year
    if (incomeYear !== activeYear) {
      message.warning(`This income is for ${incomeYear}. Switching to that year...`);
      await switchYear(incomeYear);
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const id = `inc-${Date.now()}`;
    const row = [id, incomeData.date, incomeData.amount, incomeData.source, incomeData.description || ''];

    await sheetsService.appendRows('Income', [row], incomeYear);
    await loadData();
  };

  // Delete income
  const deleteIncome = async (incomeId) => {
    const incomeItem = income.find((i) => i.id === incomeId);
    if (!incomeItem) return;

    await sheetsService.deleteRow('Income', incomeItem.rowIndex - 1, activeYear);
    await loadData();
  };

  // Set budget for specific month (new implementation)
  const setBudgetForMonth = async (category, month, amount) => {
    try {
      await sheetsService.updateBudgetForMonth(category, month, amount, activeYear);
      await loadData();
      message.success('Budget updated successfully');
    } catch (error) {
      console.error('Error setting budget:', error);
      message.error('Failed to update budget');
    }
  };

  // Legacy setBudget method - sets same budget for all months
  const setBudget = async (category, monthlyLimit) => {
    try {
      // Set the same budget for all 12 months
      for (let month = 1; month <= 12; month++) {
        await sheetsService.updateBudgetForMonth(category, month, monthlyLimit, activeYear);
      }
      await loadData();
      message.success('Budget set for all months');
    } catch (error) {
      console.error('Error setting budget:', error);
      message.error('Failed to set budget');
    }
  };

  // Add recurring expense
  const addRecurringExpense = async (recurringData) => {
    const id = `rec-${Date.now()}`;
    const row = [
      id,
      recurringData.amount,
      recurringData.category,
      recurringData.description || '',
      recurringData.frequency,
      recurringData.startDate,
      'TRUE',
    ];

    await sheetsService.appendRows('RecurringExpenses', [row], activeYear);
    await loadData();
  };

  // Toggle recurring expense active status
  const toggleRecurringExpense = async (recurringId) => {
    const recurring = recurringExpenses.find((r) => r.id === recurringId);
    if (!recurring) return;

    const row = [
      recurring.id,
      recurring.amount,
      recurring.category,
      recurring.description,
      recurring.frequency,
      recurring.startDate,
      recurring.isActive ? 'FALSE' : 'TRUE',
    ];

    await sheetsService.updateRow(
      'RecurringExpenses',
      `A${recurring.rowIndex}:G${recurring.rowIndex}`,
      row,
      activeYear
    );
    await loadData();
  };

  const value = {
    // Data
    expenses: filteredExpenses, // Return filtered expenses
    income: filteredIncome,     // Return filtered income
    allExpenses: expenses,      // Provide unfiltered access if needed
    allIncome: income,          // Provide unfiltered access if needed
    categories,
    budgets,
    recurringExpenses,
    loading,

    // Year/Month state
    activeYear,
    activeMonth,
    availableYears,

    // Year/Month navigation
    switchYear,
    switchMonth,
    goToPreviousMonth,
    goToNextMonth,

    // CRUD operations
    addExpense,
    updateExpense,
    deleteExpense,
    addIncome,
    deleteIncome,
    setBudget,
    setBudgetForMonth,
    addRecurringExpense,
    toggleRecurringExpense,

    // Utility
    refreshData: loadData,
    sheetsService, // Expose service for advanced use cases
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
