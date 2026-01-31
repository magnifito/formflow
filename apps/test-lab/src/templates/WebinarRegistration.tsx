import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { Calendar, Clock, User, Globe } from 'lucide-react';

interface WebinarRegistrationProps {
  submitHash: string;
}

export function WebinarRegistration({ submitHash }: WebinarRegistrationProps) {
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
  }, [submitHash]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setMessage('');

    const formData = new FormData(e.target as HTMLFormElement);
    const data: Record<string, FormDataEntryValue | string> =
      Object.fromEntries(formData.entries());
    data['registeredAt'] = new Date().toISOString();
    data['webinarTitle'] = 'Future of SaaS 2024';

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

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-10 rounded-2xl shadow-xl max-w-lg w-full text-center border-t-4 border-indigo-600 animate-in fade-in zoom-in duration-300">
          <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Calendar className="w-10 h-10 text-indigo-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Registration Confirmed!
          </h2>
          <p className="text-gray-600 mb-6">
            You've successfully secured your spot for{' '}
            <strong>The Future of SaaS 2024</strong>. We've sent a calendar
            invite to your email.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="text-indigo-600 font-semibold hover:underline"
          >
            Register another person
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Hero Section */}
      <div className="bg-[#1a1f36] text-white pt-16 pb-24 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <span className="inline-block py-1 px-3 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold tracking-wider mb-6 border border-indigo-500/30">
            LIVE WEBINAR
          </span>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
            The Future of SaaS: Trends & Predictions for 2024
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto mb-8 leading-relaxed">
            Join our expert panel as we dive deep into the evolving landscape of
            software-as-a-service, AI integration, and the new metrics that
            matter.
          </p>

          <div className="flex flex-wrap justify-center gap-6 text-sm font-medium text-slate-300">
            <div className="flex items-center gap-2 bg-white/5 py-2 px-4 rounded-lg border border-white/10">
              <Calendar className="w-4 h-4 text-indigo-400" />
              <span>Oct 24, 2024</span>
            </div>
            <div className="flex items-center gap-2 bg-white/5 py-2 px-4 rounded-lg border border-white/10">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>2:00 PM EST (45 mins)</span>
            </div>
            <div className="flex items-center gap-2 bg-white/5 py-2 px-4 rounded-lg border border-white/10">
              <Globe className="w-4 h-4 text-indigo-400" />
              <span>Online via Zoom</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-16 pb-20 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              What You'll Learn
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                'The impact of Generative AI on SaaS pricing models',
                'Shifting from growth-at-all-costs to efficiency',
                'New retention strategies for 2024',
                'Vertical vs. Horizontal SaaS opportunities',
              ].map((item, i) => (
                <div key={i} className="flex gap-3">
                  <div className="mt-1 w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                    <svg
                      className="w-3 h-3 text-indigo-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="3"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100">
            <h3 className="text-xl font-bold text-gray-900 mb-6">
              Featured Speakers
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-slate-200 rounded-full overflow-hidden">
                  <User className="w-full h-full p-3 text-slate-400" />
                </div>
                <div>
                  <div className="font-bold text-gray-900">Elena Rodriguez</div>
                  <div className="text-sm text-indigo-600">
                    VP of Product, TechScale
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-slate-200 rounded-full overflow-hidden">
                  <User className="w-full h-full p-3 text-slate-400" />
                </div>
                <div>
                  <div className="font-bold text-gray-900">David Chen</div>
                  <div className="text-sm text-indigo-600">
                    Founder, SaaSOps
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Registration Form */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 md:p-8 rounded-xl shadow-lg border-t-4 border-indigo-600 sticky top-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">
              Save Your Spot
            </h3>

            <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
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
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  placeholder="Jane"
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
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  placeholder="Doe"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Work Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  placeholder="jane@company.com"
                />
              </div>

              <div>
                <label
                  htmlFor="company"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Company
                </label>
                <input
                  type="text"
                  id="company"
                  name="company"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  placeholder="Acme Inc."
                />
              </div>

              <button
                type="submit"
                disabled={status === 'submitting'}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg shadow-lg shadow-indigo-500/30 transition-all transform hover:-translate-y-0.5 mt-2 disabled:opacity-50 disabled:shadow-none disabled:transform-none"
              >
                {status === 'submitting' ? 'Registering...' : 'Register Now'}
              </button>

              {status === 'error' && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100 text-center">
                  {message}
                </div>
              )}

              <p className="text-xs text-center text-slate-400 mt-4">
                Limited spots available. Recording will be sent to all
                registrants.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
