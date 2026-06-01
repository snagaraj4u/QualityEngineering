'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Upload, AlertCircle, CheckCircle, X } from 'lucide-react';

/**
 * Analysis result returned from the video upload API
 */
export interface AnalysisStep {
  action: string;
  element?: string;
  expectedResult: string;
}

export interface VideoAnalysisResult {
  analysisId: string;
  steps: AnalysisStep[];
  duration: number;
  framesAnalyzed: number;
  confidence: number;
}

/**
 * Props for the VideoUpload component
 */
export interface VideoUploadProps {
  onSuccess: (analysis: VideoAnalysisResult) => void;
  onError: (error: string) => void;
  clientId: string;
}

/**
 * VideoUpload Component
 * Handles video file selection, validation, upload, and progress tracking
 */
export const VideoUpload: React.FC<VideoUploadProps> = ({
  onSuccess,
  onError,
  clientId,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [framework, setFramework] = useState('Cucumber');
  const [designPattern, setDesignPattern] = useState('BDD');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const VALID_EXTENSIONS = ['.mp4', '.mov', '.webm'];
  const VALID_MIMES = ['video/mp4', 'video/quicktime', 'video/webm'];
  const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

  /**
   * Cleanup effect: Abort XHR requests on component unmount
   */
  useEffect(() => {
    return () => {
      if (xhrRef.current) {
        xhrRef.current.abort();
      }
    };
  }, []);

  /**
   * Validate selected file
   */
  const validateFile = (file: File): { valid: boolean; error?: string } => {
    // Check file extension
    const fileName = file.name.toLowerCase();
    const hasValidExtension = VALID_EXTENSIONS.some(ext => fileName.endsWith(ext));

    if (!hasValidExtension) {
      return {
        valid: false,
        error: `Invalid file type. Supported formats: ${VALID_EXTENSIONS.join(', ')}`,
      };
    }

    // Check MIME type
    if (!VALID_MIMES.includes(file.type)) {
      return {
        valid: false,
        error: `Invalid MIME type: ${file.type}. Supported types: ${VALID_MIMES.join(', ')}`,
      };
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      return {
        valid: false,
        error: `File size (${sizeMB}MB) exceeds maximum 500MB`,
      };
    }

    return { valid: true };
  };

  /**
   * Handle file selection from input
   */
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.currentTarget.files;
    if (files && files.length > 0) {
      const file = files[0];
      const validation = validateFile(file);

      if (validation.valid) {
        setSelectedFile(file);
        setError(null);
      } else {
        setError(validation.error || 'Invalid file');
        setSelectedFile(null);
      }
    }
  };

  /**
   * Handle drag and drop
   */
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isUploading) setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);

    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      const validation = validateFile(file);

      if (validation.valid) {
        setSelectedFile(file);
        setError(null);
      } else {
        setError(validation.error || 'Invalid file');
        setSelectedFile(null);
      }
    }
  };

  /**
   * Upload video to server
   */
  const handleUpload = async () => {
    if (!selectedFile) {
      setError('No file selected');
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const formData = new FormData();
      formData.append('video', selectedFile);
      formData.append('clientId', clientId);
      formData.append('suggestedFramework', framework);
      formData.append('designPattern', designPattern);

      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadProgress(Math.round(percentComplete));
        }
      });

      // Handle upload completion
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);

            // Validate response structure
            if (!response.analysisId || !response.steps || response.duration === undefined) {
              throw new Error('Invalid response structure from API');
            }

            setSuccessMessage('Video uploaded and analyzed successfully!');
            setUploadProgress(0);
            setSelectedFile(null);

            // Call success callback
            onSuccess({
              analysisId: response.analysisId,
              steps: response.steps,
              duration: response.duration,
              framesAnalyzed: response.framesAnalyzed,
              confidence: response.confidence,
            });
          } catch (e) {
            const errorMsg = 'Failed to parse server response';
            setError(errorMsg);
            onError(errorMsg);
          }
        } else {
          try {
            const response = JSON.parse(xhr.responseText);
            const errorMsg = response.error || 'Upload failed';
            setError(errorMsg);
            onError(errorMsg);
          } catch (e) {
            const errorMsg = `Upload failed with status ${xhr.status}`;
            setError(errorMsg);
            onError(errorMsg);
          }
        }
        setIsUploading(false);
      });

      // Handle upload errors
      xhr.addEventListener('error', () => {
        const errorMsg = 'Network error: Failed to connect to server';
        setError(errorMsg);
        onError(errorMsg);
        setIsUploading(false);
      });

      // Handle timeout
      xhr.addEventListener('timeout', () => {
        const errorMsg = 'Request timeout: Upload took too long';
        setError(errorMsg);
        onError(errorMsg);
        setIsUploading(false);
      });

      // Send request to backend API
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      xhr.open('POST', `${apiUrl}/api/video/upload`);
      xhr.timeout = 30000; // 30 second timeout
      xhr.send(formData);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMsg);
      onError(errorMsg);
      setIsUploading(false);
    }
  };

  /**
   * Clear selected file
   */
  const handleClearFile = () => {
    setSelectedFile(null);
    setError(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * Trigger file input click
   */
  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-900">Error</h3>
            <p className="text-red-700 text-sm mt-1">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-700 flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Success Alert */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-green-900">Success</h3>
            <p className="text-green-700 text-sm mt-1">{successMessage}</p>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-green-600 hover:text-green-700 flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Drag and Drop Area */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Drag and drop video file here or click to browse files"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            fileInputRef.current?.click();
          }
        }}
        className={`mb-6 border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragOver
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 bg-gray-50 hover:border-gray-400'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".mp4,.mov,.webm"
          onChange={handleFileSelect}
          className="hidden"
        />

        <Upload className="w-12 h-12 mx-auto mb-3 text-gray-400" />

        <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Video</h3>
        <p className="text-gray-600 text-sm mb-4">
          Drag and drop your video file here, or click to browse
        </p>

        <button
          onClick={handleBrowseClick}
          disabled={isUploading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          Browse Files
        </button>

        <p className="text-xs text-gray-500 mt-4">
          Supported formats: .mp4, .mov, .webm (Max 500MB)
        </p>
      </div>

      {/* Selected File Info */}
      {selectedFile && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-900">{selectedFile.name}</p>
              <p className="text-sm text-gray-600 mt-1">
                Size: {(selectedFile.size / (1024 * 1024)).toFixed(2)}MB
              </p>
            </div>
            <button
              onClick={handleClearFile}
              disabled={isUploading}
              className="text-blue-600 hover:text-blue-700 disabled:text-gray-400"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Framework Selector */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Test Framework
        </label>
        <select
          value={framework}
          onChange={(e) => setFramework(e.target.value)}
          disabled={isUploading}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="Cucumber">Cucumber</option>
          <option value="Jest">Jest</option>
          <option value="Cypress">Cypress</option>
          <option value="Selenium">Selenium</option>
        </select>
      </div>

      {/* Design Pattern Selector */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Design Pattern
        </label>
        <select
          value={designPattern}
          onChange={(e) => setDesignPattern(e.target.value)}
          disabled={isUploading}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="BDD">BDD (Behavior-Driven Development)</option>
          <option value="Unit">Unit Testing</option>
          <option value="Integration">Integration Testing</option>
          <option value="E2E">E2E (End-to-End)</option>
          <option value="API Testing">API Testing</option>
        </select>
      </div>

      {/* Progress Bar */}
      {isUploading && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700">Upload Progress</span>
            <span className="text-sm text-gray-600">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Upload Button */}
      <button
        onClick={handleUpload}
        disabled={!selectedFile || isUploading}
        className={`w-full py-3 rounded-lg font-semibold text-white transition-colors ${
          selectedFile && !isUploading
            ? 'bg-blue-600 hover:bg-blue-700'
            : 'bg-gray-400 cursor-not-allowed'
        }`}
      >
        {isUploading ? `Uploading... ${uploadProgress}%` : 'Upload and Analyze'}
      </button>
    </div>
  );
};
