import { useEffect, useState } from 'react';
import { api, setAuthToken } from './lib/api';
import type { Form, SubmissionResponse } from './lib/types';
import { FormSelector } from './features/lab/FormSelector';
import { TestPayloadForm } from './features/lab/TestPayloadForm';
import { ResponseViewer } from './features/lab/ResponseViewer';
import { Button } from './components/ui/button';
import { ExamplesPreview } from './features/gallery/ExamplesPreview';
import {
  LogOut,
  LayoutList,
  Beaker,
  MessageSquare,
  Terminal,
  ExternalLink,
  GalleryHorizontalEnd,
} from 'lucide-react';
import { WebhookTester } from './features/lab/WebhookTester';

interface ResponseState {
  data: SubmissionResponse | null;
  status: number | null;
  duration: number | null;
  error: string | null;
}

interface AppUser {
  name?: string;
  email?: string;
  organization?: { name: string };
}

function App() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [lastResponse, setLastResponse] = useState<ResponseState | null>(null);
  const [activeTab, setActiveTab] = useState<'tester' | 'webhooks' | 'gallery'>(
    'tester',
  );

  useEffect(() => {
    // Check for existing session
    const initAuth = async () => {
      const storedToken = localStorage.getItem('lab.authToken');
      if (storedToken) {
        setAuthToken(storedToken);
        try {
          const userData = await api.auth.me();
          setUser(userData);
        } catch {
          // Token invalid, try lab login
          try {
            const loginData = await api.auth.labLogin();
            setAuthToken(loginData.token);
            setUser(loginData.user);
          } catch {
            setAuthToken(null);
          }
        }
      } else {
        // No token, try lab login
        try {
          const loginData = await api.auth.labLogin();
          setAuthToken(loginData.token);
          setUser(loginData.user);
        } catch (e) {
          console.error('Auto-login failed:', e);
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const handleLogout = () => {
    setAuthToken(null);
    setUser(null);
  };

  const handleSubmission = async (
    payload: Record<string, unknown>,
    options: { csrfToken?: string | 'auto' },
  ) => {
    if (!selectedForm) return;
    setSubmitting(true);
    setLastResponse(null);
    const startTime = Date.now();

    try {
      let csrfToken = undefined;
      if (options.csrfToken === 'auto') {
        const tokenData = await api.collector.getCsrfToken(
          selectedForm.submitHash,
        );
        csrfToken = tokenData.token;
      }

      const response = await api.collector.submit(
        selectedForm.submitHash,
        payload,
        { csrfToken },
      );

      setLastResponse({
        data: response,
        status: 200,
        duration: Date.now() - startTime,
        error: null,
      });
    } catch (error) {
      const err = error as {
        response?: { data?: SubmissionResponse; status?: number };
        message?: string;
      };
      setLastResponse({
        data: err.response?.data || null,
        status: err.response?.status || 500,
        duration: Date.now() - startTime,
        error: err.message || 'Submission failed',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
        <header className="mb-8 text-center text-destructive">
          <h1 className="text-4xl font-bold flex items-center justify-center gap-3">
            <Beaker className="w-10 h-10" />
            Auto-Login Failed
          </h1>
          <p className="mt-2 text-muted-foreground">
            Please ensure the dashboard-api is running and a super admin user
            exists.
          </p>
          <div className="mt-6">
            <Button
              variant="default"
              size="lg"
              onClick={async () => {
                if (
                  confirm(
                    'This will create a new Super Admin user (admin@formflow.fyi). Continue?',
                  )
                ) {
                  try {
                    const data = await api.auth.setup({
                      email: 'admin@formflow.fyi',
                      password: 'password123',
                      name: 'System Administrator',
                      organizationName: 'Default Organization',
                      organizationSlug: 'default-org',
                    });
                    setAuthToken(data.token);
                    setUser(data.user);
                  } catch (e) {
                    const err = e as {
                      response?: { data?: { error?: string } };
                      message?: string;
                    };
                    alert(
                      'Failed to initialize admin: ' +
                        (err.response?.data?.error || err.message),
                    );
                  }
                }
              }}
            >
              Initialize Admin
            </Button>
          </div>
        </header>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b bg-muted/20 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 font-bold text-xl">
              <Beaker className="w-6 h-6 text-primary" />
              FormFlow Lab
            </div>

            <nav className="hidden md:flex items-center bg-muted/50 rounded-lg p-1 border">
              <button
                onClick={() => setActiveTab('tester')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'tester' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <MessageSquare className="w-4 h-4" />
                Form Tester
              </button>
              <button
                onClick={() => setActiveTab('gallery')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'gallery' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <GalleryHorizontalEnd className="w-4 h-4" />
                Example Gallery
              </button>
              <button
                onClick={() => setActiveTab('webhooks')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'webhooks' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Terminal className="w-4 h-4" />
                Webhook Tester
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <div className="hidden md:flex items-center gap-2 border-r pr-4">
              <a
                href={
                  import.meta.env.VITE_DASHBOARD_UI_URL ||
                  'http://localhost:4100'
                }
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-2 py-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                Dashboard
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href={
                  import.meta.env.VITE_MAILPIT_UI_URL || 'http://localhost:8025'
                }
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-2 py-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                Mailpit
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="flex flex-col items-end">
              <span className="font-medium">{user?.name || user?.email}</span>
              <span className="text-xs text-muted-foreground">
                {user?.organization?.name || 'Personal'}
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 flex flex-col min-h-0 overflow-hidden">
        {activeTab === 'tester' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full min-h-0">
            <div className="lg:col-span-1 space-y-6 h-full overflow-hidden flex flex-col">
              <FormSelector
                onFormSelect={setSelectedForm}
                selectedFormId={selectedForm?.id || null}
              />
            </div>

            <div className="lg:col-span-2 space-y-6 h-full flex flex-col overflow-hidden">
              {!selectedForm ? (
                <div className="h-full border rounded-lg bg-card border-dashed flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <LayoutList className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p>Select a form from the sidebar to start testing.</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full p-1 overflow-hidden">
                  <div className="h-full overflow-hidden flex flex-col">
                    <TestPayloadForm
                      form={selectedForm}
                      onSubmit={handleSubmission}
                      loading={submitting}
                    />
                  </div>
                  <div className="h-full overflow-hidden flex flex-col">
                    <ResponseViewer
                      response={lastResponse?.data || null}
                      status={lastResponse?.status || null}
                      duration={lastResponse?.duration || null}
                      error={lastResponse?.error || null}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'gallery' ? (
          <div className="h-full min-h-0">
            <ExamplesPreview />
          </div>
        ) : (
          <div className="h-full min-h-0">
            <WebhookTester />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
