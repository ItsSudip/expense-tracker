import { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { Modal, Form, Input, InputNumber, Select, DatePicker, Button, message } from 'antd';
import { DollarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { TextArea } = Input;

const ExpenseForm = ({ expense, onClose }) => {
  const { categories, addExpense, updateExpense, activeYear, activeMonth } = useData();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (expense) {
      form.setFieldsValue({
        date: dayjs(expense.date),
        amount: expense.amount,
        category: expense.category,
        description: expense.description || '',
      });
    } else {
      // Default to first day of active month if month is selected, otherwise today
      const defaultDate = activeMonth
        ? dayjs().year(activeYear).month(activeMonth - 1).date(1)
        : dayjs();

      form.setFieldsValue({
        date: defaultDate,
      });
    }
  }, [expense, form, activeYear, activeMonth]);

  const handleSubmit = async (values) => {
    setLoading(true);

    try {
      const data = {
        date: values.date.format('YYYY-MM-DD'),
        amount: values.amount,
        category: values.category,
        description: values.description || '',
        isRecurring: false,
        recurringId: null,
      };

      if (expense) {
        await updateExpense(expense.id, data);
        message.success('Expense updated successfully');
      } else {
        await addExpense(data);
        message.success('Expense added successfully');
      }

      onClose();
    } catch (error) {
      console.error('Error saving expense:', error);
      message.error('Failed to save expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={expense ? 'Edit Expense' : 'Add New Expense'}
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
          name="category"
          label="Category"
          rules={[{ required: true, message: 'Please select a category' }]}
        >
          <Select placeholder="Select a category">
            {categories.map((cat) => (
              <Select.Option key={cat.id || cat.name} value={cat.name}>
                {cat.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="description"
          label="Description (Optional)"
        >
          <TextArea
            rows={3}
            placeholder="Add a note about this expense"
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button onClick={onClose}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              {loading ? 'Saving...' : expense ? 'Update' : 'Add Expense'}
            </Button>
          </div>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ExpenseForm;
