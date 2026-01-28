import { Link } from 'react-router-dom';
import { Bell, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { OrgSelector } from './OrgSelector';
import { useOrganizationContext } from '../hooks/useOrganizationContext';

interface HeaderProps {
    organizationName?: string;
    userName?: string;
    avatarUrl?: string;
    role?: string;
    isSuperAdmin?: boolean;
    onLogout: () => void;
}

export function Header({
    organizationName,
    userName,
    avatarUrl,
    role,
    isSuperAdmin,
    onLogout
}: HeaderProps) {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const { selectedOrgId } = useOrganizationContext();

    return (
        <header className="fixed left-60 right-0 top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-background px-6">
            <div className="flex items-center gap-6">
                <h1 className="text-xl font-semibold text-foreground">{organizationName || 'Organization'}</h1>
                {isSuperAdmin && <OrgSelector />}
            </div>

            <div className="flex items-center gap-4">
                <button className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                    <Bell size={20} />
                </button>

                <div
                    className="relative flex cursor-pointer items-center gap-3 rounded-lg py-1.5 pl-3 pr-2 transition-colors hover:bg-muted"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                    <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-muted border border-border">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="User" className="h-full w-full object-cover" />
                        ) : (
                            <span className="text-sm font-semibold text-muted-foreground">
                                {userName ? userName.substring(0, 2).toUpperCase() : '?'}
                            </span>
                        )}
                    </div>

                    <span className={`rounded px-2.5 py-1 text-xs font-medium 
                        ${isSuperAdmin || role === 'org_admin' ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                        {isSuperAdmin ? 'Super Admin' : (role === 'org_admin' ? 'Org Admin' : 'Member')}
                    </span>

                    <ChevronDown size={16} className="text-muted-foreground" />

                    {dropdownOpen && (
                        <div className="absolute right-0 top-full mt-2 w-48 overflow-hidden rounded-lg border border-border bg-card shadow-lg animate-in fade-in zoom-in-95 duration-200">
                            <Link to="/account" className="block w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-muted">
                                Profile
                            </Link>
                            <Link to="/security" className="block w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-muted">
                                Security
                            </Link>
                            <Link to="/notifications" className="block w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-muted">
                                Notifications
                            </Link>
                            {isSuperAdmin && (
                                <>
                                    <div className="border-t border-border my-1" />
                                    <Link to="/admin" className="block w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-muted">
                                        Admin Panel
                                    </Link>
                                </>
                            )}
                            <div className="border-t border-border my-1" />
                            <button
                                onClick={(e) => { e.stopPropagation(); onLogout(); }}
                                className="block w-full px-4 py-2.5 text-left text-sm text-destructive hover:bg-destructive/10"
                            >
                                Sign Out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
