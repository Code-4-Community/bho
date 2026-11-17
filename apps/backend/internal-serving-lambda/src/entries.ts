// Shape of the import fields shared by the entry routes
export const toImportSummary = (row: {
  importId: number;
  fileName: string;
  importStatus: string;
  uploadedAt: Date;
  uploadedById: number;
  uploadedByFirstName: string;
  uploadedByLastName: string;
}) => ({
  id: row.importId,
  fileName: row.fileName,
  status: row.importStatus,
  uploadedAt: row.uploadedAt,
  uploadedBy: {
    id: row.uploadedById,
    name: `${row.uploadedByFirstName} ${row.uploadedByLastName}`,
  },
});
