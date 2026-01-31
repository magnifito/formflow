import { useState } from 'react';
import { type ExampleForm, FormGalleryCard } from './FormGalleryCard';
import examplesData from '../../data/examples.json';

interface FormGalleryProps {
  onSelect: (example: ExampleForm) => void;
}

export function FormGallery({ onSelect }: FormGalleryProps) {
  const examples = examplesData as ExampleForm[];
  const [filter, setFilter] = useState('');

  const filteredExamples = examples.filter(
    (ex) =>
      ex.name.toLowerCase().includes(filter.toLowerCase()) ||
      ex.useCase.toLowerCase().includes(filter.toLowerCase()) ||
      ex.tags.some((tag) => tag.toLowerCase().includes(filter.toLowerCase())),
  );

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex items-center gap-4">
        <input
          type="text"
          placeholder="Search templates..."
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 max-w-sm"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <span className="text-sm text-muted-foreground">
          {filteredExamples.length} template
          {filteredExamples.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pb-4 pr-2">
        {filteredExamples.map((example) => (
          <FormGalleryCard
            key={example.id}
            example={example}
            onView={onSelect}
          />
        ))}
        {filteredExamples.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground border rounded-lg border-dashed">
            No templates match your search.
          </div>
        )}
      </div>
    </div>
  );
}
