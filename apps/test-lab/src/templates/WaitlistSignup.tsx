import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { Sparkles, ArrowRight } from 'lucide-react';

interface WaitlistSignupProps {
  submitHash: string;
}

export function WaitlistSignup({ submitHash }: WaitlistSignupProps) {
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
    data['joinedAt'] = new Date().toISOString();

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
        'You are now on the waitlist! We will notify you as soon as we launch.',
      );
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
    <div className="min-h-screen bg-black text-white font-sans selection:bg-purple-500 selection:text-white flex flex-col relative overflow-hidden">
      {/* Ambient Background */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-purple-900/40 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute top-[40%] -right-[10%] w-[40%] h-[60%] bg-blue-900/30 rounded-full blur-[120px] animate-pulse delay-700"></div>
        <div className="absolute -bottom-[20%] left-[20%] w-[60%] h-[40%] bg-indigo-900/30 rounded-full blur-[100px]"></div>
      </div>

      <div className="relative z-10 container mx-auto px-6 py-20 flex-1 flex flex-col items-center justify-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-xs font-medium tracking-wide mb-8 backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span>COMING SOON</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
          The Next Gen <br className="hidden md:block" /> Creative Suite.
        </h1>

        <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          AI-powered design tools that actually understand your vision. Stop
          fighting with pixels and start creating.
        </p>

        <div className="w-full max-w-md mx-auto">
          {status === 'success' ? (
            <div className="bg-white/5 backdrop-blur-xl border border-green-500/30 p-8 rounded-2xl animate-in fade-in zoom-in duration-300">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-2xl font-bold mb-2">You're on the list!</h3>
              <p className="text-gray-400 text-sm">
                We've saved your spot. Keep an eye on your inbox for early
                access updates.
              </p>
            </div>
          ) : (
            <form
              ref={formRef}
              onSubmit={handleSubmit}
              className="flex flex-col gap-4"
            >
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 blur"></div>
                <div className="relative bg-black rounded-xl p-1 flex items-center">
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="Enter your email address..."
                    className="w-full bg-transparent text-white px-5 py-4 focus:outline-none placeholder:text-gray-600 text-lg"
                    disabled={status === 'submitting'}
                  />
                  <button
                    type="submit"
                    disabled={status === 'submitting'}
                    className="bg-white text-black p-3.5 rounded-lg hover:bg-gray-200 transition-colors shrink-0 mr-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ArrowRight className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {status === 'error' && (
                <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded-lg border border-red-900/50">
                  {message}
                </div>
              )}

              <p className="text-gray-500 text-sm mt-4">
                Join 10,000+ designers waiting for access. No spam, ever.
              </p>
            </form>
          )}
        </div>
      </div>

      <div className="relative z-10 w-full border-t border-white/10 py-8">
        <div className="container mx-auto px-6 flex justify-between items-center text-xs text-gray-600">
          <div>&copy; 2024 DesignFlow AI</div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-gray-400">
              Twitter
            </a>
            <a href="#" className="hover:text-gray-400">
              Instagram
            </a>
            <a href="#" className="hover:text-gray-400">
              Privacy
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
