import { useState } from 'react';
import { useOrganization, Form } from '../../hooks/useOrganization';
import { StatCard } from '../../components/ui/StatCard';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../components/ui/Table';
import { Switch } from '../../components/ui/Switch';
import { Copy, Plus, Loader2, FileText, Settings2 } from 'lucide-react';
import { ApiKeyWidget } from '../../components/ApiKeyWidget';
import { useAuth } from '../../hooks/useAuth';
import { FormModal } from '../../components/FormModal';

export function DashboardPage() {
    const { forms, stats, loading, toggleFormStatus, deleteForm, createForm, updateForm, getForm } = useOrganization();
    const { user, regenerateApiKey } = useAuth();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingForm, setEditingForm] = useState<Form | null>(null);

    const handleEditForm = async (form: Form) => {
        try {
            const fullForm = await getForm(form.id);
            setEditingForm(fullForm);
        } catch (err) {
            setEditingForm(form); // Fallback
        }
    };

    const handleSaveForm = async (data: any) => {
        if (editingForm) {
            await updateForm(editingForm.id, data);
        } else {
            await createForm(data);
        }
    };

    const getSubmitUrl = (form: Form) => `${import.meta.env.VITE_COLLECTOR_URL || "http://localhost:3000"}/s/${form.submitHash}`;

    const copyUrl = (hash: string) => {
        navigator.clipboard.writeText(`${import.meta.env.VITE_COLLECTOR_URL || "http://localhost:3000"}/s/${hash}`);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <StatCard
                    title="My Forms"
                    value={forms.length}
                    icon="&#128196;"
                />
                <StatCard
                    title="Total Submissions (Month)"
                    value={stats?.submissionsThisMonth || 0}
                    suffix={stats?.submissionLimit ? `/ ${stats.submissionLimit} Limit` : ''}
                    icon="&#128203;"
                    showProgress={!!stats?.submissionLimit}
                    progressPercent={stats?.submissionLimit ? (stats.submissionsThisMonth / stats.submissionLimit * 100) : 0}
                />
                <ApiKeyWidget apiKey={user?.apiKey} onRegenerate={regenerateApiKey} />
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
                    <div className="space-y-1">
                        <CardTitle className="text-2xl font-semibold">Recent Forms</CardTitle>
                        <CardDescription>Manage your active forms and integrations.</CardDescription>
                    </div>
                    <Button onClick={() => setShowCreateModal(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create New Form
                    </Button>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex h-32 items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : forms.length > 0 ? (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead>Form Name</TableHead>
                                        <TableHead>Endpoint URL</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {forms.map((form) => (
                                        <TableRow key={form.id} className="group transition-colors hover:bg-muted/50">
                                            <TableCell className="font-medium">{form.name}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                                                        {getSubmitUrl(form)}
                                                    </code>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyUrl(form.submitHash)}>
                                                        <Copy className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <span className="relative flex h-2 w-2">
                                                        {form.isActive && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>}
                                                        <span className={`relative inline-flex h-2 w-2 rounded-full ${form.isActive ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                                                    </span>
                                                    <Switch
                                                        checked={form.isActive}
                                                        onCheckedChange={(checked) => toggleFormStatus(form.id, checked)}
                                                    />
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button variant="ghost" size="sm" onClick={() => handleEditForm(form)}>
                                                        <Settings2 className="h-4 w-4 mr-1" />
                                                        Edit
                                                    </Button>
                                                    <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => {
                                                        if (confirm('Delete form?')) deleteForm(form.id)
                                                    }}>Delete</Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="rounded-full bg-muted p-4 mb-4">
                                <FileText className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-medium">No forms created yet</h3>
                            <p className="text-sm text-muted-foreground mt-1 mb-4">Create your first form to start collecting submissions.</p>
                            <Button variant="outline" onClick={() => setShowCreateModal(true)}>Create Form</Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            <FormModal
                isOpen={showCreateModal || !!editingForm}
                onClose={() => { setShowCreateModal(false); setEditingForm(null); }}
                onSave={handleSaveForm}
                initialData={editingForm}
            />
        </div>
    );
}
