export interface DateTimeHeadingProps {
  /** Pre-formatted, e.g. "Nov 1, 2026". Formatting belongs to the data layer. */
  date: string;
  /** Pre-formatted, e.g. "13:00" or "13:00 - 14:00". */
  time?: string;
}

export const DateTimeHeading: React.FC<DateTimeHeadingProps> = ({
  date,
  time,
}) => (
  <>
    <strong>{time ? `${date} | ` : date}</strong>
    {time}
  </>
);

export default DateTimeHeading;
