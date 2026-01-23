import { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './ui/Card';
import { X, Loader2, Users, FileText, Globe, Activity } from 'lucide-react';
import { Organization, User } from '../hooks/useAdmin';
import { Badge } from './ui/Badge';

interface AdminOrgViewModalProps {
    isOpen: boolean;
    onClose: () => void;
    organization: Organization | null;
}

export function AdminOrgViewModal({ isOpen, onClose, organization }: AdminOrgViewModalProps) {
    const [orgDetails, setOrgDetails] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && organization) {
            // Re-fetch with details
            loadDetails();
        }
    }, [isOpen, organization]);

    const loadDetails = async () => {
        setLoading(true);
        try {
            // Reusing the endpoint that returns relations
            const response = await fetch(`/api/admin/organizations/${organization?.id}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('FB_jwt_token')}` }
            });
            const data = await response.json();
            setOrgDetails(data);
        } catch (err) {
            console.error('Failed to load org details:', err);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !organization) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
            <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl border-primary/10">
                <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
                    <div className="space-y-1">
                        <CardTitle className="text-2xl font-bold flex items-center gap-2">
                            <Globe className="h-6 w-6 text-primary" />
                            {organization.name}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">{organization.slug}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                        <X className="h-5 w-5" />
                    </Button>
                </CardHeader>

                <CardContent className="space-y-8 pt-6">
                    {loading ? (
                        <div className="flex h-64 items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : orgDetails ? (
                        <>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-4 rounded-xl bg-muted/30 border border-border/50 text-center space-y-1">
                                    <Users className="h-4 w-4 mx-auto text-primary" />
                                    <p className="text-2xl font-bold">{orgDetails.stats?.userCount || 0}</p>
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Users</p>
                                </div>
                                <div className="p-4 rounded-xl bg-muted/30 border border-border/50 text-center space-y-1">
                                    <FileText className="h-4 w-4 mx-auto text-primary" />
                                    <p className="text-2xl font-bold">{orgDetails.stats?.formCount || 0}</p>
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Forms</p>
                                </div>
                                <div className="p-4 rounded-xl bg-muted/30 border border-border/50 text-center space-y-1">
                                    <Activity className="h-4 w-4 mx-auto text-primary" />
                                    <p className="text-2xl font-bold">{orgDetails.stats?.submissionCount || 0}</p>
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Entries</p>
                                </div>
                                <div className="p-4 rounded-xl bg-muted/30 border border-border/50 text-center space-y-1">
                                    <Badge variant={organization.isActive ? 'outline' : 'secondary'} className={organization.isActive ? 'border-green-500 text-green-600' : ''}>
                                        {organization.isActive ? 'Active' : 'Inactive'}
                                    </Badge>
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground mt-2">Status</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground px-1">Members</h3>
                                <div className="space-y-2">
                                    {orgDetails.users?.map((user: any) => (
                                        <div key={user.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium">{user.name || 'Anonymous'}</span>
                                                <span className="text-xs text-muted-foreground">{user.email}</span>
                                            </div>
                                            <Badge variant="secondary" className="text-[10px] capitalize">
                                                {user.role.replace('_', ' ')}
                                            </Badge>
                                        </div>
                                    ))}
                                    {(!orgDetails.users || orgDetails.users.length === 0) && (
                                        <p className="text-sm text-center py-8 text-muted-foreground italic">No members yet.</p>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-12 text-muted-foreground">
                            Failed to load additional details.
                        </div>
                    )}
                </CardContent>
                <CardFooter className="border-t p-6 flex justify-end">
                    <Button variant="ghost" onClick={onClose}>Close</Button>
                </CardFooter>
            </Card>
        </div>
    );
}
