import { useEffect, useState, useCallback } from 'react';
import { useAdmin, PaginatedResponse } from '../../hooks/useAdmin';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../components/ui/Table';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Loader2, Building2, Calendar, Plus, X } from 'lucide-react';

export function AdminFormsPage() {
    const { loadAllForms, createSystemForm, loading, loadOrganizations, organizations } = useAdmin();
    const [formsData, setFormsData] = useState<PaginatedResponse<any> | null>(null);
    const [page, setPage] = useState(1);

    // Create Form Modal State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState('');
    const [newForm, setNewForm] = useState({
        name: '',
        slug: '',
        description: '',
        organizationId: '' // Store as string for select value
    });

    const fetchForms = useCallback(async () => {
        try {
            const data = await loadAllForms(page);
            setFormsData(data);
        } catch (err) {
            console.error('Failed to load forms:', err);
        }
    }, [loadAllForms, page]);

    useEffect(() => {
        fetchForms();
        // Load organizations for the dropdown
        loadOrganizations(1);
    }, [fetchForms, loadOrganizations]);

    const handleCreateForm = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newForm.name) {
            setCreateError('Form name is required');
            return;
        }

        if (!newForm.organizationId) {
            setCreateError('Organization is required');
            return;
        }

        setCreating(true);
        setCreateError('');
        try {
            await createSystemForm({
                name: newForm.name,
                slug: newForm.slug,
                description: newForm.description,
                organizationId: newForm.organizationId === 'null' || !newForm.organizationId
                    ? null
                    : parseInt(newForm.organizationId)
            });
            setShowCreateModal(false);
            setNewForm({ name: '', slug: '', description: '', organizationId: '' });
            fetchForms();
        } catch (err: any) {
            setCreateError(err.message);
        } finally {
            setCreating(false);
        }
    };

    if (loading && !formsData) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">System Forms</h1>
                    <p className="text-sm text-muted-foreground">Manage all forms across the platform</p>
                </div>
                <Button onClick={() => setShowCreateModal(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Form
                </Button>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-lg font-semibold">All Active Forms</CardTitle>
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Total: {formsData?.pagination.total || 0}
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead>Form Name</TableHead>
                                <TableHead>Organization</TableHead>
                                <TableHead>Submit Hash</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Created</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {formsData?.data.map((form: any) => (
                                <TableRow key={form.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex flex-col">
                                            <span>{form.name}</span>
                                            {form.description && (
                                                <span className="text-xs text-muted-foreground line-clamp-1 italic">{form.description}</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                                            <span className="font-medium">{form.organization?.name || 'System / None'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <code className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-tight">
                                            {form.submitHash.split('-')[0]}...
                                        </code>
                                    </TableCell>
                                    <TableCell>
                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${form.isActive
                                            ? 'bg-green-100 text-green-700 border border-green-200'
                                            : 'bg-muted text-muted-foreground border border-border'
                                            }`}>
                                            {form.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground whitespace-nowrap text-xs">
                                        <div className="flex items-center gap-1.5">
                                            <Calendar className="h-3.5 w-3.5" />
                                            {new Date(form.createdAt).toLocaleDateString()}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    {formsData?.data.length === 0 && (
                        <div className="flex flex-col items-center justify-center p-12 text-center">
                            <div className="bg-muted/50 p-4 rounded-full mb-4">
                                <Plus className="h-8 w-8 text-muted-foreground opacity-20" />
                            </div>
                            <h3 className="text-lg font-medium text-foreground">No forms found</h3>
                            <p className="text-sm text-muted-foreground max-w-xs mt-1">
                                No forms have been created in the system yet. Click the button above to create one.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Pagination Controls */}
            {formsData && formsData.pagination.totalPages > 1 && (
                <div className="flex items-center justify-end space-x-2 py-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                    >
                        Previous
                    </Button>
                    <div className="text-sm font-medium px-4">
                        Page {page} of {formsData.pagination.totalPages}
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.min(formsData.pagination.totalPages, p + 1))}
                        disabled={page === formsData.pagination.totalPages}
                    >
                        Next
                    </Button>
                </div>
            )}

            {/* Create Form Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowCreateModal(false)}>
                    <Card className="w-full max-w-md shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
                            <CardTitle>Create Form</CardTitle>
                            <Button variant="ghost" size="icon" onClick={() => setShowCreateModal(false)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </CardHeader>
                        <form onSubmit={handleCreateForm}>
                            <CardContent className="space-y-4 pt-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Form Name *</label>
                                    <Input
                                        required
                                        placeholder="Contact Us"
                                        value={newForm.name}
                                        onChange={(e) => {
                                            const name = e.target.value;
                                            setNewForm(prev => ({
                                                ...prev,
                                                name,
                                                // Auto-generate slug if it hasn't been manually edited
                                                slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
                                            }));
                                        }}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Slug</label>
                                    <Input
                                        placeholder="contact-us"
                                        value={newForm.slug}
                                        onChange={(e) => setNewForm(prev => ({ ...prev, slug: e.target.value }))}
                                    />
                                    <p className="text-[10px] text-muted-foreground italic">
                                        Unique identifier for the form URL.
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Description</label>
                                    <Input
                                        placeholder="General inquiry form"
                                        value={newForm.description}
                                        onChange={(e) => setNewForm(prev => ({ ...prev, description: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Link to Organization *</label>
                                    <select
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                        value={newForm.organizationId}
                                        required
                                        onChange={(e) => setNewForm(prev => ({ ...prev, organizationId: e.target.value }))}
                                    >
                                        <option value="" disabled>-- Select Organization --</option>
                                        {organizations?.data.map((org: any) => (
                                            <option key={org.id} value={org.id}>{org.name}</option>
                                        ))}
                                    </select>
                                    <p className="text-[10px] text-muted-foreground italic">
                                        Super admins must link forms to an organization.
                                    </p>
                                </div>
                                {createError && <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">{createError}</p>}
                            </CardContent>
                            <div className="flex justify-end gap-3 p-6 pt-2 border-t mt-4">
                                <Button type="button" variant="ghost" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                                <Button type="submit" disabled={creating} className="bg-primary hover:bg-primary/90">
                                    {creating ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Creating...
                                        </>
                                    ) : 'Create Form'}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
}
