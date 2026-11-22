// Temporary dev page (#67) for checking the small components. Only routed in dev.
import { Box, Flex, Heading, Image, SimpleGrid, Stack } from '@chakra-ui/react';
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
import warningIcon from '../assets/icons/circle-alert-warning.svg';
import scheduledIcon from '../assets/icons/circle-alert-null.svg';
import {
  EditLogEntry,
  editLogA,
  editLogB,
  openItems,
  recentActivity,
} from './mockSections';

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

const PreviewHeading: React.FC<{ children: string }> = ({ children }) => (
  <Heading as="h2" mt="40px" mb="16px" fontSize="var(--font-size-h3)">
    {children}
  </Heading>
);

const ComponentsPreview: React.FC = () => (
  <Box as="main" maxW="720px" mx="auto" p="24px">
    <Heading as="h1">Small components</Heading>

    <PreviewHeading>Tag</PreviewHeading>
    <Flex wrap="wrap" gap="12px">
      {(Object.keys(TAG_VARIANTS) as TagVariant[]).map((v) => (
        <Tag key={v} variant={v} />
      ))}
      <Tag variant="corrected" count={3} />
      <Tag tone="success">Today&apos;s Entry 11/1</Tag>
      <Tag tone="warning">Past Entry 10/31</Tag>
      <Tag tone="neutral">Neutral</Tag>
    </Flex>

    <PreviewHeading>Tile</PreviewHeading>
    <SimpleGrid columns={{ base: 2, sm: 4 }} gap="16px">
      <Tile label="Rejected Values" value={6} tone="warning" />
      <LastUploadTile time="13:59:59" uploadedBy="John Doe" />
      <Tile label="No data yet" value={null} />
      <Tile label="Neutral" value={12} />
      <Tile label="Warning" value={3} tone="warning" />
      <Tile label="Info" value={7} tone="info" />
      <Tile label="Success" value={0} tone="success" />
    </SimpleGrid>

    <PreviewHeading>Sections</PreviewHeading>
    <Stack gap="24px">
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
            leadingIcon={
              <Image
                src={item.kind === 'flagged' ? warningIcon : scheduledIcon}
                alt=""
              />
            }
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
    </Stack>
  </Box>
);

export default ComponentsPreview;
