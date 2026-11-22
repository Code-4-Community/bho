import { Select, createListCollection } from '@chakra-ui/react';
import { useMemo } from 'react';
import { ChevronDown } from 'lucide-react';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterProps {
  /** Visible label above the trigger ("Date range", "Uploaded by"). */
  label?: string;
  options: FilterOption[];
  /** Controlled value. */
  value: string;
  onChange: (value: string) => void;
  /** Shown when `value` matches no option. */
  placeholder?: string;
  /** Leading icon, e.g. the calendar on the date filter. Decorative. */
  icon?: React.ReactNode;
  /** `md` is Figma's 54px. `sm` is a compact option (not in Figma). */
  size?: 'sm' | 'md';
  disabled?: boolean;
  /** Figma widths differ per filter (date ~442px, uploader ~346px). */
  width?: string | number;
}

// Not in tokens.css yet, listed in the PR: Figma's filter height (54px) and
// its compact size (assumption), and the 12/14px padding.
const HEIGHT = { md: '54px', sm: '40px' } as const;

/**
 * Dropdown filter from the Figma "Filter" frame (528:7117). Built on Chakra's
 * accessible `Select`, so the trigger exposes `aria-expanded`, options expose
 * `aria-selected`, and Enter / Space / Arrows open, arrows move, Enter selects
 * and Escape closes.
 *
 * Controlled: it shows the label of `value` (or `placeholder` when no option
 * matches) and calls `onChange` with the picked option's `value`. `label`
 * renders above the trigger and is wired to it. `icon` is a decorative leading
 * icon (the calendar on the date filter).
 *
 * The date filter is this same component fed preset ranges. A real date-range
 * picker can replace the options later without changing this API.
 *
 * @example
 * <Filter
 *   label="Uploaded by"
 *   options={[{ value: 'all', label: 'All uploaders' }]}
 *   value={uploader}
 *   onChange={setUploader}
 *   width="346px"
 * />
 */
export function Filter({
  label,
  options,
  value,
  onChange,
  placeholder,
  icon,
  size = 'md',
  disabled = false,
  width,
}: FilterProps) {
  const collection = useMemo(
    () => createListCollection({ items: options }),
    [options],
  );
  const current = options.some((o) => o.value === value) ? [value] : [];

  return (
    <Select.Root
      collection={collection}
      value={current}
      onValueChange={(e) => {
        if (e.value[0] !== undefined) onChange(e.value[0]);
      }}
      disabled={disabled}
      positioning={{ sameWidth: true }}
      width={width ?? 'auto'}
      minW={0}
      gap="var(--space-2)"
    >
      <Select.HiddenSelect />
      {label ? (
        <Select.Label
          fontFamily="var(--font-body)"
          fontSize="var(--font-size-body-sm)"
          lineHeight="24px"
          fontWeight="var(--font-weight-regular)"
          color="var(--color-text)"
        >
          {label}
        </Select.Label>
      ) : null}
      <Select.Control>
        <Select.Trigger
          h={HEIGHT[size]}
          py="14px"
          pl={icon ? '14px' : 'var(--space-3)'}
          pr="var(--space-3)"
          gap="var(--space-3)"
          bg="var(--color-bg-card)"
          color="var(--color-text)"
          borderWidth="1px"
          borderStyle="solid"
          borderColor="var(--deep-blue-200)"
          borderRadius="var(--radius-md)"
          fontFamily="var(--font-body)"
          fontSize="var(--font-size-body-md)"
          fontWeight="var(--font-weight-regular)"
          lineHeight="24px"
          cursor="pointer"
          justifyContent="space-between"
          transition="background-color 120ms"
          _hover={{ bg: 'var(--deep-blue-50)' }}
          _open={{ bg: 'var(--deep-blue-50)' }}
          _focusVisible={{
            outline: '2px solid var(--sea-green-600)',
            outlineOffset: '2px',
          }}
          _disabled={{ opacity: 0.5, cursor: 'not-allowed' }}
        >
          {icon ? (
            <span
              aria-hidden="true"
              style={{ display: 'inline-flex', flexShrink: 0 }}
            >
              {icon}
            </span>
          ) : null}
          <Select.ValueText
            placeholder={placeholder}
            flex="1"
            textAlign="start"
            whiteSpace="nowrap"
          />
          <ChevronDown size={20} strokeWidth={2} />
        </Select.Trigger>
      </Select.Control>
      <Select.Positioner>
        <Select.Content
          bg="var(--color-bg-card)"
          color="var(--color-text)"
          borderWidth="1px"
          borderStyle="solid"
          borderColor="var(--deep-blue-200)"
          borderRadius="var(--radius-md)"
          fontFamily="var(--font-body)"
          fontSize="var(--font-size-body-md)"
        >
          {collection.items.map((item) => (
            <Select.Item
              key={item.value}
              item={item}
              px="var(--space-3)"
              py="var(--space-2)"
              cursor="pointer"
              _highlighted={{ bg: 'var(--deep-blue-50)' }}
              _selected={{ fontWeight: 'var(--font-weight-bold)' }}
            >
              <Select.ItemText>{item.label}</Select.ItemText>
              <Select.ItemIndicator />
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Positioner>
    </Select.Root>
  );
}
