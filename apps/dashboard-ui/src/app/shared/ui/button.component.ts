import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { cn } from './utils';

/**
 * Button Component - Spartan UI Style
 *
 * Usage:
 * <ui-button variant="default" size="default">Click me</ui-button>
 * <ui-button variant="outline" size="sm">Small outline</ui-button>
 */
@Component({
  selector: 'ui-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      [class]="getButtonClasses()"
      [disabled]="disabled"
      [type]="type">
      <ng-content></ng-content>
    </button>
  `,
  styles: []
})
export class ButtonComponent {
  @Input() variant: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' = 'default';
  @Input() size: 'default' | 'sm' | 'lg' | 'icon' = 'default';
  @Input() disabled = false;
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() class = '';

  getButtonClasses(): string {
    const baseClasses = 'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';

    const variants = {
      default: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow',
      destructive: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
      outline: 'border-2 border-input bg-transparent hover:bg-accent hover:text-accent-foreground',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm',
      ghost: 'hover:bg-accent hover:text-accent-foreground',
      link: 'text-primary underline-offset-4 hover:underline'
    };

    const sizes = {
      default: 'h-10 px-4 py-2',
      sm: 'h-9 rounded-md px-3 text-xs',
      lg: 'h-11 rounded-md px-8',
      icon: 'h-10 w-10'
    };

    return cn(
      baseClasses,
      variants[this.variant],
      sizes[this.size],
      this.class
    );
  }
}
