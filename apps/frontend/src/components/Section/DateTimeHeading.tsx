import { chakra } from '@chakra-ui/react';

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
    <chakra.span fontWeight="var(--font-weight-bold)">
      {time ? `${date} | ` : date}
    </chakra.span>
    {time && (
      <chakra.span fontWeight="var(--font-weight-regular)">{time}</chakra.span>
    )}
  </>
);

export default DateTimeHeading;
