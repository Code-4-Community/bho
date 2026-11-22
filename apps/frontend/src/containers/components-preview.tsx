// Temporary dev page (#67) for checking the small components. Only routed in dev.
import {
  DateTimeHeading,
  LastUploadTile,
  Section,
  SectionRow,
  Tag,
  TAG_VARIANTS,
  Tile,
  TagVariant,
} from '@components';
import {
  EditLogEntry,
  editLogA,
  editLogB,
  openItems,
  recentActivity,
} from './mockSections';

const circleIcon = (color: string, mark: string) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d={mark} />
  </svg>
);

const warningIcon = circleIcon('var(--color-warning)', 'M12 7v6M12 16.5v.01');
const scheduledIcon = circleIcon('var(--color-info)', 'M7 12h10');

const h = { margin: '40px 0 16px', font: 'var(--text-section-title)' };
const grid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(165px, 1fr))',
  gap: 16,
};

const EditLog: React.FC<{ rows: EditLogEntry[] }> = ({ rows }) => (
  <Section title="Edit Log" headerAction="2 uploads">
    {rows.map((r) => (
      <SectionRow
        key={r.file}
        heading={<DateTimeHeading date={r.date} time={r.time} />}
        label={r.uploader}
        subtitle={r.file}
        subtitleHref="#"
        highlighted={r.status === 'current'}
        tag={<Tag variant={r.status} />}
      />
    ))}
  </Section>
);

const ComponentsPreview: React.FC = () => (
  <main style={{ maxWidth: 720, margin: '0 auto', padding: 24 }}>
    <h1>Small components</h1>

    <h2 style={h}>Tag</h2>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
      {(Object.keys(TAG_VARIANTS) as TagVariant[]).map((v) => (
        <Tag key={v} variant={v} />
      ))}
      <Tag variant="corrected" count={3} />
      <Tag tone="success">Today&apos;s Entry 11/1</Tag>
      <Tag tone="warning">Past Entry 10/31</Tag>
      <Tag tone="neutral">Neutral</Tag>
    </div>

    <h2 style={h}>Tile</h2>
    <div style={grid}>
      <Tile label="Rejected Values" value={6} tone="warning" />
      <LastUploadTile time="13:59:59" uploadedBy="John Doe" />
      <Tile label="No data yet" value={null} />
      <Tile label="Neutral" value={12} />
      <Tile label="Warning" value={3} tone="warning" />
      <Tile label="Info" value={7} tone="info" />
      <Tile label="Success" value={0} tone="success" />
    </div>

    <h2 style={h}>Sections</h2>
    <div style={{ display: 'grid', gap: 24 }}>
      <Section
        title="Open Items"
        headerAction="3 flagged | 1 scheduled"
        maxHeight={360}
      >
        {openItems.map((item) => (
          <SectionRow
            key={`${item.date}${item.field}`}
            heading={<DateTimeHeading date={item.date} time={item.time} />}
            label={item.field}
            subtitle={item.reason}
            leadingIcon={item.kind === 'flagged' ? warningIcon : scheduledIcon}
            trailing="chevron"
            onClick={() => console.log('open', item.field)}
          />
        ))}
      </Section>

      <Section
        title="Recent Activity"
        headerAction={<a href="/dev/components#recent-activity">View all</a>}
      >
        {recentActivity.map((u) => (
          <SectionRow
            key={u.file}
            heading={<DateTimeHeading date={u.date} time={u.time} />}
            label={u.uploader}
            subtitle={u.file}
            subtitleHref="#"
            tag={<Tag tone={u.entry.tone}>{u.entry.label}</Tag>}
          />
        ))}
      </Section>

      <EditLog rows={editLogA} />
      <EditLog rows={editLogB} />

      <Section title="Loading" isLoading />
      <Section title="Empty" headerAction="0 items" />
    </div>
  </main>
);

export default ComponentsPreview;
