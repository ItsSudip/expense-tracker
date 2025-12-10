import { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { Table, InputNumber, Button, Card, Tag, Space, message } from 'antd';
import { SaveOutlined, InfoCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const BudgetSettings = () => {
  const { categories, budgets, setBudgetForMonth, activeYear, allExpenses } = useData();
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState(null);
  const [loading, setLoading] = useState(false);

  // Month labels
  const months = [
    { value: 1, label: 'Jan', fullLabel: 'January' },
    { value: 2, label: 'Feb', fullLabel: 'February' },
    { value: 3, label: 'Mar', fullLabel: 'March' },
    { value: 4, label: 'Apr', fullLabel: 'April' },
    { value: 5, label: 'May', fullLabel: 'May' },
    { value: 6, label: 'Jun', fullLabel: 'June' },
    { value: 7, label: 'Jul', fullLabel: 'July' },
    { value: 8, label: 'Aug', fullLabel: 'August' },
    { value: 9, label: 'Sep', fullLabel: 'September' },
    { value: 10, label: 'Oct', fullLabel: 'October' },
    { value: 11, label: 'Nov', fullLabel: 'November' },
    { value: 12, label: 'Dec', fullLabel: 'December' },
  ];

  // Calculate spending per category per month
  const monthlySpending = useMemo(() => {
    const spending = {};

    allExpenses.forEach((exp) => {
      const expDate = dayjs(exp.date);
      const expYear = expDate.year();
      const expMonth = expDate.month() + 1; // 1-12

      if (expYear === activeYear) {
        const key = `${exp.category}-${expMonth}`;
        spending[key] = (spending[key] || 0) + exp.amount;
      }
    });

    return spending;
  }, [allExpenses, activeYear]);

  // Get budget for specific category and month
  const getBudgetForMonth = (category, month) => {
    const budget = budgets.find((b) => b.category === category);
    return budget?.months?.[month] || 0;
  };

  // Handle saving budget for a specific month
  const handleSaveBudget = async (category, month) => {
    if (editValue === null || editValue < 0) {
      message.error('Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      await setBudgetForMonth(category, month, editValue);
      setEditingCell(null);
      setEditValue(null);
    } catch (error) {
      console.error('Error saving budget:', error);
      message.error('Failed to save budget');
    } finally {
      setLoading(false);
    }
  };

  // Build table data
  const tableData = useMemo(() => {
    return categories.map((category) => {
      const row = {
        key: category.name,
        category: category.name,
        color: category.color,
      };

      // Add monthly data
      months.forEach((month) => {
        const budget = getBudgetForMonth(category.name, month.value);
        const spent = monthlySpending[`${category.name}-${month.value}`] || 0;
        const percentage = budget > 0 ? (spent / budget) * 100 : 0;

        row[`month${month.value}`] = {
          budget,
          spent,
          percentage,
          isOver: budget > 0 && spent > budget,
        };
      });

      // Calculate annual totals
      const annualBudget = months.reduce((sum, m) => sum + getBudgetForMonth(category.name, m.value), 0);
      const annualSpent = months.reduce((sum, m) => sum + (monthlySpending[`${category.name}-${m.value}`] || 0), 0);

      row.annual = {
        budget: annualBudget,
        spent: annualSpent,
        percentage: annualBudget > 0 ? (annualSpent / annualBudget) * 100 : 0,
        isOver: annualBudget > 0 && annualSpent > annualBudget,
      };

      return row;
    });
  }, [categories, budgets, monthlySpending]);

  // Table columns
  const columns = [
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      fixed: 'left',
      width: 150,
      render: (text, record) => (
        <Space>
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 2,
              backgroundColor: record.color,
            }}
          />
          <strong>{text}</strong>
        </Space>
      ),
    },
    ...months.map((month) => ({
      title: month.label,
      dataIndex: `month${month.value}`,
      key: `month${month.value}`,
      width: 100,
      render: (data, record) => {
        const isEditing = editingCell === `${record.category}-${month.value}`;

        return (
          <div
            style={{
              backgroundColor: data.isOver ? '#fff1f0' : 'transparent',
              padding: '4px',
              borderRadius: '4px',
            }}
            onDoubleClick={() => {
              setEditingCell(`${record.category}-${month.value}`);
              setEditValue(data.budget);
            }}
          >
            {isEditing ? (
              <Space.Compact style={{ width: '100%' }}>
                <InputNumber
                  size="small"
                  value={editValue}
                  onChange={setEditValue}
                  min={0}
                  precision={2}
                  style={{ width: '100%' }}
                  autoFocus
                  onPressEnter={() => handleSaveBudget(record.category, month.value)}
                />
                <Button
                  size="small"
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={() => handleSaveBudget(record.category, month.value)}
                  loading={loading}
                />
              </Space.Compact>
            ) : (
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600 }}>
                  ₹{data.budget.toFixed(0)}
                </div>
                {data.spent > 0 && (
                  <div style={{ fontSize: '11px', color: data.isOver ? '#cf1322' : '#8c8c8c' }}>
                    ₹{data.spent.toFixed(0)} ({data.percentage.toFixed(0)}%)
                  </div>
                )}
              </div>
            )}
          </div>
        );
      },
    })),
    {
      title: 'Annual',
      dataIndex: 'annual',
      key: 'annual',
      fixed: 'right',
      width: 120,
      render: (data) => (
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700 }}>
            ₹{data.budget.toFixed(0)}
          </div>
          <div style={{ fontSize: '11px', color: data.isOver ? '#cf1322' : '#52c41a' }}>
            ₹{data.spent.toFixed(0)}
          </div>
          {data.budget > 0 && (
            <Tag color={data.isOver ? 'red' : 'green'} style={{ marginTop: 4 }}>
              {data.percentage.toFixed(0)}%
            </Tag>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <Card
        title={`Budget Settings - ${activeYear}`}
        extra={
          <Space>
            <Button
              icon={<InfoCircleOutlined />}
              size="small"
              type="text"
            >
              Double-click cells to edit
            </Button>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <p style={{ marginBottom: 16, color: '#666' }}>
          Set monthly spending limits for each category. Double-click any cell to edit the budget for that month.
          Budget values are shown in bold, actual spending and percentage below.
        </p>

        <Table
          dataSource={tableData}
          columns={columns}
          pagination={false}
          scroll={{ x: 1500 }}
          size="small"
          bordered
        />
      </Card>

      <Card title="Budget Tips" size="small">
        <ul style={{ margin: 0, paddingLeft: 20, color: '#666' }}>
          <li>Double-click any cell to edit the budget amount</li>
          <li>Red highlighting indicates overspending</li>
          <li>Set realistic budgets based on your spending history</li>
          <li>Review and adjust budgets monthly for better control</li>
        </ul>
      </Card>
    </div>
  );
};

export default BudgetSettings;
