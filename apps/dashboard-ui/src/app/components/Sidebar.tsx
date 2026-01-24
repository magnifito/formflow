import { Link, useLocation } from 'react-router-dom';
import { LucideIcon, ArrowLeft } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface NavItem {
    label: string;
    icon: LucideIcon;
    route: string;
}

interface SidebarProps {
    sectionLabel?: string;
    navItems: NavItem[];
    showBackLink?: boolean;
    backLinkText?: string;
    backLinkRoute?: string;
}

export function Sidebar({
    sectionLabel = 'TENANT',
    navItems,
    showBackLink = false,
    backLinkText = 'Back',
    backLinkRoute = '/dashboard'
}: SidebarProps) {
    const location = useLocation();

    return (
        <aside className="fixed left-0 top-0 z-50 flex h-screen w-60 flex-col border-r border-border bg-card">
            <div className="flex items-center gap-3 border-b border-border px-6 py-5">
                <div className="flex h-8 w-8 items-center justify-center rounded bg-primary">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-primary-foreground">
                        <path d="M12 2L2 7L12 12L22 7L12 2Z" />
                        <path d="M2 17L12 22L22 17" />
                        <path d="M2 12L12 17L22 12" />
                    </svg>
                </div>
                <span className="text-xl font-bold text-foreground tracking-tight">FormFlow</span>
            </div>

            <div className="flex flex-1 flex-col py-6">
                <span className="mb-3 px-6 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                    {sectionLabel}
                </span>
                <nav className="flex flex-col gap-1 px-3">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.route || (item.route !== '/' && location.pathname.startsWith(item.route));
                        return (
                            <Link
                                key={item.route}
                                to={item.route}
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                                    isActive
                                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                            >
                                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            {showBackLink && (
                <div className="p-4 border-t border-border">
                    <Link
                        to={backLinkRoute}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                        <ArrowLeft size={18} />
                        {backLinkText}
                    </Link>
                </div>
            )}
        </aside>
    );
}
