import { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/Dialog';
import { galleryTemplates, categoryLabels, GalleryTemplate } from './galleryData';
import { Mail, Newspaper, Rocket, Users, FileDown, Calendar, Briefcase, Copy, Check, Code, X } from 'lucide-react';

const categoryIcons: Record<string, React.ReactNode> = {
    'marketing': <Newspaper className="h-5 w-5" />,
    'lead-gen': <Users className="h-5 w-5" />,
    'application': <Briefcase className="h-5 w-5" />,
    'general': <Mail className="h-5 w-5" />,
};

const templateIcons: Record<string, React.ReactNode> = {
    'contact-form': <Mail className="h-6 w-6 text-blue-500" />,
    'newsletter-signup': <Newspaper className="h-6 w-6 text-emerald-500" />,
    'waitlist-signup': <Rocket className="h-6 w-6 text-violet-500" />,
    'demo-request': <Users className="h-6 w-6 text-orange-500" />,
    'resource-download': <FileDown className="h-6 w-6 text-teal-500" />,
    'webinar-registration': <Calendar className="h-6 w-6 text-purple-500" />,
    'job-application': <Briefcase className="h-6 w-6 text-indigo-500" />,
};

export function GalleryPage() {
    const [selectedTemplate, setSelectedTemplate] = useState<GalleryTemplate | null>(null);
    const [copied, setCopied] = useState(false);
    const [filter, setFilter] = useState<string | null>(null);

    const filteredTemplates = filter
        ? galleryTemplates.filter(t => t.category === filter)
        : galleryTemplates;

    const handleCopy = async (code: string) => {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const categories = Object.keys(categoryLabels);

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Form Templates Gallery</h1>
                <p className="text-muted-foreground">
                    Ready-to-use HTML form templates for your static website. Copy, paste, and customize.
                </p>
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-2">
                <Button
                    variant={filter === null ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter(null)}
                >
                    All
                </Button>
                {categories.map(cat => (
                    <Button
                        key={cat}
                        variant={filter === cat ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilter(cat)}
                        className="gap-2"
                    >
                        {categoryIcons[cat]}
                        {categoryLabels[cat]}
                    </Button>
                ))}
            </div>

            {/* Template Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredTemplates.map(template => (
                    <Card key={template.id} className="p-6 flex flex-col hover:shadow-lg transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-3 rounded-xl bg-muted/40 border">
                                {templateIcons[template.id] || <Code className="h-6 w-6 text-gray-500" />}
                            </div>
                            <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                                {categoryLabels[template.category]}
                            </Badge>
                        </div>

                        <h3 className="font-semibold text-lg mb-2">{template.name}</h3>
                        <p className="text-sm text-muted-foreground mb-4 flex-1">{template.description}</p>

                        <div className="flex flex-wrap gap-1.5 mb-4">
                            {template.features.slice(0, 3).map(feature => (
                                <span
                                    key={feature}
                                    className="text-[10px] bg-muted px-2 py-1 rounded-full text-muted-foreground"
                                >
                                    {feature}
                                </span>
                            ))}
                            {template.features.length > 3 && (
                                <span className="text-[10px] text-muted-foreground">
                                    +{template.features.length - 3} more
                                </span>
                            )}
                        </div>

                        <div className="flex gap-2 pt-4 border-t">
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={() => setSelectedTemplate(template)}
                            >
                                <Code className="mr-2 h-4 w-4" />
                                View Code
                            </Button>
                            <Button
                                variant="default"
                                size="sm"
                                className="flex-1"
                                onClick={() => handleCopy(template.embedCode)}
                            >
                                <Copy className="mr-2 h-4 w-4" />
                                Copy
                            </Button>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Code Modal */}
            <Dialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3">
                            {selectedTemplate && templateIcons[selectedTemplate.id]}
                            {selectedTemplate?.name}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 overflow-hidden flex flex-col">
                        <p className="text-sm text-muted-foreground mb-4">
                            {selectedTemplate?.description}
                        </p>

                        {selectedTemplate?.features && (
                            <div className="flex flex-wrap gap-2 mb-4">
                                {selectedTemplate.features.map(feature => (
                                    <Badge key={feature} variant="secondary">{feature}</Badge>
                                ))}
                            </div>
                        )}

                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Embed Code</span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => selectedTemplate && handleCopy(selectedTemplate.embedCode)}
                            >
                                {copied ? (
                                    <>
                                        <Check className="mr-2 h-4 w-4 text-green-500" />
                                        Copied!
                                    </>
                                ) : (
                                    <>
                                        <Copy className="mr-2 h-4 w-4" />
                                        Copy Code
                                    </>
                                )}
                            </Button>
                        </div>

                        <div className="flex-1 overflow-auto bg-zinc-900 rounded-lg p-4">
                            <pre className="text-xs text-zinc-300 whitespace-pre-wrap break-all font-mono leading-relaxed">
                                {selectedTemplate?.embedCode}
                            </pre>
                        </div>

                        <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                            <p className="text-sm text-amber-800 dark:text-amber-200">
                                <strong>Note:</strong> Replace <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">YOUR_FORM_SUBMIT_HASH</code> with your actual form's submit hash from the Forms page.
                            </p>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
