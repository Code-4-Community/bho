// Temporary page (#68) for checking the tokens against Figma. Only routed in dev.

import { useEffect, useState } from 'react';
import { mockEntries } from '@api/mocks/entries';
import { mockErrorLog } from '@api/mocks/errorLog';
import {
  ErrorLogTable,
  type ErrorLogRange,
  type ErrorLogSource,
} from '@components/ErrorLogTable';
import { SubmittedEntriesTable } from '@components/SubmittedEntriesTable';

const SHADES = [100, 200, 300, 400, 500, 600, 700, 800];
const PALETTE: [string, number[]][] = [
  ['mustard', SHADES],
  ['sea-green', SHADES],
  ['beige', SHADES],
  ['blue', [50, ...SHADES]],
  ['deep-blue', [50, ...SHADES]],
  ['error', [100, 500]],
];

const SEMANTIC = [
  'brand',
  'primary',
  'text',
  'text-muted',
  'text-inverse',
  'bg-page',
  'bg-card',
  'bg-card-header',
  'bg-table-header',
  'border',
];

const STATUSES = ['success', 'warning', 'danger', 'info'];

const TYPE_STYLES = [
  ['page-title', 'Page title', 'Good Morning, Jane'],
  ['heading-2', 'Heading 2', 'Daily Weather Data'],
  ['section-title', 'Section title', 'Entry Status'],
  ['body-lg', 'Body large', 'Peak gust 112 mph'],
  ['body', 'Body', 'Station pressure 29.90 in'],
  ['caption', 'Caption', 'Updated 5 seconds ago'],
  ['tile-number', 'Tile number', '13:59:59'],
];

const value = (token: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(token).trim();

function Swatch({ token }: { token: string }) {
  return (
    <figure style={{ margin: 0, width: 120 }}>
      <div
        style={{
          height: 48,
          background: `var(${token})`,
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-sm)',
        }}
      />
      <figcaption style={{ font: 'var(--text-caption)' }}>
        {token}
        <br />
        <span style={{ color: 'var(--color-text-muted)' }}>{value(token)}</span>
      </figcaption>
    </figure>
  );
}

const row = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 'var(--space-4)',
} as const;

const section = {
  background: 'var(--color-bg-card)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  padding: 'var(--space-6)',
  display: 'grid',
  gap: 'var(--space-6)',
} as const;

const caption = {
  font: 'var(--text-caption)',
  color: 'var(--color-text-muted)',
  margin: 0,
};

function Tables() {
  const [source, setSource] = useState<ErrorLogSource>('all');
  const [range, setRange] = useState<ErrorLogRange>('24h');
  const [opened, setOpened] = useState('none');
  const filterKey = `${source} ${range}`;
  const [loadedKey, setLoadedKey] = useState<string>();
  useEffect(() => {
    const timer = setTimeout(() => setLoadedKey(filterKey), 800);
    return () => clearTimeout(timer);
  }, [filterKey]);
  const filters = {
    source,
    range,
    onSourceChange: setSource,
    onRangeChange: setRange,
    onClearFilters: () => {
      setSource('all');
      setRange('24h');
    },
  };
  const noop = () => undefined;

  return (
    <>
      <p style={caption}>With data. Last opened row: {opened}</p>
      <SubmittedEntriesTable
        entries={mockEntries}
        onRowClick={setOpened}
        onClearFilters={noop}
      />
      <p style={caption}>Empty</p>
      <SubmittedEntriesTable
        entries={[]}
        onRowClick={setOpened}
        onClearFilters={noop}
      />
      <p style={caption}>
        With data. Changing a filter fakes an 800ms fetch, and Source filters
        the mocks.
      </p>
      <ErrorLogTable
        entries={mockErrorLog.filter(
          (e) => source === 'all' || e.source === source,
        )}
        loading={loadedKey !== filterKey}
        {...filters}
      />
      <p style={caption}>Empty</p>
      <ErrorLogTable entries={[]} {...filters} />
    </>
  );
}

const Design: React.FC = () => (
  <main
    style={{
      padding: 'var(--space-8)',
      display: 'grid',
      gap: 'var(--space-8)',
    }}
  >
    <h1>Design tokens</h1>

    <section style={section}>
      <h3>Palette</h3>
      {PALETTE.map(([name, shades]) => (
        <div key={name} style={row}>
          {shades.map((shade) => (
            <Swatch key={shade} token={`--${name}-${shade}`} />
          ))}
        </div>
      ))}
    </section>

    <section style={section}>
      <h3>Semantic colors</h3>
      <div style={row}>
        {SEMANTIC.map((name) => (
          <Swatch key={name} token={`--color-${name}`} />
        ))}
      </div>
    </section>

    <section style={section}>
      <h3>Status colors</h3>
      <div style={row}>
        {STATUSES.map((status) => (
          <div key={status} style={{ display: 'grid', gap: 'var(--space-2)' }}>
            <span
              style={{
                font: 'var(--text-caption)',
                fontWeight: 'var(--font-weight-bold)',
                color: `var(--color-${status})`,
                background: `var(--color-${status}-bg)`,
                border: `1px solid var(--color-${status})`,
                borderRadius: 'var(--radius-pill)',
                padding: 'var(--space-1) var(--space-3)',
                justifySelf: 'start',
              }}
            >
              {status}
            </span>
            <div style={row}>
              <Swatch token={`--color-${status}`} />
              <Swatch token={`--color-${status}-bg`} />
            </div>
          </div>
        ))}
      </div>
    </section>

    <section style={section}>
      <h3>Type styles</h3>
      {TYPE_STYLES.map(([token, label, sample]) => (
        <div
          key={token}
          style={{
            display: 'grid',
            gridTemplateColumns: '200px 1fr',
            alignItems: 'baseline',
            gap: 'var(--space-4)',
          }}
        >
          <span
            style={{
              font: 'var(--text-caption)',
              color: 'var(--color-text-muted)',
            }}
          >
            {label}
            <br />
            --text-{token}
          </span>
          <span style={{ font: `var(--text-${token})` }}>{sample}</span>
        </div>
      ))}
    </section>

    <section style={section}>
      <h3>Tables</h3>
      <Tables />
    </section>
  </main>
);

export default Design;
