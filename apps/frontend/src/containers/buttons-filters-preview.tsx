import { useState } from 'react';
import {
  Button,
  type ButtonVariant,
  type ButtonSize,
} from '@components/Button';
import { Filter } from '@components/Filter';
import {
  AddTextIcon,
  CalendarIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  RefreshIcon,
  UploadIcon,
} from '@components/icons/ButtonIcons';
import {
  DATE_PRESETS,
  DEFAULT_DATE,
  DEFAULT_UPLOADER,
  MOCK_ENTRIES,
  UPLOADER_OPTIONS,
  filterEntries,
} from './mockFilters';

// Temporary dev-only page (#94) for checking Button and Filter against Figma
// frames 156:1559, 528:7117 and 528:7052.

const row = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 'var(--space-4)',
} as const;

const section = {
  background: 'var(--color-bg-card)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  padding: 'var(--space-6)',
  display: 'grid',
  gap: 'var(--space-4)',
} as const;

const caption = {
  font: 'var(--text-caption)',
  color: 'var(--color-text-muted)',
} as const;

const dateOptions = DATE_PRESETS.map(({ value, label }) => ({ value, label }));

// One entry per Figma button: label, variant, icons.
const FIGMA_BUTTONS: {
  label: string;
  variant: ButtonVariant;
  left?: React.ReactNode;
  right?: React.ReactNode;
}[] = [
  { label: 'Upload', variant: 'primary', left: <UploadIcon /> },
  { label: 'Re-Upload', variant: 'primary', left: <UploadIcon /> },
  { label: 'Refresh', variant: 'primary', left: <RefreshIcon /> },
  { label: 'Source: All', variant: 'primary', right: <ChevronDownIcon /> },
  { label: 'Download', variant: 'primary' },
  { label: 'Cancel', variant: 'secondary' },
  { label: 'Close', variant: 'secondary' },
  { label: 'Submit', variant: 'primary' },
  { label: 'Add Text', variant: 'primary', left: <AddTextIcon /> },
  { label: 'Clear Filters', variant: 'dark' },
  { label: 'Today’s Entry', variant: 'link' },
];

const SIZES: ButtonSize[] = ['md', 'sm'];

const ButtonsSection: React.FC = () => (
  <section style={section}>
    <h3>Buttons</h3>
    {SIZES.map((size) => (
      <div key={size} style={{ display: 'grid', gap: 'var(--space-4)' }}>
        <span style={caption}>size {size}: default</span>
        <div style={row}>
          {FIGMA_BUTTONS.map((b) => (
            <Button
              key={b.label}
              variant={b.variant}
              size={size}
              leftIcon={b.left}
              rightIcon={b.right}
            >
              {b.label}
            </Button>
          ))}
          <Button
            variant="ghost"
            size={size}
            aria-label="Open entry"
            leftIcon={<ChevronRightIcon width={13} height={16} />}
          />
        </div>
        <span style={caption}>size {size}: disabled</span>
        <div style={row}>
          {FIGMA_BUTTONS.map((b) => (
            <Button
              key={b.label}
              variant={b.variant}
              size={size}
              disabled
              leftIcon={b.left}
              rightIcon={b.right}
            >
              {b.label}
            </Button>
          ))}
          <Button
            variant="ghost"
            size={size}
            disabled
            aria-label="Open entry (disabled)"
            leftIcon={<ChevronRightIcon width={13} height={16} />}
          />
        </div>
        <span style={caption}>size {size}: loading</span>
        <div style={row}>
          {FIGMA_BUTTONS.filter((b) => b.variant !== 'link').map((b) => (
            <Button
              key={b.label}
              variant={b.variant}
              size={size}
              loading
              leftIcon={b.left}
              rightIcon={b.right}
            >
              {b.label}
            </Button>
          ))}
          <Button variant="primary" size={size} loading loadingText="Saving">
            Submit
          </Button>
        </div>
      </div>
    ))}
    <span style={caption}>link variant as a real anchor</span>
    <div style={row}>
      <Button variant="link" href="#today">
        Today’s Entry
      </Button>
    </div>
  </section>
);

const FiltersSection: React.FC = () => {
  const [date, setDate] = useState(DEFAULT_DATE);
  const [uploader, setUploader] = useState(DEFAULT_UPLOADER);
  return (
    <section style={section}>
      <h3>Filters</h3>
      <div style={{ ...row, alignItems: 'flex-start' }}>
        <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
          <Filter
            options={dateOptions}
            value={date}
            onChange={setDate}
            icon={<CalendarIcon />}
            width="442px"
          />
          <span style={caption}>selected: {date}</span>
        </div>
        <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
          <Filter
            options={UPLOADER_OPTIONS}
            value={uploader}
            onChange={setUploader}
            width="346px"
          />
          <span style={caption}>selected: {uploader}</span>
        </div>
        <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
          <Filter
            options={UPLOADER_OPTIONS}
            value={uploader}
            onChange={setUploader}
            width="346px"
            disabled
          />
          <span style={caption}>disabled</span>
        </div>
        <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
          <Filter
            options={UPLOADER_OPTIONS}
            value={uploader}
            onChange={setUploader}
            size="sm"
            width="200px"
          />
          <span style={caption}>size sm</span>
        </div>
      </div>
    </section>
  );
};

// Composed like Figma 528:7052 / 531:16311.
const FilterBarSection: React.FC = () => {
  const [date, setDate] = useState(DEFAULT_DATE);
  const [uploader, setUploader] = useState(DEFAULT_UPLOADER);
  const count = filterEntries(MOCK_ENTRIES, date, uploader).length;
  const reset = () => {
    setDate(DEFAULT_DATE);
    setUploader(DEFAULT_UPLOADER);
  };
  return (
    <section style={section}>
      <h3>Filter bar</h3>
      <div style={{ ...row, alignItems: 'flex-end' }}>
        <Filter
          label="Date range"
          options={dateOptions}
          value={date}
          onChange={setDate}
          icon={<CalendarIcon />}
          width="442px"
        />
        <Filter
          label="Uploaded by"
          options={UPLOADER_OPTIONS}
          value={uploader}
          onChange={setUploader}
          width="346px"
        />
        <span
          role="status"
          style={{ marginInlineStart: 'auto', font: 'var(--text-body)' }}
        >
          {count} {count === 1 ? 'entry' : 'entries'}
        </span>
      </div>
      {count === 0 ? (
        <div style={row}>
          <Button variant="dark" onClick={reset}>
            Clear Filters
          </Button>
          <span style={caption}>No entries match these filters.</span>
        </div>
      ) : null}
      <span style={caption}>
        Tip: pick “Sep 1 - Sep 30, 2026” to see 0 entries and Clear Filters.
      </span>
    </section>
  );
};

const ButtonsFiltersPreview: React.FC = () => (
  <main
    style={{
      padding: 'var(--space-8)',
      display: 'grid',
      gap: 'var(--space-8)',
    }}
  >
    <h1>Button and Filter</h1>
    <ButtonsSection />
    <FiltersSection />
    <FilterBarSection />
  </main>
);

export default ButtonsFiltersPreview;
