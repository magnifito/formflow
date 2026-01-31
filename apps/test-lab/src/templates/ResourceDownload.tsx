import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';

interface ResourceDownloadProps {
  submitHash: string;
  downloadUrl?: string; // Optional prop for overriding the download URL
}

const DEFAULT_DOWNLOAD_URL = '#'; // In a real app, this would be the actual file URL

export function ResourceDownload({
  submitHash,
  downloadUrl = DEFAULT_DOWNLOAD_URL,
}: ResourceDownloadProps) {
  const [status, setStatus] = useState<
    'idle' | 'submitting' | 'success' | 'error'
  >('idle');
  const [message, setMessage] = useState('');
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
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

    // Refresh every 10 mins
    const interval = setInterval(fetchCsrf, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [submitHash]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setMessage('');

    const formData = new FormData(e.target as HTMLFormElement);
    const rawData: Record<string, FormDataEntryValue> = Object.fromEntries(
      formData.entries(),
    );

    const data = {
      ...rawData,
      newsletter: rawData['newsletter'] === 'on' ? 'Yes' : 'No',
      resourceDownloaded: '2024 Company Growth Strategy Guide',
    };

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
    } catch (error: unknown) {
      setStatus('error');
      setMessage(
        error instanceof Error
          ? error.message
          : 'Something went wrong. Please try again.',
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#667eea] to-[#764ba2] p-5 md:p-10 text-gray-800 font-sans">
      <div
        className={`max-w-[900px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-start`}
      >
        {/* Resource Preview */}
        <div className="bg-white p-10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.2)]">
          <div className="w-20 h-20 bg-gradient-to-br from-[#667eea] to-[#764ba2] rounded-2xl flex items-center justify-center mb-5">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              className="w-10 h-10 fill-white"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11z" />
            </svg>
          </div>

          <span className="inline-block bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide mb-4">
            Free Guide
          </span>
          <h1 className="text-2xl font-bold text-gray-900 mb-2.5">
            2024 Company Growth Strategy Guide
          </h1>

          <p className="text-gray-600 mb-5 leading-relaxed">
            A comprehensive 45-page guide covering proven strategies for scaling
            your business, optimizing operations, and driving sustainable growth
            in today's competitive market.
          </p>

          <ul className="space-y-3">
            {[
              'Data-driven growth frameworks used by Fortune 500 companies',
              'Step-by-step implementation checklists',
              'Real-world case studies and success stories',
              'Downloadable templates and worksheets',
              'Expert insights from industry leaders',
            ].map((item, i) => (
              <li key={i} className="pl-7 relative text-gray-700">
                <span className="absolute left-0 top-[3px] w-[18px] h-[18px] bg-emerald-500 rounded-full flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="white"
                    className="w-3 h-3"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Form Container */}
        <div className="bg-white p-10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.2)]">
          {status === 'success' ? (
            <div className="text-center py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className="w-[60px] h-[60px] fill-emerald-500 mb-4 mx-auto"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Thank You!
              </h3>
              <p className="text-gray-600 mb-6">
                Your download is ready. Click the button below to get your copy.
              </p>
              <a
                href={downloadUrl}
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-emerald-500 text-white font-bold rounded-lg hover:bg-emerald-600 transition-colors"
                download
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                </svg>
                Download PDF
              </a>
            </div>
          ) : (
            <div>
              <h2 className="text-[22px] font-bold text-gray-900 mb-1">
                Get Your Free Copy
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                Fill out the form below to download instantly
              </p>

              <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="firstName"
                      className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                      First Name <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      required
                      placeholder="John"
                      className="w-full px-3.5 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#667eea] focus:ring-4 focus:ring-[#667eea]/10 transition-all text-[15px]"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="lastName"
                      className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                      Last Name <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      required
                      placeholder="Smith"
                      className="w-full px-3.5 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#667eea] focus:ring-4 focus:ring-[#667eea]/10 transition-all text-[15px]"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                      Work Email <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      placeholder="john@company.com"
                      className="w-full px-3.5 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#667eea] focus:ring-4 focus:ring-[#667eea]/10 transition-all text-[15px]"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="company"
                      className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                      Company Name <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      id="company"
                      name="company"
                      required
                      placeholder="Acme Inc."
                      className="w-full px-3.5 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#667eea] focus:ring-4 focus:ring-[#667eea]/10 transition-all text-[15px]"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="jobTitle"
                      className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                      Job Title
                    </label>
                    <input
                      type="text"
                      id="jobTitle"
                      name="jobTitle"
                      placeholder="Marketing Manager"
                      className="w-full px-3.5 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#667eea] focus:ring-4 focus:ring-[#667eea]/10 transition-all text-[15px]"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="companySize"
                      className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                      Company Size
                    </label>
                    <select
                      id="companySize"
                      name="companySize"
                      className="w-full px-3.5 py-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-[#667eea] focus:ring-4 focus:ring-[#667eea]/10 transition-all text-[15px]"
                    >
                      <option value="">Select...</option>
                      <option value="1-10">1-10 employees</option>
                      <option value="11-50">11-50 employees</option>
                      <option value="51-200">51-200 employees</option>
                      <option value="201-500">201-500 employees</option>
                      <option value="501-1000">501-1000 employees</option>
                      <option value="1000+">1000+ employees</option>
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="phone"
                      className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      placeholder="+1 (555) 123-4567"
                      className="w-full px-3.5 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#667eea] focus:ring-4 focus:ring-[#667eea]/10 transition-all text-[15px]"
                    />
                  </div>

                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      id="newsletter"
                      name="newsletter"
                      className="mt-1 w-[18px] h-[18px] cursor-pointer"
                    />
                    <label
                      htmlFor="newsletter"
                      className="text-[13px] text-gray-600 cursor-pointer"
                    >
                      I'd like to receive occasional emails about new resources,
                      tips, and industry insights.
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  className="w-full mt-2 bg-gradient-to-r from-[#667eea] to-[#764ba2] hover:translate-y-[-1px] hover:shadow-lg text-white font-bold py-3.5 px-5 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:transform-none disabled:shadow-none disabled:cursor-not-allowed"
                >
                  {status === 'submitting' ? 'Processing...' : 'Download Now'}
                </button>

                {status === 'error' && (
                  <div className="p-3 rounded-lg text-sm bg-red-50 text-red-800 border border-red-200">
                    {message}
                  </div>
                )}
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
