import { useState, useEffect } from 'react';
import { useOrganization, Submission } from '../../hooks/useOrganization';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Loader2, Eye, ChevronLeft, ChevronRight, Filter, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { useQueue, Job } from '../../hooks/useQueue';

export function SubmissionsPage() {
    const { forms, submissions, pagination, loading, loadSubmissions } = useOrganization();
    const { fetchSubmissionJobs, retryJob } = useQueue();
    const [selectedFormId, setSelectedFormId] = useState<number | null>(null);
    const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
    const [integrationJobs, setIntegrationJobs] = useState<Job[]>([]);
    const [jobsLoading, setJobsLoading] = useState(false);

    useEffect(() => {
        loadSubmissions(1, selectedFormId);
    }, [loadSubmissions, selectedFormId]);

    useEffect(() => {
        if (selectedSubmission) {
            loadIntegrationJobs(selectedSubmission.id);
        } else {
            setIntegrationJobs([]);
        }
    }, [selectedSubmission]);

    const loadIntegrationJobs = async (id: number) => {
        setJobsLoading(true);
        const jobs = await fetchSubmissionJobs(id);
        if (jobs) {
            setIntegrationJobs(jobs);
        }
        setJobsLoading(false);
    };

    const handleRetryJob = async (jobId: string) => {
        if (confirm('Retry this integration?')) {
            const success = await retryJob(jobId);
            if (success && selectedSubmission) {
                setTimeout(() => loadIntegrationJobs(selectedSubmission.id), 1000);
            }
        }
    };

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

                        <div className="space-y-4">
                            <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-2">
                                <RefreshCw className={`h-3 w-3 ${jobsLoading ? 'animate-spin' : ''}`} />
                                Integration Status
                            </label>
                            <div className="space-y-2">
                                {jobsLoading ? (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground italic">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Fetching status...
                                    </div>
                                ) : integrationJobs.length > 0 ? (
                                    integrationJobs.map(job => (
                                        <div key={job.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border text-sm">
                                            <div className="flex items-center gap-3">
                                                {job.state === 'completed' && <CheckCircle className="h-4 w-4 text-green-500" />}
                                                {job.state === 'failed' && <XCircle className="h-4 w-4 text-red-500" />}
                                                {['active', 'retry'].includes(job.state) && <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />}
                                                {job.state === 'created' && <Clock className="h-4 w-4 text-gray-500" />}
                                                <span className="font-medium capitalize">{job.name.replace('integration-', '')}</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <Badge variant={job.state === 'completed' ? 'secondary' : job.state === 'failed' ? 'destructive' : 'default'}>
                                                    {job.state}
                                                </Badge>
                                                {job.state === 'failed' && (
                                                    <Button variant="outline" size="sm" className="h-7 text-[10px] px-2" onClick={() => handleRetryJob(job.id)}>
                                                        Retry
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-sm text-muted-foreground italic p-3 rounded-lg bg-muted/10 border border-dashed">
                                        No active integrations found for this submission.
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-muted-foreground uppercase text-zinc-500">JSON Data</label>
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
