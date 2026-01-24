import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Check, Search, Building2, Shield, Loader2 } from 'lucide-react';
import { useAdmin } from '../hooks/useAdmin';
import { useOrganizationContext } from '../hooks/useOrganizationContext';

export function OrgSelector() {
    const navigate = useNavigate();
    const { organizations, loadOrganizations, loading } = useAdmin();
    const { selectedOrgId, setSelectedOrgId } = useOrganizationContext();

    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Load organizations if not already loaded
    useEffect(() => {
        if (!organizations && !loading) {
            loadOrganizations();
        }
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelectOrg = (orgId: number) => {
        setSelectedOrgId(orgId);
        setIsOpen(false);
        navigate('/dashboard');
    };

    const handleSelectSuperAdmin = () => {
        setSelectedOrgId(null);
        setIsOpen(false);
        navigate('/admin');
    };

    const selectedOrg = organizations?.data.find(org => org.id === selectedOrgId);

    // Filter organizations
    const filteredOrgs = organizations?.data.filter(org =>
        org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        org.slug.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium hover:bg-muted/50 transition-colors shadow-sm"
            >
                {selectedOrg ? (
                    <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary" />
                        <span>{selectedOrg.name}</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-indigo-600">
                        <Shield className="h-4 w-4" />
                        <span>Super Admin</span>
                    </div>
                )}
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute left-0 top-full mt-2 w-72 rounded-xl border border-border bg-card shadow-lg animate-in fade-in zoom-in-95 duration-100 z-50 overflow-hidden">
                    <div className="p-2 border-b border-border/50 bg-muted/20">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Switch Organization..."
                                className="w-full rounded-md border border-border bg-background py-1.5 pl-8 pr-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="max-h-[300px] overflow-y-auto py-1">
                        <button
                            onClick={handleSelectSuperAdmin}
                            className={`flex w-full items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-muted ${!selectedOrgId ? 'bg-primary/5 text-primary' : ''}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${!selectedOrgId ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted border-border'}`}>
                                    <Shield className="h-4 w-4" />
                                </div>
                                <div className="text-left">
                                    <p className="font-medium">Super Admin View</p>
                                    <p className="text-xs text-muted-foreground">Manage everything</p>
                                </div>
                            </div>
                            {!selectedOrgId && <Check className="h-4 w-4 text-primary" />}
                        </button>

                        <div className="my-1 border-t border-border/50" />

                        <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Organizations
                        </div>

                        {loading && !organizations ? (
                            <div className="flex items-center justify-center py-4 text-muted-foreground">
                                <Loader2 className="h-5 w-5 animate-spin" />
                            </div>
                        ) : filteredOrgs.length > 0 ? (
                            filteredOrgs.map(org => (
                                <button
                                    key={org.id}
                                    onClick={() => handleSelectOrg(org.id)}
                                    className={`flex w-full items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-muted group ${selectedOrgId === org.id ? 'bg-primary/5 text-primary' : ''}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${selectedOrgId === org.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border group-hover:border-primary/50'}`}>
                                            <Building2 className="h-4 w-4" />
                                        </div>
                                        <div className="text-left overflow-hidden">
                                            <p className="font-medium truncate max-w-[160px]">{org.name}</p>
                                            <p className="text-xs text-muted-foreground truncate max-w-[160px]">{org.slug}</p>
                                        </div>
                                    </div>
                                    {selectedOrgId === org.id && <Check className="h-4 w-4 text-primary" />}
                                </button>
                            ))
                        ) : (
                            <div className="px-3 py-8 text-center text-xs text-muted-foreground">
                                No organizations found
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
