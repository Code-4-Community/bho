import { screen } from '@testing-library/react';
import { renderWithProviders as render } from '../../test/render';
import { LastUploadTile } from './LastUploadTile';

describe('LastUploadTile', () => {
  it('renders the label, time and uploader caption', () => {
    render(<LastUploadTile time="13:59:59" uploadedBy="John Doe" />);
    expect(screen.getByText('Last Upload Time')).toBeInTheDocument();
    expect(screen.getByText('13:59:59')).toBeInTheDocument();
    expect(screen.getByText('Uploaded by: John Doe')).toBeInTheDocument();
  });

  it('renders a dash when there is no time', () => {
    render(<LastUploadTile time={null} />);
    expect(screen.getByLabelText('No data')).toHaveTextContent('—');
  });

  it('omits the caption without an uploader', () => {
    render(<LastUploadTile time="13:59:59" />);
    expect(screen.queryByText(/Uploaded by/)).not.toBeInTheDocument();
  });

  it('omits the caption for an empty uploader', () => {
    render(<LastUploadTile time="13:59:59" uploadedBy="" />);
    expect(screen.queryByText(/Uploaded by/)).not.toBeInTheDocument();
  });
});
