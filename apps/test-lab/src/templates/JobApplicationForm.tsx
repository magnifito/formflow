import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { Upload, X, FileText } from 'lucide-react';

interface JobApplicationFormProps {
  submitHash: string;
}

export function JobApplicationForm({ submitHash }: JobApplicationFormProps) {
  const [status, setStatus] = useState<
    'idle' | 'submitting' | 'success' | 'error'
  >('idle');
  const [message, setMessage] = useState('');
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const fetchCsrf = async () => {
      try {
        const data = await api.collector.getCsrfToken(submitHash);
        setCsrfToken(data.token);
      } catch (err) {
        console.error('Failed to fetch CSRF token', err);
      }
    };
    fetchCsrf();
  }, [submitHash]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFileName(e.target.files[0].name);
    } else {
      setFileName(null);
    }
  };

  const clearFile = () => {
    setFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setMessage('');

    const formData = new FormData(e.target as HTMLFormElement);

    // Convert to standard object for JSON submission, but handle file separately if needed
    // For this demo, we can just send metadata about the file or simulated upload
    // If the backend supports multipart/form-data, we can send formData directly.
    // Assuming the `api.submit` handles JSON, we might need to convert or just simulate the file upload for the demo.

    // NOTE: The current `api.submit` likely sends JSON.
    // If we wanted to support real file uploads, we'd need to check if `api.collector.submit` supports FormData.
    // Looking at typical API wrappers, they often stringify.
    // For safety/demo purposes, we'll extract text fields.

    const data: Record<string, string | null> = {};
    formData.forEach((value, key) => {
      if (value instanceof File) {
        data[key] = value.name
          ? `(File: ${value.name}, ${value.size} bytes)`
          : null;
      } else {
        data[key] = value;
      }
    });

    data['appliedAt'] = new Date().toISOString();

    try {
      let token = csrfToken;
      if (!token) {
        const tokenData = await api.collector.getCsrfToken(submitHash);
        token = tokenData.token;
        setCsrfToken(token);
      }

      await api.collector.submit(submitHash, data, {
        csrfToken: token || undefined,
      });

      setStatus('success');
      setMessage('Your application has been received. Good luck!');
    } catch (error: unknown) {
      setStatus('error');
      setMessage(
        error instanceof Error
          ? error.message
          : 'Something went wrong. Please try again.',
      );
    }
  };

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 font-sans">
        <div className="bg-white p-12 rounded-xl shadow-lg max-w-lg w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-10 h-10 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 13l4 4L19 7"
              ></path>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Application Sent!
          </h2>
          <p className="text-gray-600 mb-8">
            Thanks for applying. We've received your information and will review
            it shortly. You'll hear from us if it's a match.
          </p>
          <a
            href="/examples"
            className="text-blue-600 hover:underline font-medium"
          >
            Back to Careers
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-t-xl shadow-sm border-b border-gray-100 p-8">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-base font-semibold text-blue-600 uppercase tracking-wide mb-1">
                Engineering
              </h2>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Senior Frontend Developer
              </h1>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    ></path>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    ></path>
                  </svg>
                  Remote / San Francisco
                </span>
                <span className="flex items-center gap-1">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    ></path>
                  </svg>
                  Full-time
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-b-xl shadow-sm p-8">
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-8">
            {/* Personal Info */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-5 pb-2 border-b border-gray-100">
                Personal Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label
                    htmlFor="firstName"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label
                    htmlFor="lastName"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label
                    htmlFor="phone"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Phone
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Links */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-5 pb-2 border-b border-gray-100">
                Profile & Portfolio
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label
                    htmlFor="linkedin"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    LinkedIn URL
                  </label>
                  <input
                    type="url"
                    id="linkedin"
                    name="linkedin"
                    placeholder="https://linkedin.com/in/..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label
                    htmlFor="portfolio"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Portfolio / Website
                  </label>
                  <input
                    type="url"
                    id="portfolio"
                    name="portfolio"
                    placeholder="https://..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Resume */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-5 pb-2 border-b border-gray-100">
                Resume/CV
              </h3>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 transition-colors relative">
                <input
                  ref={fileInputRef}
                  type="file"
                  id="resume"
                  name="resume"
                  accept=".pdf,.doc,.docx"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={handleFileChange}
                />
                {fileName ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileText className="w-8 h-8 text-blue-500" />
                    <div className="text-left">
                      <p className="font-medium text-gray-900">{fileName}</p>
                      <p className="text-xs text-green-600">Ready to upload</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        clearFile();
                      }}
                      className="ml-4 p-1 rounded-full hover:bg-gray-200 z-10"
                    >
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Upload className="w-6 h-6 text-blue-500" />
                    </div>
                    <p className="font-medium text-gray-900 mb-1">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-sm text-gray-500">
                      PDF, DOC, DOCX (Max 5MB)
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Additional Info */}
            <div>
              <label
                htmlFor="coverLetter"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Cover Letter / Additional Information
              </label>
              <textarea
                id="coverLetter"
                name="coverLetter"
                rows={4}
                placeholder="Tell us why you're a great fit..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors"
              ></textarea>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={status === 'submitting'}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-lg shadow-md transition-all duration-200 disabled:opacity-50 disabled:shadow-none"
              >
                {status === 'submitting'
                  ? 'Submitting Application...'
                  : 'Submit Application'}
              </button>
              {status === 'error' && (
                <div className="mt-4 p-3 rounded-lg text-sm bg-red-50 text-red-800 border border-red-200 text-center">
                  {message}
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
