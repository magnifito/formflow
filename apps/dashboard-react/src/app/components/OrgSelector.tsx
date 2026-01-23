import { Link } from 'react-router-dom';

interface OrgSelectorProps {
    selectedOrgId?: number | null;
    selectedOrgName?: string;
}

export function OrgSelector({ selectedOrgId, selectedOrgName }: OrgSelectorProps) {
    return (
        <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-2">
            <span className="text-sm font-medium text-muted-foreground">Working in:</span>
            <div className="flex items-center gap-3">
                <span className={`block min-w-[200px] rounded-md border px-3 py-1.5 text-sm font-medium
            ${!selectedOrgId
                        ? 'border-yellow-400 bg-yellow-50 text-yellow-700'
                        : 'border-border bg-background text-foreground'
                    }`}>
                    {selectedOrgId ? selectedOrgName : 'No organization selected'}
                </span>
                <Link to="/admin/organizations" className="text-sm font-medium text-foreground hover:underline">
                    Switch
                </Link>
            </div>
        </div>
    );
}
