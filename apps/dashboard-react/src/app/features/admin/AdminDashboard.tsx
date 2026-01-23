import { useEffect } from 'react';
import { useAdmin } from '../../hooks/useAdmin';
import { StatCard } from '../../components/ui/StatCard';
import { Button } from '../../components/ui/Button';
import { Link } from 'react-router-dom';
import { Loader2, Plus, BarChart3 } from 'lucide-react';

export function AdminDashboard() {
    const { stats, loading, error, loadStats } = useAdmin();

    useEffect(() => {
        loadStats();
    }, [loadStats]);

    if (loading && !stats) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 text-center bg-destructive/10 text-destructive rounded-lg">
                {error}
            </div>
        );
    }

    if (!stats) return null;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Organizations"
                    value={stats.organizations.total}
                    suffix={`${stats.organizations.active} active`}
                    icon="&#127970;"
                />
                <StatCard
                    title="Users"
                    value={stats.users.total}
                    icon="&#128101;"
                />
                <StatCard
                    title="Forms"
                    value={stats.forms.total}
                    icon="&#128196;"
                />
                <StatCard
                    title="Submissions"
                    value={stats.submissions.total}
                    suffix={`${stats.submissions.last30Days} last 30 days`}
                    icon="&#128203;"
                />
            </div>

            <div className="space-y-4">
                <h2 className="text-xl font-semibold">Quick Actions</h2>
                <div className="flex flex-wrap gap-4">
                    <Button asChild>
                        <Link to="/admin/organizations">
                            <Plus className="mr-2 h-4 w-4" />
                            Create Organization
                        </Link>
                    </Button>
                    <Button variant="outline" asChild>
                        <Link to="/admin/submissions">
                            <BarChart3 className="mr-2 h-4 w-4" />
                            View All Submissions
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}
