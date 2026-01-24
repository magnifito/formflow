import { useState, useEffect } from 'react';
import { useOrganization, Submission } from '../../hooks/useOrganization';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Loader2, Eye, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';

export function SubmissionsPage() {
    const { forms, submissions, pagination, loading, loadSubmissions } = useOrganization();
    const [selectedFormId, setSelectedFormId] = useState<number | null>(null);
    const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

    useEffect(() => {
        loadSubmissions(1, selectedFormId);
    }, [loadSubmissions, selectedFormId]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Submissions</h1>
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <select
                        className="bg-background border border-input rounded-md px-3 py-1 text-sm shadow-sm"
                        value={selectedFormId || ''}
                        onChange={(e) => setSelectedFormId(e.target.value ? Number(e.target.value) : null)}
                    >
                        <option value="">All Forms</option>
                        {forms.map(form => (
                            <option key={form.id} value={form.id}>{form.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex h-64 items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : submissions.length > 0 ? (
                        <div className="relative overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead>ID</TableHead>
                                        <TableHead>Form</TableHead>
                                        <TableHead>Origin</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {submissions.map((sub) => (
                                        <TableRow key={sub.id}>
                                            <TableCell className="font-medium text-muted-foreground">#{sub.id}</TableCell>
                                            <TableCell>{sub.form?.name || 'Unknown'}</TableCell>
                                            <TableCell className="text-muted-foreground">{sub.originDomain || '-'}</TableCell>
                                            <TableCell>{new Date(sub.createdAt).toLocaleString()}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm" onClick={() => setSelectedSubmission(sub)}>
                                                    <Eye className="mr-2 h-4 w-4" />
                                                    View Data
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                            {pagination && pagination.totalPages > 1 && (
                                <div className="flex items-center justify-center gap-2 border-t p-4">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={pagination.page === 1}
                                        onClick={() => loadSubmissions(pagination.page - 1, selectedFormId)}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                        Previous
                                    </Button>
                                    <span className="text-sm font-medium">
                                        Page {pagination.page} of {pagination.totalPages}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={pagination.page === pagination.totalPages}
                                        onClick={() => loadSubmissions(pagination.page + 1, selectedFormId)}
                                    >
                                        Next
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="py-20 text-center text-muted-foreground">
                            No submissions yet.
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Submission Modal */}
            {selectedSubmission && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" onClick={() => setSelectedSubmission(null)}>
                    <div className="relative w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl p-6 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="mb-6">
                            <h2 className="text-xl font-bold">Submission #{selectedSubmission.id}</h2>
                            <div className="grid grid-cols-2 gap-4 mt-4 bg-muted/50 p-4 rounded-lg">
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground uppercase">Form</label>
                                    <p className="text-sm font-medium">{selectedSubmission.form?.name}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground uppercase">Origin</label>
                                    <p className="text-sm font-medium">{selectedSubmission.originDomain || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground uppercase">IP Address</label>
                                    <p className="text-sm font-medium">{selectedSubmission.ipAddress || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground uppercase">Date</label>
                                    <p className="text-sm font-medium">{new Date(selectedSubmission.createdAt).toLocaleString()}</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-muted-foreground uppercase">JSON Data</label>
                            <div className="bg-zinc-950 text-zinc-50 p-4 rounded-lg overflow-auto max-h-[300px] font-mono text-xs">
                                <pre>{JSON.stringify(selectedSubmission.data, null, 2)}</pre>
                            </div>
                        </div>

                        <div className="flex justify-end mt-6">
                            <Button variant="outline" onClick={() => setSelectedSubmission(null)}>
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
