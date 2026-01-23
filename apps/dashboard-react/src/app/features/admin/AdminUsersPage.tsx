import { useEffect, useState } from 'react';
import { useAdmin } from '../../hooks/useAdmin';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Switch } from '../../components/ui/Switch';
import { Loader2, Plus, Shield, Trash2, Search, Power, PowerOff } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { AdminUserModal } from '../../components/AdminUserModal';

export function AdminUsersPage() {
    const {
        users, organizations, loading,
        loadUsers, loadOrganizations, createUser, suspendUser, deleteUser, toggleSuperAdmin
    } = useAdmin();
    const [search, setSearch] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    useEffect(() => {
        loadUsers();
        loadOrganizations();
    }, [loadUsers, loadOrganizations]);

    const filteredUsers = users?.data.filter(u =>
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        (u.name && u.name.toLowerCase().includes(search.toLowerCase()))
    );

    const handleToggleStatus = async (id: number, currentStatus: boolean) => {
        if (confirm(`Are you sure you want to ${currentStatus ? 'suspend' : 'activate'} this user?`)) {
            await suspendUser(id, !currentStatus);
        }
    };

    const handleDelete = async (id: number) => {
        if (confirm('Are you sure you want to PERMANENTLY delete this user? This cannot be undone.')) {
            await deleteUser(id);
        }
    };

    if (loading && !users) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Users</h1>
                <Button onClick={() => setIsCreateModalOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    New User
                </Button>
            </div>

            <div className="flex items-center gap-2 max-w-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search users..."
                        className="pl-9"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Organization</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Super Admin</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredUsers?.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-sm">{user.name || 'No Name'}</span>
                                            <span className="text-xs text-muted-foreground">{user.email}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {user.organization ? (
                                            <Badge variant="outline" className="font-normal">{user.organization.name}</Badge>
                                        ) : (
                                            <span className="text-xs text-muted-foreground italic">None</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {user.isSuperAdmin && <Shield className="h-3.5 w-3.5 text-primary fill-primary/10" />}
                                            <span className="text-xs capitalize">{user.role.replace('_', ' ')}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Switch
                                                checked={user.isSuperAdmin}
                                                onCheckedChange={(checked) => toggleSuperAdmin(user.id, checked)}
                                                disabled={user.email === 'admin@formflow.fyi'} // Protect main admin
                                            />
                                            <span className="text-[10px] uppercase font-bold text-muted-foreground">Admin</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={user.isActive ? 'outline' : 'secondary'} className={user.isActive ? 'border-green-500 text-green-600' : ''}>
                                            {user.isActive ? 'Active' : 'Suspended'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => handleToggleStatus(user.id, user.isActive)}
                                                title={user.isActive ? 'Suspend' : 'Activate'}
                                            >
                                                {user.isActive ? <PowerOff className="h-4 w-4 text-orange-500" /> : <Power className="h-4 w-4 text-green-500" />}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                                onClick={() => handleDelete(user.id)}
                                                title="Delete"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <AdminUserModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSave={createUser}
                organizations={organizations?.data || []}
            />
        </div>
    );
}
