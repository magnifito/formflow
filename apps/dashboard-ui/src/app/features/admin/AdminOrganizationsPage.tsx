import { useEffect, useState } from 'react';
import { useAdmin, Organization } from '../../hooks/useAdmin';
import { useOrganizationContext } from '../../hooks/useOrganizationContext';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Switch } from '../../components/ui/Switch';
import { Input } from '../../components/ui/Input';
import { Loader2, Plus, ArrowLeftRight, Eye, UserPlus, X, Trash2 } from 'lucide-react';
import { AdminUserModal } from '../../components/AdminUserModal';
import { AdminOrgViewModal } from '../../components/AdminOrgViewModal';

export function AdminOrganizationsPage() {
    const {
        organizations, loading, error,
        loadOrganizations, createOrganization, updateOrganization, createUser
    } = useAdmin();

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState('');
    const [newOrg, setNewOrg] = useState({ name: '', slug: '' });
    const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

    const [selectedDetailOrg, setSelectedDetailOrg] = useState<Organization | null>(null);
    const [inviteOrgTarget, setInviteOrgTarget] = useState<Organization | null>(null);

    useEffect(() => {
        loadOrganizations();
    }, [loadOrganizations]);

    const generateSlug = (name: string): string => {
        return name
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '');
    };

    const handleNameChange = (name: string) => {
        setNewOrg(prev => ({ ...prev, name }));
        if (!slugManuallyEdited) {
            setNewOrg(prev => ({ ...prev, slug: generateSlug(name) }));
        }
    };

    const handleCreateOrg = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        setCreateError('');
        try {
            await createOrganization(newOrg);
            setShowCreateModal(false);
            setNewOrg({ name: '', slug: '' });
        } catch (err: any) {
            setCreateError(err.message);
        } finally {
            setCreating(false);
        }
    };

    const handleToggleStatus = async (org: Organization, isActive: boolean) => {
        try {
            await updateOrganization(org.id, { isActive });
        } catch (err: any) {
            console.error('Failed to toggle org status:', err);
        }
    };

    const { setSelectedOrgId, selectedOrgId } = useOrganizationContext();

    const handleSwitchOrg = (org: Organization) => {
        setSelectedOrgId(org.id);
        // Data will reload automatically via useOrganization hook's dependency on selectedOrgId
    };

    if (loading && !organizations) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Organizations</h1>
                <Button onClick={() => setShowCreateModal(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Organization
                </Button>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Slug</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {organizations?.data.map((org) => (
                                <TableRow key={org.id}>
                                    <TableCell className="font-medium">{org.name}</TableCell>
                                    <TableCell><code className="bg-muted px-1.5 py-0.5 rounded text-xs">{org.slug}</code></TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <span className={`text-xs font-medium ${org.isActive ? 'text-green-600' : 'text-muted-foreground'}`}>
                                                {org.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                            <Switch
                                                checked={org.isActive}
                                                onCheckedChange={(checked) => handleToggleStatus(org, checked)}
                                            />
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{new Date(org.createdAt).toLocaleDateString()}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="icon" title="Switch" onClick={() => handleSwitchOrg(org)}>
                                                <ArrowLeftRight className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" title="View" onClick={() => setSelectedDetailOrg(org)}>
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" title="Invite Admin" onClick={() => setInviteOrgTarget(org)}>
                                                <UserPlus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Create Org Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" onClick={() => setShowCreateModal(false)}>
                    <Card className="w-full max-w-md shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                        <CardHeader>
                            <CardTitle>Create Organization</CardTitle>
                        </CardHeader>
                        <form onSubmit={handleCreateOrg}>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Name *</label>
                                    <Input
                                        required
                                        placeholder="Acme Corporation"
                                        value={newOrg.name}
                                        onChange={(e) => handleNameChange(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Slug *</label>
                                    <Input
                                        required
                                        placeholder="acme-corp"
                                        value={newOrg.slug}
                                        onChange={(e) => { setNewOrg(prev => ({ ...prev, slug: e.target.value })); setSlugManuallyEdited(true); }}
                                    />
                                </div>
                                {createError && <p className="text-sm text-destructive">{createError}</p>}
                            </CardContent>
                            <div className="flex justify-end gap-3 p-6 pt-0">
                                <Button type="button" variant="ghost" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                                <Button type="submit" disabled={creating}>{creating ? 'Creating...' : 'Create'}</Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

            <AdminOrgViewModal
                isOpen={!!selectedDetailOrg}
                onClose={() => setSelectedDetailOrg(null)}
                organization={selectedDetailOrg}
            />

            <AdminUserModal
                isOpen={!!inviteOrgTarget}
                onClose={() => setInviteOrgTarget(null)}
                onSave={createUser}
                organizations={organizations?.data || []}
            />
        </div>
    );
}
