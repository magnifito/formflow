import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { cn } from './utils';

/**
 * Card Component - Spartan UI Style
 *
 * Usage:
 * <ui-card>
 *   <ui-card-header>
 *     <ui-card-title>Card Title</ui-card-title>
 *     <ui-card-description>Card description</ui-card-description>
 *   </ui-card-header>
 *   <ui-card-content>
 *     Content goes here
 *   </ui-card-content>
 *   <ui-card-footer>
 *     Footer content
 *   </ui-card-footer>
 * </ui-card>
 */
@Component({
  selector: 'ui-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [class]="getCardClasses()">
      <ng-content></ng-content>
    </div>
  `,
  styles: []
})
export class CardComponent {
  @Input() class = '';

  getCardClasses(): string {
    return cn(
      'rounded-lg border bg-card text-card-foreground shadow-sm',
      this.class
    );
  }
}

@Component({
  selector: 'ui-card-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [class]="getHeaderClasses()">
      <ng-content></ng-content>
    </div>
  `,
  styles: []
})
export class CardHeaderComponent {
  @Input() class = '';

  getHeaderClasses(): string {
    return cn('flex flex-col space-y-1.5 p-6', this.class);
  }
}

@Component({
  selector: 'ui-card-title',
  standalone: true,
  template: `
    <h3 class="text-2xl font-semibold leading-none tracking-tight">
      <ng-content></ng-content>
    </h3>
  `,
  styles: []
})
export class CardTitleComponent {}

@Component({
  selector: 'ui-card-description',
  standalone: true,
  template: `
    <p class="text-sm text-muted-foreground">
      <ng-content></ng-content>
    </p>
  `,
  styles: []
})
export class CardDescriptionComponent {}

@Component({
  selector: 'ui-card-content',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [class]="getContentClasses()">
      <ng-content></ng-content>
    </div>
  `,
  styles: []
})
export class CardContentComponent {
  @Input() class = '';

  getContentClasses(): string {
    return cn('p-6 pt-0', this.class);
  }
}

@Component({
  selector: 'ui-card-footer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [class]="getFooterClasses()">
      <ng-content></ng-content>
    </div>
  `,
  styles: []
})
export class CardFooterComponent {
  @Input() class = '';

  getFooterClasses(): string {
    return cn('flex items-center p-6 pt-0', this.class);
  }
}
