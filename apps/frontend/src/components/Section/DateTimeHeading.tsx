import { chakra } from '@chakra-ui/react';

export interface DateTimeHeadingProps {
  /** Pre-formatted, e.g. "Nov 1, 2026". Formatting belongs to the data layer. */
  date: string;
  /** Pre-formatted, e.g. "13:00" or "13:00 - 14:00". */
  time?: string;
}

/**
 * DateTimeHeading
 *
 * Heading content for a `SectionRow`: a bold date, a bold " | " separator, then
 * the time in regular weight, e.g. "**Nov 1, 2026 |** 13:00 - 14:00".
 *
 * Both values are pre-formatted strings, because date formatting belongs to the
 * data layer. Without a `time`, only the bold date renders and there is no
 * separator. It renders inline spans, so size and color come from the row.
 *
 * @example
 * <SectionRow heading={<DateTimeHeading date="Nov 1, 2026" time="13:00" />} />
 */
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
