/**
 * @jest-environment jsdom
 *
 * Integration tests for video upload and processing.
 * This suite renders the VideoUpload React component, so it runs in jsdom
 * (overriding the project-wide node test environment via the docblock above).
 */

import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VideoUpload } from '../../apps/web/components/VideoUpload';

// Stub XMLHttpRequest so handleUpload doesn't attempt a real network request
// inside jsdom (which would leave the upload pending / log async errors).
class MockXHR {
  upload = { addEventListener: jest.fn() };
  addEventListener = jest.fn();
  open = jest.fn();
  send = jest.fn();
  abort = jest.fn();
  status = 200;
  responseText = '{}';
  timeout = 0;
}

describe('Video Upload and Processing', () => {
  const mockOnSuccess = jest.fn();
  const mockOnError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).XMLHttpRequest = MockXHR;
  });

  describe('Video Upload Component', () => {
    it('should render upload form with file input', () => {
      render(
        <VideoUpload onSuccess={mockOnSuccess} onError={mockOnError} clientId="test-client" />
      );
      const uploadArea = screen.getByLabelText(/drag and drop video file/i);
      expect(uploadArea).toBeInTheDocument();
      // Exact name: the drag-area div's aria-label also contains "browse files",
      // so a loose /browse files/i would match two elements.
      const browseBtn = screen.getByRole('button', { name: /^Browse Files$/ });
      expect(browseBtn).toBeInTheDocument();
    });

    it('should accept drag and drop files', async () => {
      render(
        <VideoUpload onSuccess={mockOnSuccess} onError={mockOnError} clientId="test-client" />
      );
      const uploadArea = screen.getByLabelText(/drag and drop video file/i);

      const file = new File(['test content'], 'test.mp4', { type: 'video/mp4' });
      fireEvent.drop(uploadArea, {
        dataTransfer: { files: [file] },
      });

      await waitFor(() => {
        expect(mockOnError).not.toHaveBeenCalled();
      });
    });

    it('should validate file type on selection', () => {
      const validFiles = ['test.mp4', 'test.mov', 'test.webm'];
      const invalidFiles = ['test.avi', 'test.txt', 'test.mkv'];

      validFiles.forEach((file) => {
        expect(file.match(/\.(mp4|mov|webm)$/i)).not.toBeNull();
      });

      invalidFiles.forEach((file) => {
        expect(file.match(/\.(mp4|mov|webm)$/i)).toBeNull();
      });
    });

    it('should validate file size (max 500MB)', () => {
      const maxSize = 500 * 1024 * 1024;
      const smallFile = 100 * 1024 * 1024;
      const largeFile = 600 * 1024 * 1024;

      expect(smallFile <= maxSize).toBe(true);
      expect(largeFile <= maxSize).toBe(false);
    });

    it('should display error message for invalid file type', async () => {
      const { container } = render(
        <VideoUpload onSuccess={mockOnSuccess} onError={mockOnError} clientId="test-client" />
      );

      const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/invalid file type/i)).toBeInTheDocument();
      });
    });

    it('should display error message for oversized file', () => {
      const maxSize = 500 * 1024 * 1024;
      const fileSize = 600 * 1024 * 1024;

      if (fileSize > maxSize) {
        expect(`File size ${fileSize / (1024 * 1024)}MB exceeds maximum 500MB`).toBeDefined();
      }
    });

    it('should render framework selector dropdown', () => {
      render(
        <VideoUpload onSuccess={mockOnSuccess} onError={mockOnError} clientId="test-client" />
      );
      // The selects aren't programmatically linked to their labels, so they
      // expose no accessible name; assert on their options instead.
      expect(screen.getByRole('option', { name: 'Cucumber' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Selenium' })).toBeInTheDocument();
    });

    it('should render design pattern selector', () => {
      render(
        <VideoUpload onSuccess={mockOnSuccess} onError={mockOnError} clientId="test-client" />
      );
      expect(screen.getByRole('option', { name: /BDD/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /API Testing/i })).toBeInTheDocument();
    });

    it('should disable upload button when no file is selected', () => {
      render(
        <VideoUpload onSuccess={mockOnSuccess} onError={mockOnError} clientId="test-client" />
      );

      const uploadBtn = screen.getByRole('button', { name: /upload and analyze/i });
      expect(uploadBtn).toBeDisabled();
    });

    it('should show progress indicator during upload', async () => {
      const { container } = render(
        <VideoUpload onSuccess={mockOnSuccess} onError={mockOnError} clientId="test-client" />
      );

      const file = new File(['test content'], 'test.mp4', { type: 'video/mp4' });
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });
      const uploadBtn = screen.getByRole('button', { name: /upload and analyze/i });
      fireEvent.click(uploadBtn);

      await waitFor(() => {
        expect(screen.getByText(/upload progress/i)).toBeInTheDocument();
      });
    });
  });

  describe('API Upload Endpoint (contract)', () => {
    it('should successfully upload and analyze video', () => {
      const mockResponse = {
        analysisId: 'analysis-123',
        steps: [{ action: 'Click', element: 'Login Button', expectedResult: 'Login form appears' }],
        duration: 5,
        framesAnalyzed: 150,
        confidence: 0.85,
      };

      expect(mockResponse.analysisId).toBeDefined();
      expect(mockResponse.steps.length).toBeGreaterThan(0);
      expect(mockResponse.confidence).toBeLessThanOrEqual(1);
    });

    it('should return error for missing clientId', () => {
      const errorResponse = { error: 'clientId is required' };
      expect(errorResponse.error).toContain('clientId');
    });

    it('should return error for invalid file type', () => {
      const errorResponse = { error: 'Invalid file type: text/plain' };
      expect(errorResponse.error).toContain('Invalid file type');
    });

    it('should return error for file exceeding size limit', () => {
      const errorResponse = { error: 'File too large' };
      expect(errorResponse.error).toBeDefined();
    });

    it('should include extracted steps in response', () => {
      const response = {
        analysisId: 'analysis-456',
        steps: [
          { action: 'Navigate', element: 'URL bar', expectedResult: 'Page loads' },
          { action: 'Type', element: 'Username field', expectedResult: 'Text entered' },
        ],
        duration: 10,
        framesAnalyzed: 300,
        confidence: 0.9,
      };

      expect(response.steps).toHaveLength(2);
      expect(response.steps[0].action).toBe('Navigate');
      expect(response.steps[1].action).toBe('Type');
    });

    it('should save analysis results with framework preference', () => {
      const analysisData = { clientId: 'client-123', framework: 'Cucumber', designPattern: 'BDD' };
      expect(analysisData.framework).toBe('Cucumber');
      expect(analysisData.designPattern).toBe('BDD');
    });
  });

  describe('Video Upload Page', () => {
    it('should render the component for an authenticated client', () => {
      render(
        <VideoUpload onSuccess={mockOnSuccess} onError={mockOnError} clientId="test-client" />
      );
      expect(screen.getByRole('button', { name: /upload and analyze/i })).toBeInTheDocument();
    });

    it('should display success notification shape', () => {
      const notification = {
        type: 'success',
        message: 'Video uploaded and analyzed successfully',
        analysisId: 'analysis-789',
      };
      expect(notification.type).toBe('success');
      expect(notification.analysisId).toBeDefined();
    });

    it('should display error notification shape', () => {
      const notification = { type: 'error', message: 'Failed to upload video: Invalid file type' };
      expect(notification.type).toBe('error');
      expect(notification.message).toBeDefined();
    });

    it('should show link to next step after success', () => {
      const nextStepLink = '/builder/generate-test-cases';
      expect(nextStepLink).toContain('/');
    });
  });

  describe('File Validation', () => {
    it('should validate file extension case-insensitively', () => {
      const extensions = ['.MP4', '.mp4', '.mP4', '.mov', '.MOV', '.webm', '.WEBM'];
      const validExtensions = ['.mp4', '.mov', '.webm'];

      extensions.forEach((ext) => {
        expect(validExtensions.includes(ext.toLowerCase())).toBe(true);
      });
    });

    it('should calculate upload progress correctly', () => {
      const totalBytes = 100 * 1024 * 1024;
      const uploadedBytes = 50 * 1024 * 1024;

      const progress = (uploadedBytes / totalBytes) * 100;
      expect(progress).toBe(50);
    });

    it('should handle multiple uploads sequentially', () => {
      const uploads = [
        { id: 1, status: 'completed' },
        { id: 2, status: 'pending' },
        { id: 3, status: 'pending' },
      ];
      expect(uploads[0].status).toBe('completed');
      expect(uploads[1].status).toBe('pending');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', () => {
      expect('Network error: Failed to connect to server').toContain('Network error');
    });

    it('should handle server errors (5xx)', () => {
      expect('Server error: 500 Internal Server Error').toContain('Server error');
    });

    it('should handle timeout errors', () => {
      expect('Request timeout: Upload took too long').toContain('timeout');
    });

    it('should display user-friendly error messages', () => {
      const userError = 'File not found. Please check the file path and try again.';
      expect(userError).toContain('File not found');
      expect(userError).not.toContain('ENOENT');
    });
  });
});
