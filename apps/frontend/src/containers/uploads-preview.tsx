// Dev-only page (#76) showing every Figma variant of the upload components.
// Routed at /dev/uploads only when import.meta.env.DEV.
import { Button, Flex, Heading, Stack, Text } from '@chakra-ui/react';
import { useState } from 'react';
import {
  FileItem,
  FileRejected,
  Subsection,
  UploadFile,
  type FileRejection,
} from '@components/index';
import { CsvFileIcon, TextFileIcon } from '@components/icons';
import {
  H2,
  H3,
  primaryButtonProps,
  secondaryButtonProps,
} from '@components/styles';
import {
  mockCsv,
  mockOversizedCsv,
  mockPdf,
  mockRejections,
  useFakeUpload,
} from './mockUploads';

const Block: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <Stack as="section" gap="var(--space-3)">
    <Heading as="h2" color="var(--color-text)" {...H3}>
      {title}
    </Heading>
    {children}
  </Stack>
);

function FakeProgressUpload() {
  const { progress, start, stop } = useFakeUpload();
  return (
    <UploadFile
      type="upload"
      progress={progress}
      onSubmit={(file) => {
        console.log('submit', file.name);
        start();
      }}
      onCancel={() => {
        console.log('cancel');
        stop();
      }}
      onClose={() => console.log('close')}
    />
  );
}

function RejectionWiring() {
  const [rejections, setRejections] = useState<FileRejection[]>([]);
  return (
    <>
      <Text>
        Try choosing or dropping a .pdf, or an oversized file (use the buttons
        to get one without hunting for it).
      </Text>
      <UploadFile
        type="reupload"
        onSubmit={(file) => console.log('submit', file.name)}
        onReject={setRejections}
        onFileChange={() => setRejections([])}
      />
      <FileRejected rejections={rejections} onClose={() => setRejections([])} />
      <Flex gap="var(--space-3)">
        <Button
          {...secondaryButtonProps}
          onClick={() =>
            setRejections([
              { item: mockPdf().name, reason: 'Incorrect file format' },
            ])
          }
        >
          Fake .pdf rejection
        </Button>
        <Button
          {...secondaryButtonProps}
          onClick={() =>
            setRejections([
              {
                item: mockOversizedCsv().name,
                reason: 'File exceeds maximum size',
              },
            ])
          }
        >
          Fake oversized rejection
        </Button>
      </Flex>
    </>
  );
}

const UploadsPreview: React.FC = () => (
  <Stack
    as="main"
    gap="var(--space-8)"
    maxW="700px"
    mx="auto"
    py="var(--space-8)"
    px="var(--space-4)"
  >
    <Heading as="h1" color="var(--color-text)" {...H2}>
      Upload components (#76)
    </Heading>

    <Block title="UploadFile: upload, with fake progress">
      <FakeProgressUpload />
    </Block>

    <Block title="UploadFile: re-upload, no file">
      <UploadFile type="reupload" onSubmit={(f) => console.log(f.name)} />
    </Block>

    <Block title="UploadFile: re-upload, file selected">
      <UploadFile
        type="reupload"
        defaultFile={mockCsv()}
        onSubmit={(f) => console.log(f.name)}
      />
    </Block>

    <Block title="Rejection wiring">
      <RejectionWiring />
    </Block>

    <Block title="FileRejected (static)">
      <FileRejected
        rejections={mockRejections}
        onClose={() => console.log('close')}
      />
    </Block>

    <Block title="Subsection variants">
      <Subsection
        icon={<CsvFileIcon />}
        iconPlacement="inline"
        title="Table Example"
        description="You can download the attached example and use it as a starting point for your own file."
        action={<Button {...primaryButtonProps}>Download</Button>}
      />
      <FileItem
        file={{ name: 'FileName.csv', size: 3 * 1024 ** 2 }}
        progress={49}
        onRemove={() => console.log('remove')}
      />
      <Subsection
        title="Daily Discussion"
        description="Upload the Daily Discussion here."
        action={
          <Button {...primaryButtonProps}>
            <TextFileIcon />
            Add Text
          </Button>
        }
      />
    </Block>
  </Stack>
);

export default UploadsPreview;
