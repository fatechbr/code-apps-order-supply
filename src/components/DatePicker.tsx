import ReactDatePicker from 'react-datepicker';
import './DatePicker.css';

interface DatePickerProps {
  id?: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
  minDate?: Date;
  maxDate?: Date;
  placeholderText?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export default function DatePicker({
  id,
  value,
  onChange,
  minDate,
  maxDate,
  placeholderText = 'Select date...',
  disabled = false,
  required = false,
  className = '',
}: DatePickerProps) {
  return (
    <ReactDatePicker
      id={id}
      selected={value}
      onChange={onChange}
      minDate={minDate}
      maxDate={maxDate}
      placeholderText={placeholderText}
      disabled={disabled}
      required={required}
      dateFormat="yyyy-MM-dd"
      className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 ${className}`}
      calendarClassName="dark-calendar"
      showPopperArrow={false}
      autoComplete="off"
    />
  );
}
