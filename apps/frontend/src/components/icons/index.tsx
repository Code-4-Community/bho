import type { SVGProps } from 'react';

// Exported from the Figma Icons frame (upload 163:9880, CSV 167:9918, close
// 168:10838, warning 156:6093). Colors come from `currentColor` / tokens so the
// parent can recolor them. All icons are decorative by default; put an
// aria-label on the wrapping button instead.

type IconProps = Omit<SVGProps<SVGSVGElement>, 'children'>;

/** Plain upload arrow in a 20px box (used inside buttons and the dropzone). */
export const UploadIcon: React.FC<IconProps> = (props) => (
  <svg
    width="20"
    height="20"
    viewBox="-1.75 -1.75 20 20"
    fill="none"
    aria-hidden="true"
    {...props}
  >
    <path
      d="M15.75 10.75V14.0833C15.75 14.5254 15.5744 14.9493 15.2618 15.2618C14.9493 15.5744 14.5254 15.75 14.0833 15.75H2.41667C1.97464 15.75 1.55072 15.5744 1.23816 15.2618C0.925595 14.9493 0.75 14.5254 0.75 14.0833V10.75M4.08333 4.91667L8.25 0.75L12.4167 4.91667M8.25 0.75V10.75"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * Upload arrow in a filled circle. The circle takes `currentColor`
 * (`--deep-blue-600` idle, `--blue-500` while dragging); the arrow is white.
 * Figma sets the whole group to 80% opacity.
 */
export const UploadCircleIcon: React.FC<IconProps> = (props) => (
  <svg
    width="40.5"
    height="40.5"
    viewBox="0 0 40.5 40.5"
    fill="none"
    aria-hidden="true"
    {...props}
  >
    <g opacity="0.8">
      <rect width="40.5" height="40.5" rx="20.25" fill="currentColor" />
      {/* 16.5px arrow centered in the 40.5px circle, as in the dropzone. */}
      <path
        transform="translate(12 12)"
        d="M15.75 10.75V14.0833C15.75 14.5254 15.5744 14.9493 15.2618 15.2618C14.9493 15.5744 14.5254 15.75 14.0833 15.75H2.41667C1.97464 15.75 1.55072 15.5744 1.23816 15.2618C0.925595 14.9493 0.75 14.5254 0.75 14.0833V10.75M4.08333 4.91667L8.25 0.75L12.4167 4.91667M8.25 0.75V10.75"
        stroke="var(--color-text-inverse)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  </svg>
);

/** CSV file glyph. Figma draws it in black; it follows `currentColor`. */
export const CsvFileIcon: React.FC<IconProps> = (props) => (
  <svg
    width="21.25"
    height="22.12"
    viewBox="0 0 21.2508 22.1151"
    fill="none"
    aria-hidden="true"
    {...props}
  >
    <path
      opacity="0.2"
      d="M2.53061 11.9901V4.72007C2.53061 2.85007 2.53061 1.92007 3.10061 1.33007C3.68061 0.750071 4.62061 0.730071 6.48061 0.720071L8.68061 0.690071C9.96061 0.690071 10.6006 0.670071 11.0806 0.950071C11.3726 1.11973 11.6168 1.36054 11.7906 1.65007C12.0706 2.13007 12.0706 2.77007 12.0706 4.05007C12.0706 5.33007 12.0706 5.97007 12.3506 6.44007C12.5216 6.72838 12.7623 6.96908 13.0506 7.14007C13.5206 7.42007 14.1606 7.42007 15.4406 7.42007C16.7106 7.42007 17.3406 7.42007 17.8206 7.70007C18.1089 7.87106 18.3496 8.11176 18.5206 8.40007C18.8006 8.87007 18.8006 9.50007 18.8006 10.7801V12.0101L2.53061 11.9901Z"
      fill="currentColor"
    />
    <path
      d="M2.53061 11.9401V6.74009C2.53061 3.92009 2.53061 2.51009 3.40061 1.63009C4.28061 0.750092 5.70061 0.750092 8.53061 0.750092H10.3706C11.5906 0.750092 12.2106 0.750092 12.7606 0.980092C13.3106 1.20009 13.7406 1.64009 14.6106 2.50009L15.8306 3.72009L16.9906 4.85009C17.8906 5.72009 18.3306 6.15009 18.5606 6.71009C18.8006 7.27009 18.8006 7.90009 18.8006 9.15009V11.9401"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M11.8806 1.26007V3.67007C11.8806 5.56007 11.8706 6.50007 12.4606 7.09007C13.0406 7.68007 13.9906 7.68007 15.8706 7.68007H18.2906M15.5206 14.8001L18.0206 21.3601M20.5006 14.8001L18.0106 21.3601M5.62062 15.0301C5.10991 14.7699 4.54098 14.6451 3.96827 14.6677C3.39555 14.6902 2.8382 14.8593 2.34951 15.1588C1.86082 15.4583 1.45715 15.8782 1.1771 16.3783C0.897056 16.8783 0.75 17.4419 0.75 18.0151C0.75 18.5882 0.897056 19.1518 1.1771 19.6519C1.45715 20.152 1.86082 20.5718 2.34951 20.8713C2.8382 21.1708 3.39555 21.3399 3.96827 21.3625C4.54098 21.385 5.10991 21.2602 5.62062 21.0001M13.0906 15.5401C12.4446 14.9847 11.6225 14.6764 10.7706 14.6701C9.66062 14.6701 8.45062 15.2301 8.45062 16.4101C8.45062 18.9501 13.0906 16.9301 13.0906 19.5101C13.0906 20.7101 11.9006 21.3601 10.7706 21.3601C9.63062 21.3601 8.87062 21.0401 8.35062 20.3301"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** Document with a "T", used by the Add Text button (Figma 412:8639). Drawn in `currentColor`. */
export const TextFileIcon: React.FC<IconProps> = (props) => (
  <svg
    width="15.75"
    height="19.35"
    viewBox="0 0 15.75 19.35"
    fill="none"
    aria-hidden="true"
    {...props}
  >
    <path
      d="M9.675 0.675V4.275C9.675 4.75239 9.86464 5.21023 10.2022 5.54779C10.5398 5.88536 10.9976 6.075 11.475 6.075H15.075M5.175 10.575V9.675H10.575V10.575M7.875 9.675V15.075M6.975 15.075H8.775M10.575 0.675H2.475C1.99761 0.675 1.53977 0.864642 1.20221 1.20221C0.864642 1.53977 0.675 1.99761 0.675 2.475V16.875C0.675 17.3524 0.864642 17.8102 1.20221 18.1478C1.53977 18.4854 1.99761 18.675 2.475 18.675H13.275C13.7524 18.675 14.2102 18.4854 14.5478 18.1478C14.8854 17.8102 15.075 17.3524 15.075 16.875V5.175L10.575 0.675Z"
      stroke="currentColor"
      strokeWidth="1.35"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** Close "x", 12px (Figma default variant). */
export const CloseIcon: React.FC<IconProps> = (props) => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 12 12"
    fill="none"
    aria-hidden="true"
    {...props}
  >
    <path
      d="M11 1L1 11M1 1L11 11"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** Red warning triangle (Figma "circle-alert" frame, error variant). */
export const WarningIcon: React.FC<IconProps> = (props) => (
  <svg
    width="19.65"
    height="17.8"
    viewBox="0 0 19.6483 17.7999"
    fill="none"
    aria-hidden="true"
    {...props}
  >
    <path
      d="M0.906638 15.1099C0.838638 14.4629 1.29264 13.6749 2.20264 12.0999L7.05364 3.69792L7.0559 3.69401C7.96339 2.12361 8.41813 1.3367 9.01064 1.07292C9.26669 0.958914 9.54385 0.9 9.82414 0.9C10.1044 0.9 10.3816 0.958914 10.6376 1.07292C11.2315 1.33687 11.6865 2.12464 12.5952 3.69809L12.5956 3.69892L17.4456 12.0989C18.3556 13.6749 18.8096 14.4629 18.7416 15.1089C18.7123 15.3877 18.6246 15.6572 18.4844 15.8999C18.3442 16.1427 18.1545 16.3532 17.9276 16.5179C17.4026 16.8999 16.4936 16.8999 14.6766 16.8999H4.97364C3.15464 16.8999 2.24564 16.8999 1.71964 16.5179C1.49309 16.3532 1.30366 16.1428 1.16361 15.9003C1.02356 15.6577 0.93601 15.3885 0.906638 15.1099Z"
      fill="var(--color-danger-bg)"
    />
    <path
      d="M9.82364 5.89992V9.89992M2.20264 12.0999C1.29264 13.6749 0.838638 14.4629 0.906638 15.1099C0.93601 15.3885 1.02356 15.6577 1.16361 15.9003C1.30366 16.1428 1.49309 16.3532 1.71964 16.5179C2.24564 16.8999 3.15464 16.8999 4.97364 16.8999H14.6766C16.4936 16.8999 17.4026 16.8999 17.9276 16.5179C18.1545 16.3532 18.3442 16.1427 18.4844 15.8999C18.6246 15.6572 18.7123 15.3877 18.7416 15.1089C18.8096 14.4629 18.3556 13.6749 17.4456 12.0989L12.5956 3.69892L12.5952 3.69809C11.6865 2.12464 11.2315 1.33687 10.6376 1.07292C10.3816 0.958914 10.1044 0.9 9.82414 0.9C9.54385 0.9 9.26669 0.958914 9.01064 1.07292C8.41813 1.3367 7.96339 2.12361 7.0559 3.69401L7.05364 3.69792L2.20264 12.0999ZM9.87464 12.8999V12.9999H9.77464V12.8999H9.87464Z"
      stroke="var(--color-danger)"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
