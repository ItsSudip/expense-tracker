import { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { Modal, Form, Input, InputNumber, DatePicker, Button, message } from 'antd';
import { DollarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { TextArea } = Input;

const IncomeForm = ({ onClose }) => {
  const { addIncome, activeYear, activeMonth } = useData();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // Set initial date - default to first day of active month if month is selected, otherwise today
  const defaultDate = activeMonth
    ? dayjs().year(activeYear).month(activeMonth - 1).date(1)
    : dayjs();

  form.setFieldsValue({
    date: defaultDate,
  });

  const handleSubmit = async (values) => {
    setLoading(true);

    try {
      await addIncome({
        date: values.date.format('YYYY-MM-DD'),
        amount: values.amount,
        source: values.source,
        description: values.description || '',
      });

      message.success('Income added successfully');
      onClose();
    } catch (error) {
      console.error('Error adding income:', error);
      message.error('Failed to add income');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Add Income"
      open={true}
      onCancel={onClose}
      footer={null}
      width={500}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
      >
        <Form.Item
          name="date"
          label="Date"
          rules={[{ required: true, message: 'Please select a date' }]}
        >
          <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
        </Form.Item>

        <Form.Item
          name="amount"
          label="Amount"
          rules={[
            { required: true, message: 'Please enter an amount' },
            { type: 'number', min: 0.01, message: 'Amount must be greater than 0' },
          ]}
        >
          <InputNumber
            style={{ width: '100%' }}
            prefix={<DollarOutlined />}
            placeholder="0.00"
            precision={2}
            min={0}
          />
        </Form.Item>

        <Form.Item
          name="source"
          label="Source"
          rules={[{ required: true, message: 'Please enter income source' }]}
        >
          <Input placeholder="e.g., Salary, Freelance, Investment" />
        </Form.Item>

        <Form.Item
          name="description"
          label="Description (Optional)"
        >
          <TextArea
            rows={3}
            placeholder="Add a note about this income"
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button onClick={onClose}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              {loading ? 'Adding...' : 'Add Income'}
            </Button>
          </div>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default IncomeForm;
