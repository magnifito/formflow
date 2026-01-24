import { useEffect, useState } from 'react';
import { api, setAuthToken } from './lib/api';
import type { User, Form, SubmissionResponse } from './lib/types';
import { FormSelector } from './features/lab/FormSelector';
import { TestPayloadForm } from './features/lab/TestPayloadForm';
import { ResponseViewer } from './features/lab/ResponseViewer';
import { Button } from './components/ui/button';
import { LogOut, LayoutList, Beaker } from 'lucide-react';

interface ResponseState {
  data: SubmissionResponse | null;
  status: number | null;
  duration: number | null;
  error: string | null;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [lastResponse, setLastResponse] = useState<ResponseState | null>(null);

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
          } catch (e) {
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
          console.error("Auto-login failed:", e);
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

  const handleSubmission = async (payload: any, options: { csrfToken?: string | 'auto' }) => {
    if (!selectedForm) return;
    setSubmitting(true);
    setLastResponse(null);
    const startTime = Date.now();

    try {
      let csrfToken = undefined;
      if (options.csrfToken === 'auto') {
        const tokenData = await api.collector.getCsrfToken(selectedForm.submitHash, window.location.origin);
        csrfToken = tokenData.token;
      }

      const response = await api.collector.submit(selectedForm.submitHash, payload, { csrfToken });

      setLastResponse({
        data: response,
        status: 200, // Axios throws on non-2xx usually, or we can inspect response object if we changed api.ts to return full response
        duration: Date.now() - startTime,
        error: null
      });
    } catch (error: any) {
      setLastResponse({
        data: error.response?.data || null,
        status: error.response?.status || 500,
        duration: Date.now() - startTime,
        error: error.message || 'Submission failed'
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen bg-background text-foreground">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
        <header className="mb-8 text-center text-destructive">
          <h1 className="text-4xl font-bold flex items-center justify-center gap-3">
            <Beaker className="w-10 h-10" />
            Auto-Login Failed
          </h1>
          <p className="mt-2 text-muted-foreground">Please ensure the dashboard-api is running and a super admin user exists.</p>
        </header>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b bg-muted/20 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl">
            <Beaker className="w-6 h-6 text-primary" />
            FormFlow Lab
          </div>

          <div className="flex items-center gap-4 text-sm">
            <div className="flex flex-col items-end">
              <span className="font-medium">{user.name || user.email}</span>
              <span className="text-xs text-muted-foreground">{user.organization?.name || 'Personal'}</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6 h-[calc(100vh-8rem)]">
          <FormSelector onFormSelect={setSelectedForm} selectedFormId={selectedForm?.id || null} />
        </div>

        <div className="lg:col-span-2 space-y-6 h-[calc(100vh-8rem)] flex flex-col">
          {!selectedForm ? (
            <div className="h-full border rounded-lg bg-card border-dashed flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <LayoutList className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p>Select a form from the sidebar to start testing.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full p-1">
              <div className="h-full overflow-hidden">
                <TestPayloadForm
                  form={selectedForm}
                  onSubmit={handleSubmission}
                  loading={submitting}
                />
              </div>
              <div className="h-full overflow-hidden">
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
      </main>
    </div>
  );
}

export default App;
