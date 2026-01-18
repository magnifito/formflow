import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { cn } from './utils';

/**
 * Badge Component - Spartan UI Style
 *
 * Usage:
 * <ui-badge variant="default">Default</ui-badge>
 * <ui-badge variant="success">Success</ui-badge>
 * <ui-badge variant="destructive">Error</ui-badge>
 */
@Component({
  selector: 'ui-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [class]="getBadgeClasses()">
      <ng-content></ng-content>
    </div>
  `,
  styles: []
})
export class BadgeComponent {
  @Input() variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' = 'default';
  @Input() class = '';

  getBadgeClasses(): string {
    const baseClasses = 'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2';

    const variants = {
      default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
      secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
      destructive: 'border-transparent bg-red-600 text-white hover:bg-red-700',
      outline: 'text-foreground',
      success: 'border-transparent bg-green-600 text-white hover:bg-green-700',
      warning: 'border-transparent bg-yellow-600 text-white hover:bg-yellow-700'
    };

    return cn(baseClasses, variants[this.variant], this.class);
  }
}
