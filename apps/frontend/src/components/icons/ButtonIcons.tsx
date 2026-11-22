import type { SVGProps } from 'react';

// Exported from the Figma Icons/Buttons frames (156:1559, 528:7117). Paths and
// root sizes are the exported ones; only the stroke is changed to
// `currentColor` so the parent button or filter can recolor them. They are
// decorative: put an aria-label on the wrapping button instead.
//
// Not in `icons/index.tsx` on purpose: #76 creates that file with its own
// UploadIcon, and sharing a path would conflict on merge. Consolidate later.

type IconProps = Omit<SVGProps<SVGSVGElement>, 'children'>;

const common = {
  fill: 'none',
  'aria-hidden': true,
  focusable: false,
} as const;

const stroke = {
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

export const UploadIcon: React.FC<IconProps> = (props) => (
  <svg width="20" height="20" viewBox="0 0 20 20" {...common} {...props}>
    <path
      d="M17.5 12.5V15.8333C17.5 16.2754 17.3244 16.6993 17.0118 17.0118C16.6993 17.3244 16.2754 17.5 15.8333 17.5H4.16667C3.72464 17.5 3.30072 17.3244 2.98816 17.0118C2.67559 16.6993 2.5 16.2754 2.5 15.8333V12.5M5.83333 6.66667L10 2.5L14.1667 6.66667M10 2.5V12.5"
      strokeWidth="1.5"
      {...stroke}
    />
  </svg>
);

export const RefreshIcon: React.FC<IconProps> = (props) => (
  <svg
    width="15.5556"
    height="15.5556"
    viewBox="0 0 15.5556 15.5556"
    overflow="visible"
    {...common}
    {...props}
  >
    <path
      d="M0.777778 7.77778C0.777778 5.92126 1.51528 4.14078 2.82803 2.82803C4.14078 1.51528 5.92126 0.777778 7.77778 0.777778C9.7347 0.78514 11.613 1.54873 13.02 2.90889L14.7778 4.66667M10.8889 4.66667H14.7778V0.777778M14.7778 7.77778C14.7778 9.63429 14.0403 11.4148 12.7275 12.7275C11.4148 14.0403 9.63429 14.7778 7.77778 14.7778C5.82085 14.7704 3.94253 14.0068 2.53556 12.6467L0.777778 10.8889M0.777778 14.7778V10.8889H4.66667"
      strokeWidth="1.55556"
      {...stroke}
    />
  </svg>
);

export const AddTextIcon: React.FC<IconProps> = (props) => (
  <svg
    width="15.75"
    height="19.35"
    viewBox="0 0 15.75 19.35"
    overflow="visible"
    {...common}
    {...props}
  >
    <path
      d="M9.675 0.675V4.275C9.675 4.75239 9.86464 5.21023 10.2022 5.54779C10.5398 5.88536 10.9976 6.075 11.475 6.075H15.075M5.175 10.575V9.675H10.575V10.575M7.875 9.675V15.075M6.975 15.075H8.775M10.575 0.675H2.475C1.99761 0.675 1.53977 0.864642 1.20221 1.20221C0.864642 1.53977 0.675 1.99761 0.675 2.475V16.875C0.675 17.3524 0.864642 17.8102 1.20221 18.1478C1.53977 18.4854 1.99761 18.675 2.475 18.675H13.275C13.7524 18.675 14.2102 18.4854 14.5478 18.1478C14.8854 17.8102 15.075 17.3524 15.075 16.875V5.175L10.575 0.675Z"
      strokeWidth="1.35"
      {...stroke}
    />
  </svg>
);

/** Small right-pointing chevron from the Source button, rotated 90deg in
 * Figma so it points down. The wrapper has the rotated 15.8 x 14 box. */
export const ChevronDownIcon: React.FC<IconProps> = (props) => (
  <span
    aria-hidden="true"
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 15.825,
      height: 14,
      flexShrink: 0,
    }}
  >
    <svg
      width="14"
      height="15.8254"
      viewBox="0 0 14 15.8254"
      overflow="visible"
      style={{ transform: 'rotate(90deg)', flex: 'none' }}
      {...common}
      {...props}
    >
      <path
        d="M4.86982 12.1731L9.13018 7.91272L4.86982 3.65237"
        strokeWidth="1.54922"
        {...stroke}
      />
    </svg>
  </span>
);

/** Large green right chevron of the icon-only "Open" button. */
export const ChevronRightIcon: React.FC<IconProps> = (props) => (
  <svg
    width="22.9988"
    height="25.9976"
    viewBox="0 0 22.9988 25.9976"
    overflow="visible"
    {...common}
    {...props}
  >
    <path
      d="M8 19.9976L14.9988 12.9988L8 6"
      strokeWidth="2.54501"
      {...stroke}
    />
  </svg>
);

export const CalendarIcon: React.FC<IconProps> = (props) => (
  <svg
    width="17.6"
    height="17.6"
    viewBox="0 0 17.6 17.6"
    overflow="visible"
    {...common}
    {...props}
  >
    <path
      d="M4 2.4H13.6C15.3673 2.4 16.8 3.83269 16.8 5.6V13.6C16.8 15.3673 15.3673 16.8 13.6 16.8H4C2.23269 16.8 0.8 15.3673 0.8 13.6V5.6C0.8 3.83269 2.23269 2.4 4 2.4Z"
      strokeWidth="1.6"
      {...stroke}
    />
    <path d="M5.6 0.8V4M12 0.8V4M0.8 7.2H16.8" strokeWidth="1.6" {...stroke} />
  </svg>
);

/** Filter dropdown chevron: same idea as ChevronDownIcon, 17.5 x 19.8, drawn
 * rotated 90deg in Figma, wrapper holds the rotated 19.8 x 17.5 box. */
export const FilterChevronIcon: React.FC<IconProps> = (props) => (
  <span
    aria-hidden="true"
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 19.781,
      height: 17.499,
      flexShrink: 0,
    }}
  >
    <svg
      width="17.4994"
      height="19.7811"
      viewBox="0 0 17.4994 19.7811"
      overflow="visible"
      style={{ transform: 'rotate(90deg)', flex: 'none' }}
      {...common}
      {...props}
    >
      <path
        d="M6.08707 15.2158L11.4123 9.89056L6.08707 4.5653"
        strokeWidth="1.93646"
        {...stroke}
      />
    </svg>
  </span>
);
