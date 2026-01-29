import { useMemo, useState } from 'react';
import {
  Mail,
  Hash,
  MessageSquare,
  Send,
  Globe,
  Layers,
  ArrowDown,
} from 'lucide-react';
import { IntegrationHierarchy } from '../../hooks/useOrganization';

const colors = {
  org: 'bg-emerald-500',
  override: 'bg-orange-500',
  inherit: 'bg-amber-500',
  placeholder: 'bg-transparent',
};

const iconForType = (type?: string) => {
  switch (type) {
    case 'email-smtp':
    case 'email-api':
      return <Mail className="h-4 w-4" />;
    case 'slack':
      return <Hash className="h-4 w-4" />;
    case 'discord':
      return <MessageSquare className="h-4 w-4" />;
    case 'telegram':
      return <Send className="h-4 w-4" />;
    default:
      return <Globe className="h-4 w-4" />;
  }
};

const labelForType = (type?: string) => {
  switch (type) {
    case 'email-smtp':
      return 'Email';
    case 'email-api':
      return 'Email';
    case 'slack':
      return 'Slack';
    case 'discord':
      return 'Discord';
    case 'telegram':
      return 'Telegram';
    case 'webhook':
      return 'Webhook';
    default:
      return 'Webhook';
  }
};

const normalizeType = (type?: string): string => {
  if (type === 'email-smtp' || type === 'email-api') return 'email';
  return type || 'webhook';
};

export type CellData = {
  label: string;
  sublabel?: string;
  colorClass: string;
  icon: React.ReactNode;
  isPlaceholder?: boolean;
  isInherited?: boolean;
  integrationId?: number;
  formId?: number | null;
  formName?: string;
  scope?: 'organization' | 'form';
  metaType?: string;
  isActive?: boolean;
};

interface CellProps {
  data: CellData;
  onClick?: () => void;
  onHover?: (data: CellData | null, rect: DOMRect | null) => void;
}

function Cell({ data, onClick, onHover }: CellProps) {
  const baseClasses = data.isPlaceholder
    ? 'border-dashed border-2 border-muted-foreground/30 text-muted-foreground bg-transparent'
    : 'border border-white/20 text-white';

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    onHover?.(data, rect);
  };

  const handleMouseLeave = () => {
    onHover?.(null, null);
  };

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`flex h-12 w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium shadow-sm cursor-pointer transition-all hover:scale-[1.03] hover:shadow-lg ${baseClasses} ${data.isPlaceholder ? '' : data.colorClass}`}
      title={data.label}
    >
      <span className="shrink-0">{data.icon}</span>
      <div className="min-w-0 flex-1 text-left">
        <div className="truncate font-semibold">{data.label}</div>
        {data.sublabel && (
          <div className="truncate text-[10px] opacity-80">{data.sublabel}</div>
        )}
      </div>
      {data.isInherited && (
        <ArrowDown className="h-3 w-3 shrink-0 opacity-60" />
      )}
    </button>
  );
}

interface PopoverProps {
  data: CellData | null;
  rect: DOMRect | null;
}

function HoverPopover({ data, rect }: PopoverProps) {
  if (!data || !rect) return null;

  const top = rect.bottom + 8;
  const left = rect.left + rect.width / 2;

  return (
    <div
      className="fixed z-50 w-64 rounded-lg border bg-popover p-3 shadow-xl animate-in fade-in zoom-in-95 duration-150"
      style={{
        top: `${top}px`,
        left: `${left}px`,
        transform: 'translateX(-50%)',
      }}
    >
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div
            className={`p-1.5 rounded ${data.isPlaceholder ? 'bg-muted' : data.colorClass}`}
          >
            {data.icon}
          </div>
          <div>
            <div className="font-semibold text-sm">{data.label}</div>
            <div className="text-xs text-muted-foreground">
              {data.scope === 'organization'
                ? 'Organization default'
                : data.formName || 'Form override'}
            </div>
          </div>
        </div>

        {!data.isPlaceholder && (
          <div className="pt-2 border-t space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <span
                className={
                  data.isActive ? 'text-emerald-500' : 'text-muted-foreground'
                }
              >
                {data.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type</span>
              <span>{labelForType(data.metaType)}</span>
            </div>
            {data.isInherited && (
              <div className="text-amber-500 text-[10px] mt-1">
                Inherited from organization
              </div>
            )}
          </div>
        )}

        {data.isPlaceholder && (
          <div className="text-xs text-muted-foreground pt-1">
            Click to configure
          </div>
        )}
      </div>
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 border-8 border-transparent border-b-popover" />
    </div>
  );
}

interface IntegrationTableProps {
  hierarchy?: IntegrationHierarchy | null;
  onCellClick?: (data: CellData) => void;
  organizationName?: string;
}

export function IntegrationTable({
  hierarchy,
  onCellClick,
  organizationName,
}: IntegrationTableProps) {
  const [hoverData, setHoverData] = useState<{
    data: CellData | null;
    rect: DOMRect | null;
  }>({
    data: null,
    rect: null,
  });

  const { integrationTypes, orgRow, formRows } = useMemo(() => {
    const forms = hierarchy?.forms || [];
    const orgIntegrations = hierarchy?.organizationIntegrations || [];

    // Collect all unique integration types
    const allTypes = new Set<string>();
    orgIntegrations.forEach((i) => allTypes.add(normalizeType(i.type)));
    forms.forEach((f) => {
      f.integrations?.forEach((i) => allTypes.add(normalizeType(i.type)));
    });

    const typeOrder = ['email', 'slack', 'discord', 'telegram', 'webhook'];
    const sortedTypes = Array.from(allTypes).sort((a, b) => {
      const aIdx = typeOrder.indexOf(a);
      const bIdx = typeOrder.indexOf(b);
      if (aIdx === -1 && bIdx === -1) return a.localeCompare(b);
      if (aIdx === -1) return 1;
      if (bIdx === -1) return -1;
      return aIdx - bIdx;
    });

    const types = sortedTypes.length > 0 ? sortedTypes : ['webhook'];

    // Group org integrations by type
    const orgByType = new Map<string, typeof orgIntegrations>();
    orgIntegrations.forEach((i) => {
      const t = normalizeType(i.type);
      const existing = orgByType.get(t) || [];
      existing.push(i);
      orgByType.set(t, existing);
    });

    // Build org row cells (one per integration type column)
    const orgCells: CellData[] = types.map((type) => {
      const integrations = orgByType.get(type) || [];
      if (integrations.length > 0) {
        const integration = integrations[0];
        return {
          label: integration.name || labelForType(integration.type),
          sublabel: integration.isActive ? 'Active' : 'Inactive',
          colorClass: colors.org,
          icon: iconForType(integration.type),
          integrationId: integration.id,
          scope: 'organization' as const,
          metaType: type,
          isActive: integration.isActive,
        };
      }
      return {
        label: 'Not configured',
        colorClass: colors.placeholder,
        icon: <Layers className="h-4 w-4 opacity-50" />,
        isPlaceholder: true,
        scope: 'organization' as const,
        metaType: type,
      };
    });

    // Build form rows (one row per form, one cell per integration type column)
    const formRowsData = forms.map((form) => {
      const formOverrides = new Map<
        string,
        (typeof form.integrations)[number]
      >();
      (form.integrations || []).forEach((integration) => {
        const t = normalizeType(integration.type);
        formOverrides.set(t, integration);
      });

      const disabledOrgDefaults = form.useOrgIntegrations === false;

      const cells: CellData[] = types.map((type) => {
        const orgHasIntegration = (orgByType.get(type) || []).length > 0;
        const override = formOverrides.get(type);

        if (override) {
          return {
            label: override.name || labelForType(override.type),
            sublabel: 'Override',
            colorClass: colors.override,
            icon: iconForType(override.type),
            integrationId: override.id,
            formId: form.id,
            formName: form.name,
            scope: 'form' as const,
            metaType: type,
            isActive: override.isActive,
          };
        } else if (orgHasIntegration && !disabledOrgDefaults) {
          const parentInt = orgByType.get(type)?.[0];
          return {
            label: 'Inherited',
            colorClass: colors.inherit,
            icon: <ArrowDown className="h-4 w-4" />,
            isInherited: true,
            integrationId: parentInt?.id,
            formId: form.id,
            formName: form.name,
            scope: 'form' as const,
            metaType: type,
            isActive: parentInt?.isActive,
          };
        }
        return {
          label: disabledOrgDefaults ? 'Disabled' : 'None',
          colorClass: colors.placeholder,
          icon: <Layers className="h-4 w-4 opacity-50" />,
          isPlaceholder: true,
          formId: form.id,
          formName: form.name,
          scope: 'form' as const,
          metaType: type,
        };
      });

      return {
        form,
        cells,
        disabledOrgDefaults,
      };
    });

    return {
      integrationTypes: types,
      orgRow: orgCells,
      formRows: formRowsData,
    };
  }, [hierarchy]);

  const handleHover = (data: CellData | null, rect: DOMRect | null) => {
    setHoverData({ data, rect });
  };

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-2">
          <thead>
            <tr>
              {/* Row label column header */}
              <th className="w-36 p-2" />
              {/* Integration type columns */}
              {integrationTypes.map((type) => (
                <th key={type} className="p-2 min-w-[160px]">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                    {iconForType(type === 'email' ? 'email-smtp' : type)}
                    <span className="text-xs font-semibold">
                      {labelForType(type === 'email' ? 'email-smtp' : type)}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Organization row */}
            <tr>
              <td className="p-2 text-right">
                <div className="flex flex-col items-end">
                  <span className="text-xs font-semibold text-foreground">
                    {organizationName || 'Organization'}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    defaults
                  </span>
                </div>
              </td>
              {orgRow.map((cell, idx) => (
                <td key={idx} className="p-1">
                  <Cell
                    data={cell}
                    onClick={() => onCellClick?.(cell)}
                    onHover={handleHover}
                  />
                </td>
              ))}
            </tr>

            {/* Form rows */}
            {formRows.map(({ form, cells, disabledOrgDefaults }) => (
              <tr key={form.id}>
                <td className="p-2 text-right">
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-semibold text-foreground">
                      {form.name}
                    </span>
                    {disabledOrgDefaults && (
                      <span className="text-[10px] text-muted-foreground">
                        overrides only
                      </span>
                    )}
                  </div>
                </td>
                {cells.map((cell, idx) => (
                  <td key={idx} className="p-1">
                    <Cell
                      data={cell}
                      onClick={() => onCellClick?.(cell)}
                      onHover={handleHover}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <HoverPopover data={hoverData.data} rect={hoverData.rect} />
    </>
  );
}

// Keep old export name for compatibility
export { IntegrationTable as IntegrationGraph };
export type { CellData as PillData };
