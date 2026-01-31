import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import type { Form, Organization } from '../../lib/types';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { FileText, RefreshCw, Hash, Link2 } from 'lucide-react';

interface FormSelectorProps {
  onFormSelect: (form: Form) => void;
  selectedFormId: number | null;
}

export function FormSelector({
  onFormSelect,
  selectedFormId,
}: FormSelectorProps) {
  const [groups, setGroups] = useState<
    Array<{ organization: Organization; forms: Form[] }>
  >([]);
  const [loading, setLoading] = useState(true);
  const collectorUrl =
    import.meta.env.VITE_COLLECTOR_URL || 'http://localhost:3000';

  const loadForms = async () => {
    setLoading(true);
    try {
      const data = await api.org.getFormsWithOrgs();
      // Filter out the internal "Demo Org" used for the gallery
      const filtered = data.filter((g) => g.organization.slug !== 'demo-org');
      setGroups(
        filtered as Array<{ organization: Organization; forms: Form[] }>,
      );
    } catch (error) {
      console.error('Failed to load forms', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadForms();
  }, []);

  return (
    <Card className="h-full flex flex-col border-0 shadow-none bg-transparent">
      <div className="flex items-center justify-between mb-4 px-1">
        <h3 className="font-semibold flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Your Forms
        </h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={loadForms}
          title="Refresh Forms"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="space-y-3 overflow-y-auto flex-1 pr-1">
        {groups.map((group) => (
          <div key={group.organization.id} className="space-y-2">
            <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
              {group.organization.name}
            </div>
            {group.forms.map((form) => (
              <button
                key={form.id}
                onClick={() => onFormSelect(form)}
                className={`w-full text-left p-3 rounded-md border transition-all hover:bg-accent group
                                ${selectedFormId === form.id ? 'bg-accent border-primary ring-1 ring-primary' : 'bg-card border-border'}
                            `}
              >
                <div className="font-medium truncate">{form.name}</div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1 font-mono group-hover:text-foreground/80">
                  <Hash className="w-3 h-3" />
                  {form.submitHash}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1 group-hover:text-foreground/80 break-all">
                  <Link2 className="w-3 h-3" />
                  {`${collectorUrl}/s/${form.submitHash}`}
                </div>
              </button>
            ))}
            {group.forms.length === 0 && (
              <div className="text-xs text-muted-foreground italic">
                No forms.
              </div>
            )}
          </div>
        ))}

        {!loading && groups.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-8 border rounded-md border-dashed">
            No forms found.
          </div>
        )}
      </div>
    </Card>
  );
}
