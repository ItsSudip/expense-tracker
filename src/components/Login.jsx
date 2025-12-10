import { useAuth } from '../contexts/AuthContext';
import { Button, Card, Space, Typography } from 'antd';
import {
  WalletOutlined,
  GoogleOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  PieChartOutlined,
  CalendarOutlined,
  SafetyOutlined
} from '@ant-design/icons';

const { Title, Paragraph } = Typography;

const Login = () => {
  const { login } = useAuth();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <Card
        style={{
          maxWidth: '500px',
          width: '100%',
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
        }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Logo and Title */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              backgroundColor: '#e6f7ff',
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px'
            }}>
              <WalletOutlined style={{ fontSize: '40px', color: '#1890ff' }} />
            </div>
            <Title level={2} style={{ marginBottom: '8px' }}>
              Expense Tracker
            </Title>
            <Paragraph type="secondary">
              Track your expenses and manage your budget with Google Sheets
            </Paragraph>
          </div>

          {/* Sign In Button */}
          <Button
            type="primary"
            size="large"
            icon={<GoogleOutlined />}
            onClick={() => login()}
            block
            style={{
              height: '50px',
              fontSize: '16px',
              fontWeight: '600'
            }}
          >
            Sign in with Google
          </Button>

          <Paragraph type="secondary" style={{ textAlign: 'center', margin: 0 }}>
            <SafetyOutlined /> Your data will be stored in your own Google Sheets
          </Paragraph>

          {/* Features List */}
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f0f0f0' }}>
            <Title level={5} style={{ marginBottom: '12px' }}>Features:</Title>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
                <span>Track expenses and income</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <DollarOutlined style={{ color: '#52c41a' }} />
                <span>Set budgets per category</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CalendarOutlined style={{ color: '#52c41a' }} />
                <span>Manage recurring expenses</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PieChartOutlined style={{ color: '#52c41a' }} />
                <span>Visualize spending with charts</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
                <span>Access your data anywhere</span>
              </div>
            </Space>
          </div>
        </Space>
      </Card>
    </div>
  );
};

export default Login;
