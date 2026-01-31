import { useState, useEffect } from 'react';
import { FormGallery } from './FormGallery';
import type { ExampleForm } from './FormGalleryCard';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/button';
import {
  ArrowLeft,
  Monitor,
  Smartphone,
  Tablet,
  Copy,
  Code,
  Maximize2,
  Minimize2,
  Link,
  Shuffle,
} from 'lucide-react';
import { fillFormWithRandomData } from '../../lib/randomFormData';

// Import Templates
import { ContactForm } from '../../templates/ContactForm';
import { NewsletterSignup } from '../../templates/NewsletterSignup';
import { ResourceDownload } from '../../templates/ResourceDownload';
import { DemoRequest } from '../../templates/DemoRequest';
import { WebinarRegistration } from '../../templates/WebinarRegistration';
import { WaitlistSignup } from '../../templates/WaitlistSignup';
import { JobApplicationForm } from '../../templates/JobApplicationForm';

// Import Raw Source
import ContactFormSource from '../../templates/ContactForm.tsx?raw';
import NewsletterSignupSource from '../../templates/NewsletterSignup.tsx?raw';
import ResourceDownloadSource from '../../templates/ResourceDownload.tsx?raw';
import DemoRequestSource from '../../templates/DemoRequest.tsx?raw';
import WebinarRegistrationSource from '../../templates/WebinarRegistration.tsx?raw';
import WaitlistSignupSource from '../../templates/WaitlistSignup.tsx?raw';
import JobApplicationFormSource from '../../templates/JobApplicationForm.tsx?raw';

const TEMPLATE_MAP: Record<
  string,
  React.ComponentType<{ submitHash: string; downloadUrl?: string }>
> = {
  'contact-form': ContactForm,
  'newsletter-signup': NewsletterSignup,
  'resource-download': ResourceDownload,
  'demo-request': DemoRequest,
  'webinar-registration': WebinarRegistration,
  'waitlist-signup': WaitlistSignup,
  'job-application': JobApplicationForm,
};

const TEMPLATE_SOURCE_MAP: Record<string, string> = {
  'contact-form': ContactFormSource,
  'newsletter-signup': NewsletterSignupSource,
  'resource-download': ResourceDownloadSource,
  'demo-request': DemoRequestSource,
  'webinar-registration': WebinarRegistrationSource,
  'waitlist-signup': WaitlistSignupSource,
  'job-application': JobApplicationFormSource,
};

export function ExamplesPreview() {
  const [selectedExample, setSelectedExample] = useState<ExampleForm | null>(
    null,
  );
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>(
    'desktop',
  );
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
  const [isExpanded, setIsExpanded] = useState(false);

  // User forms state
  const [availableForms, setAvailableForms] = useState<
    { id: number; name: string; submitHash: string; orgName: string }[]
  >([]);
  const [selectedFormHash, setSelectedFormHash] = useState<string>('');
  const [loadingForms, setLoadingForms] = useState(false);

  // Fetch user forms on mount
  useEffect(() => {
    const fetchForms = async () => {
      setLoadingForms(true);
      try {
        // Check if user is logged in first
        if (localStorage.getItem('lab.authToken')) {
          const data = await api.org.getFormsWithOrgs();
          const flattened = data.flatMap((org) =>
            org.forms.map((form) => ({
              id: form.id,
              name: form.name,
              submitHash: form.submitHash,
              orgName: org.organization.name,
            })),
          );
          setAvailableForms(flattened);

          // Auto-select the first form if available
          if (flattened.length > 0) {
            setSelectedFormHash(flattened[0].submitHash);
          }
        }
      } catch (err) {
        console.error('Failed to fetch user forms', err);
      } finally {
        setLoadingForms(false);
      }
    };
    fetchForms();
  }, []);

  const handleView = (example: ExampleForm) => {
    setSelectedExample(example);
    setViewMode('preview');
  };

  const handleBack = () => {
    setSelectedExample(null);
    setIsExpanded(false);
    setSelectedFormHash(''); // Reset hash selection
  };

  const getCodeSnippet = () => {
    if (!selectedExample) return '';
    return (
      TEMPLATE_SOURCE_MAP[selectedExample.id] ||
      '<!-- Source code not found -->'
    );
  };

  const handleCopyCode = () => {
    const code = getCodeSnippet();
    navigator.clipboard.writeText(code);
  };

  const handleFillRandom = () => {
    // Find any form in the current preview and fill it with random data
    const form = document.querySelector('form') as HTMLFormElement | null;
    if (form) {
      fillFormWithRandomData(form);
    }
  };

  if (!selectedExample) {
    return (
      <div className="h-full flex flex-col">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight">
            Template Gallery
          </h2>
          <p className="text-muted-foreground">
            Browse our collection of production-ready React form templates.
            Click on any card to preview the form and get the code.
          </p>
        </div>
        <div className="flex-1 min-h-0">
          <FormGallery onSelect={handleView} />
        </div>
      </div>
    );
  }

  const containerInfo = isExpanded
    ? 'fixed inset-0 z-50 bg-background p-4 flex flex-col'
    : 'h-full flex flex-col';

  const SelectedComponent = TEMPLATE_MAP[selectedExample.id];
  const activeHash = selectedFormHash || selectedExample.formSubmitHash;

  return (
    <div className={containerInfo}>
      <div className="flex items-center justify-between gap-4 mb-4 pb-4 border-b shrink-0">
        <div className="flex items-center gap-3">
          {!isExpanded && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <div className="h-4 w-px bg-border" />
            </>
          )}
          <div>
            <h2 className="font-semibold">{selectedExample.name}</h2>
            <div className="text-xs text-muted-foreground">React Template</div>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          {/* Form Selection Dropdown */}
          <div className="flex items-center gap-2 mr-2">
            <div className="relative">
              <select
                className="h-8 pl-8 pr-4 text-xs bg-background border rounded-md focus:outline-none focus:ring-1 focus:ring-ring appearance-none min-w-[180px] max-w-[250px]"
                value={selectedFormHash}
                onChange={(e) => setSelectedFormHash(e.target.value)}
                disabled={loadingForms || availableForms.length === 0}
              >
                <option value="">Use Demo Hash</option>
                {availableForms.map((form) => (
                  <option key={form.id} value={form.submitHash}>
                    {form.name} ({form.orgName})
                  </option>
                ))}
              </select>
              <Link className="absolute left-2.5 top-2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          <div className="bg-muted p-1 rounded-md flex items-center gap-1 mr-2 shrink-0">
            <button
              onClick={() => setViewMode('preview')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-sm transition-all ${viewMode === 'preview' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Monitor className="w-3 h-3" />
              Preview
            </button>
            <button
              onClick={() => setViewMode('code')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-sm transition-all ${viewMode === 'code' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Code className="w-3 h-3" />
              Code
            </button>
          </div>

          {viewMode === 'preview' && (
            <div className="hidden lg:flex items-center bg-muted rounded-md border mr-2 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 rounded-none rounded-l-md ${viewport === 'desktop' ? 'bg-background shadow-sm' : ''}`}
                onClick={() => setViewport('desktop')}
                title="Desktop View"
              >
                <Monitor className="w-4 h-4" />
              </Button>
              <div className="w-px h-4 bg-border" />
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 rounded-none ${viewport === 'tablet' ? 'bg-background shadow-sm' : ''}`}
                onClick={() => setViewport('tablet')}
                title="Tablet View"
              >
                <Tablet className="w-4 h-4" />
              </Button>
              <div className="w-px h-4 bg-border" />
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 rounded-none rounded-r-md ${viewport === 'mobile' ? 'bg-background shadow-sm' : ''}`}
                onClick={() => setViewport('mobile')}
                title="Mobile View"
              >
                <Smartphone className="w-4 h-4" />
              </Button>
            </div>
          )}

          {viewMode === 'preview' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleFillRandom}
              title="Fill Random Data"
              className="gap-2 shrink-0"
            >
              <Shuffle className="w-4 h-4" />
              <span className="hidden lg:inline">Fill Random</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyCode}
            title="Copy Code"
            className="gap-2 shrink-0"
          >
            <Copy className="w-4 h-4" />
            <span className="hidden lg:inline">Copy</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Exit Fullscreen' : 'Expand View'}
          >
            {isExpanded ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      <div className="flex-1 bg-muted/30 rounded-lg border overflow-hidden relative flex items-center justify-center">
        {viewMode === 'preview' ? (
          <div className="w-full h-full flex items-center justify-center bg-white p-4 overflow-auto">
            <div className="w-full h-full overflow-auto">
              {SelectedComponent ? (
                <SelectedComponent
                  submitHash={activeHash}
                  downloadUrl={
                    selectedExample.id === 'resource-download'
                      ? selectedExample.resourceDownloadUrl
                      : undefined
                  }
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Template not found
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="w-full h-full overflow-hidden flex flex-col bg-[#1e1e1e] text-[#d4d4d4]">
            <div className="flex-1 overflow-auto p-4 font-mono text-xs">
              <pre>{getCodeSnippet()}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
