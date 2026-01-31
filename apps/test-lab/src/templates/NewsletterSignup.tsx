import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { Check } from 'lucide-react';

interface NewsletterSignupProps {
  submitHash: string;
}

export function NewsletterSignup({ submitHash }: NewsletterSignupProps) {
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
    data['source'] = 'Newsletter Signup';
    data['subscribedAt'] = new Date().toISOString();

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
      setMessage(
        'Thanks for joining! Check your inbox for a confirmation email.',
      );
      formRef.current?.reset();
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1e3a5f] to-[#2d5a87] p-6 text-center">
        <div className="bg-white p-12 rounded-2xl shadow-2xl max-w-md w-full animate-in fade-in zoom-in duration-300">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              className="w-10 h-10 fill-current"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            You're Subscribed!
          </h2>
          <p className="text-gray-600">{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1e3a5f] to-[#2d5a87] p-6">
      <div className="bg-white p-12 rounded-2xl shadow-2xl max-w-md w-full text-center">
        <div className="w-[70px] h-[70px] bg-gradient-to-br from-[#1e3a5f] to-[#2d5a87] rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className="w-9 h-9 fill-white"
          >
            <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Stay in the Loop
        </h1>
        <p className="text-gray-500 text-sm mb-8">
          Get the latest insights, tips, and updates delivered straight to your
          inbox.
        </p>

        <div className="bg-slate-50 p-6 rounded-xl mb-8 text-left border border-slate-100">
          <ul className="space-y-3">
            {[
              'Weekly curated content and industry news',
              'Exclusive tips and best practices',
              'Early access to new features',
              'No spam, unsubscribe anytime',
            ].map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-3 text-sm text-gray-600"
              >
                <div className="mt-0.5 min-w-[16px] w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-white" />
                </div>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="text-left space-y-4"
        >
          <div>
            <label
              htmlFor="firstName"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              First Name
            </label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              placeholder="John"
              className="w-full px-4 py-3.5 border-2 border-slate-200 rounded-xl bg-white text-base focus:outline-none focus:border-[#2d5a87] focus:ring-4 focus:ring-[#2d5a87]/10 transition-all"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Email Address *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              placeholder="john@example.com"
              className="w-full px-4 py-3.5 border-2 border-slate-200 rounded-xl bg-white text-base focus:outline-none focus:border-[#2d5a87] focus:ring-4 focus:ring-[#2d5a87]/10 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={status === 'submitting'}
            className="w-full mt-2 bg-gradient-to-r from-[#1e3a5f] to-[#2d5a87] hover:translate-y-[-2px] hover:shadow-lg hover:shadow-[#1e3a5f]/30 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:transform-none disabled:shadow-none disabled:cursor-not-allowed"
          >
            {status === 'submitting' ? 'Subscribing...' : 'Subscribe Now'}
          </button>

          {status === 'error' && (
            <div className="mt-4 p-3 rounded-lg text-sm bg-red-50 text-red-800 border border-red-200">
              {message}
            </div>
          )}
        </form>

        <p className="mt-6 text-xs text-gray-400">
          By subscribing, you agree to our{' '}
          <a href="#" className="text-[#2d5a87] hover:underline">
            Privacy Policy
          </a>
          . We respect your inbox.
        </p>
      </div>
    </div>
  );
}
