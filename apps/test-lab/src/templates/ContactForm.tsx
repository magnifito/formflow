import { useState, useEffect, useRef } from 'react';
import { api, COLLECTOR_API_URL } from '../lib/api';
// Types for altcha-widget are provided by the altcha package

interface ContactFormProps {
  submitHash: string;
}

export function ContactForm({ submitHash }: ContactFormProps) {
  const [status, setStatus] = useState<
    'idle' | 'submitting' | 'success' | 'error'
  >('idle');
  const [message, setMessage] = useState('');
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Initial CSRF fetch
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
    const data: Record<string, FormDataEntryValue> = Object.fromEntries(
      formData.entries(),
    );

    // Handle Altcha
    const altchaPayload = data['altcha'] as string;
    if (!altchaPayload) {
      setStatus('error');
      setMessage('Please complete the verification challenge.');
      return;
    }

    try {
      // Re-fetch token if missing
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
      setMessage('Thank you! Your message has been sent successfully.');
      formRef.current?.reset();

      // Reset Altcha if possible
      const widget = document.querySelector('altcha-widget') as
        | (HTMLElement & AltchaWidgetMethods)
        | null;
      if (widget && typeof widget.reset === 'function') {
        widget.reset();
      }
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
    <div className="max-w-xl mx-auto pt-24 font-sans text-gray-800">
      <h1 className="text-2xl font-bold mb-2 text-gray-900">Contact Us</h1>
      <p className="text-gray-600 mb-8">
        We'd love to hear from you. Send us a message and we'll respond as soon
        as possible.
      </p>

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            placeholder="Your full name"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
            placeholder="your@email.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>

        <div>
          <label
            htmlFor="subject"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Subject
          </label>
          <input
            type="text"
            id="subject"
            name="subject"
            placeholder="What is this about?"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>

        <div>
          <label
            htmlFor="message"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Message <span className="text-red-500">*</span>
          </label>
          <textarea
            id="message"
            name="message"
            required
            placeholder="Your message..."
            rows={5}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-y"
          ></textarea>
        </div>

        <div className="my-5">
          <altcha-widget
            challengeurl={`${COLLECTOR_API_URL}/s/${submitHash}/challenge`}
            auto="onload"
            hidefooter
          ></altcha-widget>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={status === 'submitting'}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === 'submitting' ? 'Sending...' : 'Send Message'}
          </button>
        </div>

        {status !== 'idle' && (
          <div
            className={`mt-4 p-3 rounded-lg text-sm ${
              status === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : status === 'error'
                  ? 'bg-red-50 text-red-800 border border-red-200'
                  : ''
            }`}
          >
            {message}
          </div>
        )}
      </form>

      <p className="mt-6 text-xs text-center text-gray-500">
        Your information is secure and will never be shared with third parties.
      </p>
    </div>
  );
}
