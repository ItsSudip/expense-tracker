import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { Layout, Card, Button, Statistic, Tabs, Avatar, Space, Row, Col } from 'antd';
import {
  WalletOutlined,
  LogoutOutlined,
  PlusOutlined,
  RiseOutlined,
  FallOutlined,
  PieChartOutlined,
  CalendarOutlined,
  SettingOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import ExpenseList from './ExpenseList';
import ExpenseForm from './ExpenseForm';
import IncomeForm from './IncomeForm';
import BudgetSettings from './BudgetSettings';
import RecurringExpenses from './RecurringExpenses';
import Charts from './Charts';
import Statistics from './Statistics';
import MonthSelector from './MonthSelector';

const { Header, Content } = Layout;

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { expenses, income, loading, refreshData, activeYear } = useData();
  const [activeTab, setActiveTab] = useState('overview');
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  // Calculate totals
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const totalIncome = income.reduce((sum, inc) => sum + inc.amount, 0);
  const balance = totalIncome - totalExpenses;

  // Get current year's spreadsheet ID
  const getCurrentSpreadsheetId = () => {
    try {
      const yearSpreadsheetIds = JSON.parse(localStorage.getItem('yearSpreadsheetIds') || '{}');
      return yearSpreadsheetIds[activeYear] || null;
    } catch {
      return null;
    }
  };

  const configSpreadsheetId = localStorage.getItem('configSpreadsheetId');

  const handleEditExpense = (expense) => {
    setEditingExpense(expense);
    setShowExpenseForm(true);
  };

  const handleCloseExpenseForm = () => {
    setShowExpenseForm(false);
    setEditingExpense(null);
  };

  const tabItems = [
    {
      key: 'overview',
      label: (
        <span>
          <PieChartOutlined /> Overview
        </span>
      ),
      children: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <Statistics />
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <Charts />
            </Col>
          </Row>
          <ExpenseList onEdit={handleEditExpense} limit={5} />
        </div>
      ),
    },
    {
      key: 'expenses',
      label: (
        <span>
          <FallOutlined /> Expenses
        </span>
      ),
      children: <ExpenseList onEdit={handleEditExpense} />,
    },
    {
      key: 'charts',
      label: (
        <span>
          <PieChartOutlined /> Charts
        </span>
      ),
      children: (
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Charts />
          </Col>
        </Row>
      ),
    },
    {
      key: 'budgets',
      label: (
        <span>
          <CalendarOutlined /> Budgets
        </span>
      ),
      children: <BudgetSettings />,
    },
    {
      key: 'recurring',
      label: (
        <span>
          <ReloadOutlined /> Recurring
        </span>
      ),
      children: <RecurringExpenses />,
    },
    {
      key: 'settings',
      label: (
        <span>
          <SettingOutlined /> Settings
        </span>
      ),
      children: (
        <Card>
          <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>Settings</h2>
          <p style={{ color: '#666', marginBottom: '16px' }}>
            Your data is stored in Google Sheets. You can access the spreadsheets directly:
          </p>

          <Space vertical size="middle" style={{ width: '100%' }}>
            {/* Current Year Spreadsheet */}
            {getCurrentSpreadsheetId() && (
              <div>
                <strong style={{ display: 'block', marginBottom: '8px' }}>
                  {activeYear} Data (Expenses, Income, Budgets, Recurring)
                </strong>
                <a
                  href={`https://docs.google.com/spreadsheets/d/${getCurrentSpreadsheetId()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#1890ff' }}
                >
                  Open ExpenseTracker_{activeYear}
                </a>
              </div>
            )}

            {/* Config Spreadsheet */}
            {configSpreadsheetId && (
              <div>
                <strong style={{ display: 'block', marginBottom: '8px' }}>
                  Categories (Shared across all years)
                </strong>
                <a
                  href={`https://docs.google.com/spreadsheets/d/${configSpreadsheetId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#1890ff' }}
                >
                  Open ExpenseTracker_Config
                </a>
              </div>
            )}

            {!getCurrentSpreadsheetId() && !configSpreadsheetId && (
              <p style={{ color: '#999', fontStyle: 'italic' }}>
                No spreadsheets found. Add some expenses or income to create them.
              </p>
            )}
          </Space>
        </Card>
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh', backgroundColor: '#f0f2f5' }}>
      {/* Header */}
      <Header style={{ backgroundColor: '#fff', padding: '0 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%' }}>
          <Space size="middle">
            <WalletOutlined style={{ fontSize: '32px', color: '#1890ff' }} />
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>Expense Tracker</h1>
          </Space>

          <Space size="middle">
            <Button
              icon={<ReloadOutlined spin={loading} />}
              onClick={refreshData}
              loading={loading}
              title="Refresh data"
            />

            <Space>
              <Avatar src={user?.picture} alt={user?.name} />
              <span style={{ display: window.innerWidth > 640 ? 'inline' : 'none' }}>{user?.name}</span>
            </Space>

            <Button
              danger
              icon={<LogoutOutlined />}
              onClick={logout}
            >
              <span style={{ display: window.innerWidth > 640 ? 'inline' : 'none' }}>Logout</span>
            </Button>
          </Space>
        </div>
      </Header>

      {/* Content */}
      <Content style={{ padding: '24px', maxWidth: '1400px', width: '100%', margin: '0 auto' }}>
        {/* Month Selector */}
        <MonthSelector />

        {/* Quick Stats */}
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Total Income"
                value={totalIncome}
                precision={2}
                prefix="₹"
                valueStyle={{ color: '#3f8600' }}
                suffix={<RiseOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Total Expenses"
                value={totalExpenses}
                precision={2}
                prefix="₹"
                valueStyle={{ color: '#cf1322' }}
                suffix={<FallOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Balance"
                value={balance}
                precision={2}
                prefix="₹"
                valueStyle={{ color: balance >= 0 ? '#1890ff' : '#cf1322' }}
                suffix={<WalletOutlined />}
              />
            </Card>
          </Col>
        </Row>

        {/* Action Buttons */}
        {(activeTab === 'overview' || activeTab === 'expenses') && (
          <Space style={{ marginBottom: '24px' }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              size="large"
              onClick={() => {
                console.log('Add Expense button clicked, current state:', showExpenseForm);
                setShowExpenseForm(true);
                console.log('Set showExpenseForm to true');
              }}
            >
              Add Expense
            </Button>

            <Button
              type="primary"
              icon={<PlusOutlined />}
              size="large"
              style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
              onClick={() => {
                console.log('Add Income button clicked, current state:', showIncomeForm);
                setShowIncomeForm(true);
                console.log('Set showIncomeForm to true');
              }}
            >
              Add Income
            </Button>
          </Space>
        )}

        {/* Tabs */}
        <Card>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems}
          />
        </Card>
      </Content>

      {/* Modals */}
      {showExpenseForm && (
        <ExpenseForm expense={editingExpense} onClose={handleCloseExpenseForm} />
      )}

      {showIncomeForm && <IncomeForm onClose={() => setShowIncomeForm(false)} />}
    </Layout>
  );
};

export default Dashboard;
