import { Space, Select, Button, Tag } from 'antd';
import { LeftOutlined, RightOutlined, CalendarOutlined } from '@ant-design/icons';
import { useData } from '../contexts/DataContext';
import dayjs from 'dayjs';

const MonthSelector = () => {
  const {
    activeYear,
    activeMonth,
    availableYears,
    switchYear,
    switchMonth,
    goToPreviousMonth,
    goToNextMonth,
  } = useData();

  const currentDate = dayjs();
  const currentYear = currentDate.year();
  const currentMonth = currentDate.month() + 1; // 1-12

  const months = [
    { value: null, label: 'All Months' },
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  const handleJumpToToday = () => {
    if (activeYear !== currentYear) {
      switchYear(currentYear);
    }
    switchMonth(currentMonth);
  };

  const isCurrentMonth = activeYear === currentYear && activeMonth === currentMonth;
  const isShowingAllMonths = activeMonth === null;

  return (
    <Space size="middle" wrap style={{ marginBottom: '16px' }}>
      {/* Previous Month Button */}
      <Button
        icon={<LeftOutlined />}
        onClick={goToPreviousMonth}
        disabled={isShowingAllMonths}
      >
        Previous
      </Button>

      {/* Year Selector */}
      <Select
        value={activeYear}
        onChange={switchYear}
        style={{ width: 120 }}
        options={availableYears.map(year => ({
          value: year,
          label: year.toString(),
        }))}
      />

      {/* Month Selector */}
      <Select
        value={activeMonth}
        onChange={switchMonth}
        style={{ width: 150 }}
        options={months}
      />

      {/* Next Month Button */}
      <Button
        icon={<RightOutlined />}
        onClick={goToNextMonth}
        disabled={isShowingAllMonths}
      >
        Next
      </Button>

      {/* Jump to Current Month */}
      {!isCurrentMonth && (
        <Button
          type="primary"
          icon={<CalendarOutlined />}
          onClick={handleJumpToToday}
        >
          Today
        </Button>
      )}

      {/* Current View Indicator */}
      {isShowingAllMonths ? (
        <Tag color="blue">Viewing: All {activeYear}</Tag>
      ) : (
        <Tag color="green">
          Viewing: {months.find(m => m.value === activeMonth)?.label} {activeYear}
        </Tag>
      )}
    </Space>
  );
};

export default MonthSelector;
