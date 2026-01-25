
import { useEffect, useState } from 'react';
import { useQueue, Job } from '../../hooks/useQueue';
import { AlertCircle, CheckCircle, Clock, RefreshCw, XCircle, Database } from 'lucide-react';

export function QueuePage() {
    const { fetchStats, fetchJobs, retryJob, loading, error } = useQueue();
    const [stats, setStats] = useState<Record<string, any> | null>(null);
    const [jobs, setJobs] = useState<Job[]>([]);
    const [selectedQueue, setSelectedQueue] = useState<string>('');
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);

    // Initial load
    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 10000); // Auto-refresh every 10s
        return () => clearInterval(interval);
    }, []);

    // Fetch jobs when queue filter changes
    useEffect(() => {
        loadJobs();
    }, [selectedQueue]);

    const loadData = async () => {
        const statsData = await fetchStats();
        if (statsData) {
            setStats(statsData);
        }
    };

    const loadJobs = async () => {
        const jobsData = await fetchJobs(selectedQueue || undefined, undefined, 1, 50);
        if (jobsData) {
            setJobs(jobsData.jobs);
        }
    };

    const handleRetry = async (jobId: string) => {
        if (confirm('Are you sure you want to retry this job?')) {
            const success = await retryJob(jobId);
            if (success) {
                alert('Job retry scheduled');
                loadJobs();
            } else {
                alert('Failed to retry job');
            }
        }
    };

    const getStateIcon = (state: string) => {
        switch (state) {
            case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
            case 'retry': return <RefreshCw className="h-4 w-4 text-orange-500" />;
            case 'active': return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
            default: return <Clock className="h-4 w-4 text-gray-500" />;
        }
    };

    const formatDuration = (start?: string, end?: string) => {
        if (!start || !end) return '-';
        const diff = new Date(end).getTime() - new Date(start).getTime();
        return `${diff}ms`;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold tracking-tight">Queue Management</h1>
                <button
                    onClick={() => { loadData(); loadJobs(); }}
                    className="p-2 bg-secondary rounded-md hover:bg-secondary/80"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {error && (
                <div className="bg-red-50 text-red-500 p-4 rounded-md flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                </div>
            )}

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats && Object.entries(stats).map(([queue, data]) => (
                    <div
                        key={queue}
                        onClick={() => setSelectedQueue(queue === selectedQueue ? '' : queue)}
                        className={`p-4 rounded-lg border cursor-pointer transition-colors ${selectedQueue === queue ? 'bg-primary/5 border-primary' : 'bg-card hover:bg-secondary/50'}`}
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <Database className="h-4 w-4 text-muted-foreground" />
                            <h3 className="font-semibold text-sm truncate" title={queue}>{queue}</h3>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-1 rounded">
                                <span className="block font-bold text-blue-600 dark:text-blue-400">{data.active}</span>
                                <span className="text-muted-foreground">Active</span>
                            </div>
                            <div className="bg-green-50 dark:bg-green-900/20 p-1 rounded">
                                <span className="block font-bold text-green-600 dark:text-green-400">{data.completed}</span>
                                <span className="text-muted-foreground">Done</span>
                            </div>
                            <div className="bg-red-50 dark:bg-red-900/20 p-1 rounded">
                                <span className="block font-bold text-red-600 dark:text-red-400">{data.failed}</span>
                                <span className="text-muted-foreground">Failed</span>
                            </div>
                        </div>
                        {data.retry > 0 && (
                            <div className="mt-2 text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1">
                                <RefreshCw className="h-3 w-3" />
                                {data.retry} retrying
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Jobs List */}
            <div className="bg-card rounded-lg border">
                <div className="p-4 border-b flex justify-between items-center bg-muted/30">
                    <h2 className="font-semibold text-sm">
                        {selectedQueue ? `Jobs in ${selectedQueue}` : 'All Jobs'}
                    </h2>
                    <span className="text-xs text-muted-foreground">Showing recent 50 jobs</span>
                </div>
                <div className="divide-y relative min-h-[200px]">
                    {jobs.length === 0 ? (
                        <div className="text-center p-8 text-muted-foreground">
                            No jobs found
                        </div>
                    ) : (
                        jobs.map(job => (
                            <div key={job.id}
                                className="p-4 hover:bg-muted/30 flex items-center justify-between text-sm group"
                                onClick={() => setSelectedJob(selectedJob?.id === job.id ? null : job)}
                            >
                                <div className="flex items-center gap-4">
                                    {getStateIcon(job.state)}
                                    <div>
                                        <div className="font-medium">{job.name}</div>
                                        <div className="text-xs text-muted-foreground font-mono">{job.id}</div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-8 text-xs text-muted-foreground">
                                    <div className="w-24 text-right">
                                        <div className="text-foreground">{job.state}</div>
                                        {job.retrycount > 0 && <span>{job.retrycount} retries</span>}
                                    </div>
                                    <div className="w-32 text-right">
                                        <div>{new Date(job.createdon).toLocaleTimeString()}</div>
                                        <div>{new Date(job.createdon).toLocaleDateString()}</div>
                                    </div>
                                    <div className="w-16 text-right">
                                        {formatDuration(job.startedon, job.completedon)}
                                    </div>
                                </div>

                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                    {['failed', 'completed'].includes(job.state) && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleRetry(job.id); }}
                                            className="px-2 py-1 bg-secondary hover:bg-secondary/80 rounded text-xs"
                                        >
                                            Retry
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {selectedJob && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedJob(null)}>
                    <div className="bg-background w-full max-w-2xl rounded-lg shadow-lg border p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold">Job Details</h2>
                            <button onClick={() => setSelectedJob(null)} className="text-muted-foreground hover:text-foreground">
                                <XCircle className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div><span className="text-muted-foreground">ID:</span> {selectedJob.id}</div>
                                <div><span className="text-muted-foreground">Queue:</span> {selectedJob.name}</div>
                                <div><span className="text-muted-foreground">Created:</span> {selectedJob.createdon}</div>
                                <div><span className="text-muted-foreground">State:</span> {selectedJob.state}</div>
                            </div>

                            <div>
                                <h3 className="font-semibold text-sm mb-2">Data</h3>
                                <pre className="bg-muted p-2 rounded text-xs overflow-auto max-h-40">
                                    {JSON.stringify(selectedJob.data, null, 2)}
                                </pre>
                            </div>

                            {selectedJob.output && (
                                <div>
                                    <h3 className="font-semibold text-sm mb-2">Output/Error</h3>
                                    <pre className="bg-muted p-2 rounded text-xs overflow-auto max-h-40 text-red-600 dark:text-red-400">
                                        {JSON.stringify(selectedJob.output, null, 2)}
                                    </pre>
                                </div>
                            )}

                            <div className="flex justify-end gap-2 mt-4">
                                <button onClick={() => setSelectedJob(null)} className="px-4 py-2 bg-secondary rounded hover:bg-secondary/80">Close</button>
                                {['failed', 'completed'].includes(selectedJob.state) && (
                                    <button
                                        onClick={() => { handleRetry(selectedJob.id); setSelectedJob(null); }}
                                        className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                                    >
                                        Retry Job
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
