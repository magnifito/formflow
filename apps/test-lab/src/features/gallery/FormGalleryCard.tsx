import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Eye } from 'lucide-react';

export interface ExampleForm {
  id: string;
  name: string;
  description: string;
  filename: string;
  useCase: string;
  tags: string[];
  formSubmitHash: string;
  resourceDownloadUrl?: string;
}

interface FormGalleryCardProps {
  example: ExampleForm;
  onView: (example: ExampleForm) => void;
}

export function FormGalleryCard({ example, onView }: FormGalleryCardProps) {
  return (
    <Card className="flex flex-col h-full overflow-hidden hover:shadow-md transition-shadow bg-card">
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-3">
          <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
            {example.useCase}
          </div>
        </div>
        <h3 className="font-semibold text-lg mb-2 leading-tight">
          {example.name}
        </h3>
        <p className="text-sm text-muted-foreground flex-1 mb-4 leading-relaxed">
          {example.description}
        </p>
        <div className="flex flex-wrap gap-1.5 mt-auto">
          {example.tags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] bg-muted px-2 py-1 rounded text-muted-foreground font-medium"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
      <div className="p-4 bg-muted/20 border-t flex gap-2">
        <Button
          className="w-full flex items-center justify-center gap-2"
          variant="default"
          size="sm"
          onClick={() => onView(example)}
        >
          <Eye className="w-4 h-4" />
          Preview Template
        </Button>
      </div>
    </Card>
  );
}
