import { useState } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './ui/Card';
import { X, Loader2, UserPlus } from 'lucide-react';

interface AdminUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
    organizations: any[];
}

export function AdminUserModal({ isOpen, onClose, onSave, organizations }: AdminUserModalProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [organizationId, setOrganizationId] = useState('');
    const [role, setRole] = useState<'member' | 'org_admin'>('member');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSave = async () => {
        if (!email || !password || !organizationId) {
            setError('Email, password and organization are required');
            return;
        }
        setSaving(true);
        setError(null);
        try {
            await onSave({ email, password, name, organizationId: parseInt(organizationId), role });
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
            <Card className="w-full max-w-lg shadow-2xl border-primary/10">
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                    <div className="space-y-1">
                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                            <UserPlus className="h-5 w-5 text-primary" />
                            Create New User
                        </CardTitle>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                        <X className="h-4 w-4" />
                    </Button>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                    {error && (
                        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-3 py-2 rounded text-xs">
                            {error}
                        </div>
                    )}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Email Address</label>
                        <Input
                            placeholder="user@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Full Name</label>
                        <Input
                            placeholder="John Doe"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Password</label>
                        <Input
                            type="password"
                            placeholder="Min 8 characters"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Organization</label>
                            <select
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                value={organizationId}
                                onChange={(e) => setOrganizationId(e.target.value)}
                            >
                                <option value="">Select Org</option>
                                {organizations.map(org => (
                                    <option key={org.id} value={org.id}>{org.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Role</label>
                            <select
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                value={role}
                                onChange={(e) => setRole(e.target.value as any)}
                            >
                                <option value="member">Member</option>
                                <option value="org_admin">Org Admin</option>
                            </select>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2 pt-4">
                    <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
                    <Button onClick={handleSave} disabled={saving} className="min-w-[100px]">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create User'}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
