import { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './ui/Card';
import { X, Loader2, Shield, Settings2, Save, Plus } from 'lucide-react';
import { Form, SecuritySettings } from '../hooks/useOrganization';
import { Switch } from './ui/Switch';

interface FormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
    initialData?: Form | null;
}

export function FormModal({ isOpen, onClose, onSave, initialData }: FormModalProps) {
    const [formData, setFormData] = useState<Partial<Form>>({
        name: '',
        slug: '',
        description: '',
        useOrgSecuritySettings: true,
        rateLimitEnabled: false,
        rateLimitMaxRequests: 10,
        rateLimitWindowSeconds: 60,
        rateLimitMaxRequestsPerHour: 100,
        minTimeBetweenSubmissionsEnabled: false,
        minTimeBetweenSubmissionsSeconds: 30,
        maxRequestSizeBytes: 1000000,
        refererFallbackEnabled: true
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showSecurity, setShowSecurity] = useState(false);

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        } else {
            setFormData({
                name: '',
                slug: '',
                description: '',
                useOrgSecuritySettings: true,
                rateLimitEnabled: false,
                rateLimitMaxRequests: 10,
                rateLimitWindowSeconds: 60,
                rateLimitMaxRequestsPerHour: 100,
                minTimeBetweenSubmissionsEnabled: false,
                minTimeBetweenSubmissionsSeconds: 30,
                maxRequestSizeBytes: 1000000,
                refererFallbackEnabled: true
            });
        }
    }, [initialData, isOpen]);

    // Auto-generate slug from name if not present or checks out
    useEffect(() => {
        if (!initialData && formData.name) {
            const generatedSlug = formData.name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');
            setFormData(prev => ({ ...prev, slug: generatedSlug }));
        }
    }, [formData.name, initialData]);

    if (!isOpen) return null;

    const handleSave = async () => {
        if (!formData.name) {
            setError('Form name is required');
            return;
        }
        setSaving(true);
        setError(null);
        try {
            await onSave(formData);
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border-primary/10">
                <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-card z-10 border-b pb-4">
                    <div className="space-y-1">
                        <CardTitle className="text-2xl font-bold flex items-center gap-2">
                            {initialData ? <Settings2 className="h-6 w-6 text-primary" /> : <Plus className="h-6 w-6 text-primary" />}
                            {initialData ? 'Edit Form' : 'Create New Form'}
                        </CardTitle>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                        <X className="h-5 w-5" />
                    </Button>
                </CardHeader>

                <CardContent className="space-y-6 pt-6">
                    {error && (
                        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-2 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">General Information</label>
                            <div className="grid gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Form Name *</label>
                                    <Input
                                        placeholder="e.g., Contact Us"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                    {/* Slug Display/Edit */}
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                                        <span className="font-semibold text-[10px] uppercase tracking-wider text-primary/70">Slug:</span>
                                        <Input
                                            value={formData.slug || ''}
                                            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                            className="h-6 text-xs border-transparent hover:border-border focus:border-border bg-transparent shadow-none px-2 w-full font-mono text-primary"
                                            placeholder="auto-generated-slug"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Description</label>
                                    <Input
                                        placeholder="Optional description"
                                        value={formData.description || ''}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Security Overrides */}
                        <div className="border-t pt-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                    <Shield className="h-4 w-4" />
                                    Security Settings
                                </label>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-primary h-8"
                                    onClick={() => setShowSecurity(!showSecurity)}
                                >
                                    {showSecurity ? 'Hide Details' : 'Show Details'}
                                </Button>
                            </div>

                            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
                                <div className="space-y-0.5">
                                    <p className="text-sm font-medium">Use Organization Defaults</p>
                                    <p className="text-xs text-muted-foreground">Apply the global settings configured in your organization.</p>
                                </div>
                                <Switch
                                    checked={formData.useOrgSecuritySettings}
                                    onCheckedChange={(checked) => setFormData({ ...formData, useOrgSecuritySettings: checked })}
                                />
                            </div>

                            {showSecurity && !formData.useOrgSecuritySettings && (
                                <div className="space-y-6 mt-4 p-4 rounded-xl bg-orange-50/30 border border-orange-200/50 animate-in slide-in-from-top-2">
                                    {/* Rate Limiting */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-bold flex items-center gap-2">
                                                <div className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                                                Rate Limiting
                                            </h4>
                                            <Switch
                                                checked={formData.rateLimitEnabled}
                                                onCheckedChange={(checked) => setFormData({ ...formData, rateLimitEnabled: checked })}
                                            />
                                        </div>
                                        {formData.rateLimitEnabled && (
                                            <div className="grid grid-cols-3 gap-3">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Burst</label>
                                                    <Input
                                                        type="number"
                                                        value={formData.rateLimitMaxRequests}
                                                        onChange={(e) => setFormData({ ...formData, rateLimitMaxRequests: parseInt(e.target.value) })}
                                                        className="h-8"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Window (s)</label>
                                                    <Input
                                                        type="number"
                                                        value={formData.rateLimitWindowSeconds}
                                                        onChange={(e) => setFormData({ ...formData, rateLimitWindowSeconds: parseInt(e.target.value) })}
                                                        className="h-8"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Hourly</label>
                                                    <Input
                                                        type="number"
                                                        value={formData.rateLimitMaxRequestsPerHour}
                                                        onChange={(e) => setFormData({ ...formData, rateLimitMaxRequestsPerHour: parseInt(e.target.value) })}
                                                        className="h-8"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Time Throttling */}
                                    <div className="space-y-4 border-t pt-4">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-bold flex items-center gap-2">
                                                <div className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                                                Submission Throttling
                                            </h4>
                                            <Switch
                                                checked={formData.minTimeBetweenSubmissionsEnabled}
                                                onCheckedChange={(checked) => setFormData({ ...formData, minTimeBetweenSubmissionsEnabled: checked })}
                                            />
                                        </div>
                                        {formData.minTimeBetweenSubmissionsEnabled && (
                                            <div className="flex items-center gap-4">
                                                <div className="flex-1 space-y-1">
                                                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Min Interval (seconds)</label>
                                                    <Input
                                                        type="number"
                                                        value={formData.minTimeBetweenSubmissionsSeconds}
                                                        onChange={(e) => setFormData({ ...formData, minTimeBetweenSubmissionsSeconds: parseInt(e.target.value) })}
                                                        className="h-8"
                                                    />
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-4">Minimum time required between two submissions from the same source.</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Size Limit */}
                                    <div className="space-y-4 border-t pt-4">
                                        <h4 className="text-sm font-bold flex items-center gap-2">
                                            <div className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                                            Request Size Limit
                                        </h4>
                                        <div className="flex items-center gap-4">
                                            <div className="flex-1 space-y-1">
                                                <label className="text-[10px] font-bold uppercase text-muted-foreground">Max Bytes</label>
                                                <Input
                                                    type="number"
                                                    value={formData.maxRequestSizeBytes}
                                                    onChange={(e) => setFormData({ ...formData, maxRequestSizeBytes: parseInt(e.target.value) })}
                                                    className="h-8"
                                                />
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-4">1MB = 1,000,000 bytes</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>

                <CardFooter className="sticky bottom-0 bg-card border-t z-10 p-6 flex justify-end gap-3 text-sm">
                    <Button variant="ghost" onClick={onClose} disabled={saving} className="font-medium text-muted-foreground hover:text-foreground">
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving} className="min-w-[120px] shadow-lg shadow-primary/20">
                        {saving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                {initialData ? 'Save Changes' : 'Create Form'}
                            </>
                        )}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
