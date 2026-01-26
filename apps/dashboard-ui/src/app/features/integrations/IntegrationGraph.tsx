import { useMemo } from 'react';
import ReactFlow, {
    Background,
    Controls,
    Edge,
    Node,
    NodeProps,
    Position,
    ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
    Mail,
    Hash,
    MessageSquare,
    Send,
    Globe,
    Layers,
    ArrowDown
} from 'lucide-react';
import { IntegrationHierarchy } from '../../hooks/useOrganization';

const colors = {
    org: 'var(--chart-2)',
    override: 'var(--chart-4)',
    inherit: 'var(--chart-5)',
    placeholder: 'var(--muted)'
};

const edgeColors = {
    org: 'var(--chart-2)',
    override: 'var(--chart-4)',
    inherit: 'var(--chart-5)',
    placeholder: 'var(--border-strong, #CBD5E1)'
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
        case 'email-smtp': return 'Email';
        case 'email-api': return 'Email';
        case 'slack': return 'Slack';
        case 'discord': return 'Discord';
        case 'telegram': return 'Telegram';
        case 'webhook': return 'Webhook';
        default: return 'Webhook';
    }
};

// Normalize integration types for grouping (e.g., email-smtp and email-api are both "email")
const normalizeType = (type?: string): string => {
    if (type === 'email-smtp' || type === 'email-api') return 'email';
    return type || 'webhook';
};

type PillData = {
    label: string;
    sublabel?: string;
    color: string;
    icon: JSX.Element;
    isPlaceholder?: boolean;
    isInherited?: boolean;
    // Metadata for click handling
    integrationId?: number;
    formId?: number | null;
    scope?: 'organization' | 'form';
    metaType?: string; // normalized type
};

const PillNode = ({ data, selected }: NodeProps<PillData>) => {
    const baseClasses = data.isPlaceholder
        ? 'border-dashed border-2 border-border text-muted-foreground bg-transparent'
        : data.isInherited
            ? 'border border-white/20 text-white'
            : 'border border-white/20 text-white';

    const selectedClasses = selected ? 'ring-2 ring-offset-2 ring-primary' : '';

    return (
        <div
            className={`flex w-[170px] items-start gap-2 rounded-lg px-3 py-2 text-xs font-medium shadow-sm cursor-pointer transition-all hover:scale-105 ${baseClasses} ${selectedClasses}`}
            style={data.isPlaceholder ? {} : { backgroundColor: data.color }}
            title={data.sublabel ? `${data.label} - ${data.sublabel}` : data.label}
        >
            <span className="mt-0.5 shrink-0">{data.icon}</span>
            <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{data.label}</div>
                {data.sublabel && (
                    <div className="truncate text-[10px] opacity-80">{data.sublabel}</div>
                )}
            </div>
            {data.isInherited && (
                <ArrowDown className="mt-0.5 h-3 w-3 shrink-0 opacity-60" />
            )}
        </div>
    );
};

type HeaderData = { label: string; count?: number; icon: JSX.Element };

const HeaderNode = ({ data }: NodeProps<HeaderData>) => {
    return (
        <div className="flex w-[170px] flex-col items-center gap-1 rounded-lg bg-muted/50 px-3 py-2">
            <div className="flex items-center gap-2 text-muted-foreground">
                {data.icon}
                <span className="text-xs font-semibold">{data.label}</span>
            </div>
            {data.count !== undefined && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                    {data.count} {data.count === 1 ? 'integration' : 'integrations'}
                </span>
            )}
        </div>
    );
};

type RowLabelData = { label: string; description?: string };

const RowLabelNode = ({ data }: NodeProps<RowLabelData>) => {
    return (
        <div className="flex w-[90px] flex-col items-end pr-2 text-right">
            <span className="text-xs font-semibold text-foreground">{data.label}</span>
            {data.description && (
                <span className="text-[10px] text-muted-foreground">{data.description}</span>
            )}
        </div>
    );
};

const nodeTypes = { pill: PillNode, header: HeaderNode, rowLabel: RowLabelNode };

interface GraphInnerProps {
    hierarchy?: IntegrationHierarchy | null;
    onNodeClick?: (data: PillData) => void;
}

function GraphInner({ hierarchy, onNodeClick }: GraphInnerProps) {
    const { nodes, edges, totalRows } = useMemo(() => {
        const ns: Node<PillData | HeaderData | RowLabelData>[] = [];
        const es: Edge[] = [];

        const colWidth = 190;
        const rowHeight = 60;
        const labelColWidth = 110;
        const startX = labelColWidth;
        const headerY = 0;
        const orgRowY = rowHeight + 10;

        const edgeStyle = (color: string, isPlaceholder?: boolean) => ({
            stroke: color,
            strokeWidth: 2,
            strokeDasharray: isPlaceholder ? '6 6' : undefined,
            opacity: isPlaceholder ? 0.55 : 0.9
        });

        const forms = hierarchy?.forms || [];
        const orgIntegrations = hierarchy?.organizationIntegrations || [];

        // Collect all unique integration types (normalized)
        const allTypes = new Set<string>();
        orgIntegrations.forEach(i => allTypes.add(normalizeType(i.type)));
        forms.forEach(f => {
            f.integrations?.forEach(i => allTypes.add(normalizeType(i.type)));
        });

        // Sort types for consistent column ordering
        const typeOrder = ['email', 'slack', 'discord', 'telegram', 'webhook'];
        const sortedTypes = Array.from(allTypes).sort((a, b) => {
            const aIdx = typeOrder.indexOf(a);
            const bIdx = typeOrder.indexOf(b);
            if (aIdx === -1 && bIdx === -1) return a.localeCompare(b);
            if (aIdx === -1) return 1;
            if (bIdx === -1) return -1;
            return aIdx - bIdx;
        });

        // If no types, show a placeholder column
        const columns = sortedTypes.length > 0 ? sortedTypes : ['none'];

        // Group org integrations by type
        const orgByType = new Map<string, typeof orgIntegrations>();
        orgIntegrations.forEach(i => {
            const t = normalizeType(i.type);
            const existing = orgByType.get(t) || [];
            existing.push(i);
            orgByType.set(t, existing);
        });

        // Build form overrides map: formId -> type -> integration
        const formOverridesMap = new Map<number, Map<string, any>>();
        forms.forEach(form => {
            const typeMap = new Map<string, any>();
            (form.integrations || []).forEach(integration => {
                const t = normalizeType(integration.type);
                typeMap.set(t, integration);
            });
            formOverridesMap.set(form.id, typeMap);
        });

        // Add column headers with icons
        columns.forEach((type, colIdx) => {
            const x = startX + colIdx * colWidth;
            ns.push({
                id: `header-${type}`,
                type: 'header',
                position: { x, y: headerY },
                data: {
                    label: type === 'none' ? 'No Integrations' : labelForType(type === 'email' ? 'email-smtp' : type),
                    icon: type === 'none' ? <Layers className="h-4 w-4" /> : iconForType(type === 'email' ? 'email-smtp' : type)
                },
                draggable: false,
                selectable: false
            });
        });

        // Add row label for Organization
        ns.push({
            id: 'row-label-org',
            type: 'rowLabel',
            position: { x: 0, y: orgRowY + 10 },
            data: { label: 'Organization', description: 'defaults' },
            draggable: false,
            selectable: false
        });

        // Add org integration nodes (one per column)
        columns.forEach((type, colIdx) => {
            const x = startX + colIdx * colWidth;
            const y = orgRowY;
            const integrations = orgByType.get(type) || [];

            if (integrations.length > 0) {
                const integration = integrations[0];
                const nodeId = `org-${type}`;
                const extraCount = integrations.length > 1 ? ` (+${integrations.length - 1})` : '';
                ns.push({
                    id: nodeId,
                    type: 'pill',
                    position: { x, y },
                    data: {
                        label: (integration.name || labelForType(integration.type)) + extraCount,
                        sublabel: integration.isActive ? 'Active' : 'Inactive',
                        color: colors.org,
                        icon: iconForType(integration.type),
                        integrationId: integration.id,
                        scope: 'organization',
                        metaType: type
                    },
                    draggable: false,
                    selectable: true,
                    sourcePosition: Position.Bottom,
                    targetPosition: Position.Top
                });
            } else {
                const nodeId = `org-empty-${type}`;
                ns.push({
                    id: nodeId,
                    type: 'pill',
                    position: { x, y },
                    data: {
                        label: type === 'none' ? 'None configured' : 'Not configured',
                        color: colors.placeholder,
                        icon: <Layers className="h-4 w-4 opacity-50" />,
                        isPlaceholder: true,
                        scope: 'organization',
                        metaType: type
                    },
                    draggable: false,
                    selectable: true,
                    sourcePosition: Position.Bottom,
                    targetPosition: Position.Top
                });
            }
        });

        // Add a row for each form
        const formStartY = orgRowY + rowHeight + 20;
        forms.forEach((form, formIdx) => {
            const formY = formStartY + formIdx * rowHeight;
            const formOverrides = formOverridesMap.get(form.id) || new Map();
            const disabledOrgDefaults = form.useOrgIntegrations === false;

            // Row label for this form
            ns.push({
                id: `row-label-form-${form.id}`,
                type: 'rowLabel',
                position: { x: 0, y: formY + 10 },
                data: {
                    label: form.name,
                    description: disabledOrgDefaults ? 'overrides only' : undefined
                },
                draggable: false,
                selectable: false
            });

            // Add a node for each column in this form's row
            columns.forEach((type, colIdx) => {
                const x = startX + colIdx * colWidth;
                const orgHasIntegration = (orgByType.get(type) || []).length > 0;
                const orgNodeId = orgHasIntegration ? `org-${type}` : `org-empty-${type}`;
                const override = formOverrides.get(type);

                if (override) {
                    // Form has an override for this type
                    const nodeId = `form-${form.id}-${type}`;
                    ns.push({
                        id: nodeId,
                        type: 'pill',
                        position: { x, y: formY },
                        data: {
                            label: override.name || labelForType(override.type),
                            sublabel: 'Override',
                            color: colors.override,
                            icon: iconForType(override.type),
                            integrationId: override.id,
                            formId: form.id,
                            scope: 'form',
                            metaType: type
                        },
                        draggable: false,
                        selectable: true,
                        targetPosition: Position.Top
                    });

                    // Edge from org to form
                    es.push({
                        id: `e-${orgNodeId}-${nodeId}`,
                        source: orgNodeId,
                        target: nodeId,
                        type: 'smoothstep',
                        animated: false,
                        style: edgeStyle(edgeColors.override)
                    });
                } else if (orgHasIntegration && !disabledOrgDefaults) {
                    // Form inherits from org
                    const nodeId = `form-${form.id}-${type}-inherit`;
                    // Find parent integration for ID reference
                    const parentInt = orgByType.get(type)?.[0];

                    ns.push({
                        id: nodeId,
                        type: 'pill',
                        position: { x, y: formY },
                        data: {
                            label: 'Inherited',
                            color: colors.inherit,
                            icon: <ArrowDown className="h-4 w-4" />,
                            isInherited: true,
                            integrationId: parentInt?.id, // Point to parent for details
                            formId: form.id,
                            scope: 'form', // It's in form row but logic is organization
                            metaType: type
                        },
                        draggable: false,
                        selectable: true,
                        targetPosition: Position.Top
                    });

                    es.push({
                        id: `e-${orgNodeId}-${nodeId}`,
                        source: orgNodeId,
                        target: nodeId,
                        type: 'smoothstep',
                        animated: false,
                        style: edgeStyle(edgeColors.inherit)
                    });
                } else {
                    // No integration for this type in this form
                    const nodeId = `form-${form.id}-${type}-empty`;
                    ns.push({
                        id: nodeId,
                        type: 'pill',
                        position: { x, y: formY },
                        data: {
                            label: disabledOrgDefaults ? 'Disabled' : 'None',
                            color: colors.placeholder,
                            icon: <Layers className="h-4 w-4 opacity-50" />,
                            isPlaceholder: true,
                            formId: form.id,
                            scope: 'form',
                            metaType: type
                        },
                        draggable: false,
                        selectable: true,
                        targetPosition: Position.Top
                    });

                    es.push({
                        id: `e-${orgNodeId}-${nodeId}`,
                        source: orgNodeId,
                        target: nodeId,
                        type: 'smoothstep',
                        animated: false,
                        style: edgeStyle(edgeColors.placeholder, true)
                    });
                }
            });
        });

        // Total rows = header + org + forms
        const numRows = 2 + forms.length;
        return { nodes: ns, edges: es, totalRows: numRows };
    }, [hierarchy]);

    const graphHeight = Math.max(800, 80 + totalRows * 60 + 40);

    return (
        <div className="overflow-hidden rounded-b-xl" style={{ height: `${graphHeight}px` }}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={true}
                onNodeClick={(_, node) => {
                    if (node.type === 'pill' && onNodeClick) {
                        onNodeClick(node.data as PillData);
                    }
                }}
                zoomOnScroll={false}
                zoomOnPinch={false}
                panOnScroll
                defaultEdgeOptions={{ animated: false, style: { strokeWidth: 2, stroke: 'var(--border-strong, #CBD5E1)' } }}
                defaultViewport={{ x: 20, y: 20, zoom: 1 }}
                minZoom={0.5}
                maxZoom={1.5}
                className="h-full w-full bg-linear-to-b from-card to-muted/30"
            >
                <Background gap={24} size={1} color="var(--border)" />
                <Controls
                    showInteractive={false}
                    position="bottom-right"
                    className="rounded-lg border border-border/70 bg-card/80 shadow-sm backdrop-blur"
                />
            </ReactFlow>
        </div>
    );
}

export function IntegrationGraph({ hierarchy, onNodeClick }: GraphInnerProps) {
    return (
        <ReactFlowProvider>
            <GraphInner hierarchy={hierarchy} onNodeClick={onNodeClick} />
        </ReactFlowProvider>
    );
}
