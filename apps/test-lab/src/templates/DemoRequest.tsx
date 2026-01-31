import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';

interface DemoRequestProps {
  submitHash: string;
}

export function DemoRequest({ submitHash }: DemoRequestProps) {
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

    const interval = setInterval(fetchCsrf, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [submitHash]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setMessage('');

    const formData = new FormData(e.target as HTMLFormElement);
    const data: Record<string, FormDataEntryValue | string> =
      Object.fromEntries(formData.entries());
    data['source'] = 'Demo Request Form';
    data['requestedAt'] = new Date().toISOString();

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
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-white text-gray-800 font-sans">
      {/* Left Panel */}
      <div className="bg-gradient-to-br from-[#0ea5e9] to-[#0284c7] text-white p-10 md:p-14 flex flex-col justify-center">
        <h1 className="text-[42px] font-bold leading-tight mb-5">
          See Our Platform in Action
        </h1>
        <p className="text-lg opacity-90 mb-10">
          Book a personalized demo with one of our product experts and discover
          how we can help transform your workflow.
        </p>

        <div className="flex flex-col gap-6">
          <div className="flex gap-4 items-start">
            <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center shrink-0">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className="w-6 h-6 fill-white"
              >
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-[17px] font-bold mb-1">
                Customized Walkthrough
              </h3>
              <p className="text-sm opacity-85 m-0">
                See features tailored to your specific use case and industry
                needs.
              </p>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center shrink-0">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className="w-6 h-6 fill-white"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
            </div>
            <div>
              <h3 className="text-[17px] font-bold mb-1">Expert Q&A Session</h3>
              <p className="text-sm opacity-85 m-0">
                Get all your questions answered by our product specialists.
              </p>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center shrink-0">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className="w-6 h-6 fill-white"
              >
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
              </svg>
            </div>
            <div>
              <h3 className="text-[17px] font-bold mb-1">
                No Commitment Required
              </h3>
              <p className="text-sm opacity-85 m-0">
                Zero pressure, zero obligation. Just valuable insights for your
                team.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/20">
          <blockquote className="text-base italic opacity-95 mb-4">
            "The demo was incredibly valuable. They showed us exactly how to
            solve our workflow challenges. We signed up the same week."
          </blockquote>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-white/20 rounded-full flex items-center justify-center font-bold">
              SK
            </div>
            <div className="flex flex-col">
              <span className="font-bold">Sarah Kim</span>
              <span className="text-[13px] opacity-80">
                VP of Operations, TechFlow Inc.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="p-10 md:p-14 flex flex-col justify-center max-w-[550px] w-full mx-auto">
        {status === 'success' ? (
          <div className="text-center py-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              className="w-20 h-20 fill-emerald-500 mb-6 mx-auto"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
            <h2 className="text-[28px] font-bold text-slate-900 mb-4">
              Demo Request Received!
            </h2>
            <p className="text-slate-500 text-base max-w-[350px] mx-auto">
              Thanks for your interest! One of our team members will reach out
              within 24 hours to schedule your personalized demo.
            </p>
          </div>
        ) : (
          <div>
            <div className="mb-8">
              <h2 className="text-[28px] font-bold text-slate-900 mb-2">
                Request Your Demo
              </h2>
              <p className="text-slate-500 m-0">
                Fill out the form and we'll be in touch within 24 hours.
              </p>
            </div>

            <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    className="w-full px-3.5 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#0ea5e9] focus:ring-4 focus:ring-[#0ea5e9]/10 transition-all text-[15px]"
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
                    placeholder="Doe"
                    className="w-full px-3.5 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#0ea5e9] focus:ring-4 focus:ring-[#0ea5e9]/10 transition-all text-[15px]"
                  />
                </div>
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
                  className="w-full px-3.5 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#0ea5e9] focus:ring-4 focus:ring-[#0ea5e9]/10 transition-all text-[15px]"
                />
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
                  className="w-full px-3.5 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#0ea5e9] focus:ring-4 focus:ring-[#0ea5e9]/10 transition-all text-[15px]"
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
                  className="w-full px-3.5 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#0ea5e9] focus:ring-4 focus:ring-[#0ea5e9]/10 transition-all text-[15px]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="jobTitle"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                  >
                    Job Title <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    id="jobTitle"
                    name="jobTitle"
                    required
                    placeholder="Product Manager"
                    className="w-full px-3.5 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#0ea5e9] focus:ring-4 focus:ring-[#0ea5e9]/10 transition-all text-[15px]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="companySize"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                  >
                    Company Size <span className="text-red-600">*</span>
                  </label>
                  <select
                    id="companySize"
                    name="companySize"
                    required
                    className="w-full px-3.5 py-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-[#0ea5e9] focus:ring-4 focus:ring-[#0ea5e9]/10 transition-all text-[15px]"
                  >
                    <option value="">Select...</option>
                    <option value="1-10">1-10 employees</option>
                    <option value="11-50">11-50 employees</option>
                    <option value="51-200">51-200 employees</option>
                    <option value="201-1000">201-1000 employees</option>
                    <option value="1000+">1000+ employees</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="useCase"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  What are you looking to solve?{' '}
                  <span className="text-red-600">*</span>
                </label>
                <select
                  id="useCase"
                  name="useCase"
                  required
                  className="w-full px-3.5 py-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-[#0ea5e9] focus:ring-4 focus:ring-[#0ea5e9]/10 transition-all text-[15px]"
                >
                  <option value="">Select primary use case...</option>
                  <option value="lead-capture">Lead Capture & Forms</option>
                  <option value="surveys">Surveys & Feedback</option>
                  <option value="registrations">Event Registrations</option>
                  <option value="applications">Job Applications</option>
                  <option value="orders">Order Forms</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="message"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  Anything else we should know?
                </label>
                <textarea
                  id="message"
                  name="message"
                  placeholder="Tell us about your specific needs or questions..."
                  className="w-full px-3.5 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#0ea5e9] focus:ring-4 focus:ring-[#0ea5e9]/10 transition-all text-[15px] min-h-[100px]"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={status === 'submitting'}
                className="w-full mt-2 bg-gradient-to-r from-[#0ea5e9] to-[#0284c7] hover:translate-y-[-1px] hover:shadow-lg text-white font-bold py-3.5 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:transform-none disabled:shadow-none disabled:cursor-not-allowed"
              >
                {status === 'submitting'
                  ? 'Booking My Demo...'
                  : 'Book My Demo'}
              </button>

              {status === 'error' && (
                <div className="p-3 rounded-lg text-sm bg-red-50 text-red-800 border border-red-200">
                  {message}
                </div>
              )}

              <p className="text-center text-xs text-gray-400 mt-5">
                By submitting this form, you agree to our Privacy Policy and
                Terms of Service.
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
