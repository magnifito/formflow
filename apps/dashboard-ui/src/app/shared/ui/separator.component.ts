import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { cn } from './utils';

/**
 * Separator Component - Spartan UI Style
 *
 * Usage:
 * <ui-separator></ui-separator>
 * <ui-separator orientation="vertical"></ui-separator>
 */
@Component({
  selector: 'ui-separator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [class]="getSeparatorClasses()"></div>
  `,
  styles: []
})
export class SeparatorComponent {
  @Input() orientation: 'horizontal' | 'vertical' = 'horizontal';
  @Input() class = '';

  getSeparatorClasses(): string {
    const baseClasses = 'shrink-0 bg-border';

    const orientationClasses = {
      horizontal: 'h-[1px] w-full',
      vertical: 'h-full w-[1px]'
    };

    return cn(baseClasses, orientationClasses[this.orientation], this.class);
  }
}
