import { useEffect, useState, useCallback } from 'react';
import { useAdmin } from '../../hooks/useAdmin';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../components/ui/Table';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Loader2, Eye, Filter, Calendar, ChevronLeft, ChevronRight, Globe } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';

export function AdminSubmissionsPage() {
    const { organizations, loading: adminLoading, loadOrganizations, loadGlobalSubmissions } = useAdmin();
    const [submissionsData, setSubmissionsData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedSubmission, setSelectedSubmission] = useState<any>(null);

    const fetchData = useCallback(async (page: number, orgId: number | null) => {
        setLoading(true);
        try {
            const data = await loadGlobalSubmissions(page, orgId);
            setSubmissionsData(data);
        } catch (err) {
            console.error('Failed to fetch admin submissions:', err);
        } finally {
            setLoading(false);
        }
    }, [loadGlobalSubmissions]);

    useEffect(() => {
        loadOrganizations();
    }, [loadOrganizations]);

    useEffect(() => {
        fetchData(currentPage, selectedOrgId);
    }, [fetchData, currentPage, selectedOrgId]);

    const handleOrgChange = (orgId: number | null) => {
        setSelectedOrgId(orgId);
        setCurrentPage(1);
    };

    if (loading && !submissionsData) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const submissions = submissionsData?.data || [];
    const pagination = submissionsData?.pagination;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight">System Submissions</h1>
                    <p className="text-sm text-muted-foreground">View all submissions across all organizations.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-lg border">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <select
                            className="bg-transparent border-none text-sm focus:ring-0 cursor-pointer min-w-[150px]"
                            value={selectedOrgId || ''}
                            onChange={(e) => handleOrgChange(e.target.value ? Number(e.target.value) : null)}
                        >
                            <option value="">All Organizations</option>
                            {organizations?.data.map(org => (
                                <option key={org.id} value={org.id}>{org.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <Card className="overflow-hidden border-primary/5 shadow-xl">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow>
                                <TableHead className="w-[80px]">ID</TableHead>
                                <TableHead>Organization</TableHead>
                                <TableHead>Form</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {submissions.map((sub: any) => (
                                <TableRow key={sub.id} className="group hover:bg-muted/20">
                                    <TableCell className="font-mono text-[10px] text-muted-foreground">#{sub.id}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Globe className="h-3 w-3 text-primary/60" />
                                            <span className="text-sm font-medium">{sub.form?.organization?.name || 'N/A'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-sm">{sub.form?.name || 'Unknown'}</span>
                                            {sub.originDomain && <span className="text-[10px] text-muted-foreground">{sub.originDomain}</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        <div className="flex items-center gap-1.5">
                                            <Calendar className="h-3.5 w-3.5" />
                                            {new Date(sub.createdAt).toLocaleString()}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" className="h-8 group-hover:bg-primary/10 group-hover:text-primary transition-all" onClick={() => setSelectedSubmission(sub)}>
                                            <Eye className="h-4 w-4 mr-2" />
                                            Inspect
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {submissions.length === 0 && !loading && (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                        No submissions found for the selected criteria.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>

                    {pagination && pagination.totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 border-t p-4 bg-muted/5">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(prev => prev - 1)}
                            >
                                <ChevronLeft className="h-4 w-4 mr-1" />
                                Previous
                            </Button>
                            <span className="text-sm font-medium px-4">
                                Page {currentPage} of {pagination.totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={currentPage === pagination.totalPages}
                                onClick={() => setCurrentPage(prev => prev + 1)}
                            >
                                Next
                                <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Admin Submission Detail Modal */}
            {selectedSubmission && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-300" onClick={() => setSelectedSubmission(null)}>
                    <Card className="w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
                            <div className="space-y-1">
                                <CardTitle className="text-xl">Submission Details</CardTitle>
                                <p className="text-xs text-muted-foreground font-mono">ID: {selectedSubmission.id}</p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setSelectedSubmission(null)} className="rounded-full">
                                <X className="h-5 w-5" />
                            </Button>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-6 bg-muted/30 p-4 rounded-xl border">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Organization</p>
                                    <p className="text-sm font-semibold">{selectedSubmission.form?.organization?.name || 'N/A'}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Form</p>
                                    <p className="text-sm font-semibold">{selectedSubmission.form?.name || 'Unknown'}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Source IP</p>
                                    <p className="text-sm font-mono">{selectedSubmission.ipAddress || 'Not recorded'}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Received At</p>
                                    <p className="text-sm">{new Date(selectedSubmission.createdAt).toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <p className="text-[10px] font-bold uppercase text-muted-foreground px-1">Raw Payload</p>
                                <div className="bg-zinc-950 text-zinc-50 p-4 rounded-xl overflow-auto max-h-[300px] font-mono text-xs shadow-inner">
                                    <pre>{JSON.stringify(selectedSubmission.data, null, 2)}</pre>
                                </div>
                            </div>
                        </CardContent>
                        <div className="flex justify-end p-6 border-t">
                            <Button onClick={() => setSelectedSubmission(null)}>Close</Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}

function X({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
        </svg>
    );
}
