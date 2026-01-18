import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { cn } from './utils';

/**
 * Table Components - Spartan UI Style
 *
 * Usage:
 * <ui-table>
 *   <ui-table-header>
 *     <ui-table-row>
 *       <ui-table-head>Name</ui-table-head>
 *       <ui-table-head>Email</ui-table-head>
 *     </ui-table-row>
 *   </ui-table-header>
 *   <ui-table-body>
 *     <ui-table-row>
 *       <ui-table-cell>John</ui-table-cell>
 *       <ui-table-cell>john@example.com</ui-table-cell>
 *     </ui-table-row>
 *   </ui-table-body>
 * </ui-table>
 */

@Component({
  selector: 'ui-table',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative w-full overflow-auto">
      <table [class]="getTableClasses()">
        <ng-content></ng-content>
      </table>
    </div>
  `,
  styles: []
})
export class TableComponent {
  @Input() class = '';

  getTableClasses(): string {
    return cn('w-full caption-bottom text-sm', this.class);
  }
}

@Component({
  selector: 'ui-table-header',
  standalone: true,
  template: `
    <thead class="[&_tr]:border-b">
      <ng-content></ng-content>
    </thead>
  `,
  styles: []
})
export class TableHeaderComponent {}

@Component({
  selector: 'ui-table-body',
  standalone: true,
  template: `
    <tbody class="[&_tr:last-child]:border-0">
      <ng-content></ng-content>
    </tbody>
  `,
  styles: []
})
export class TableBodyComponent {}

@Component({
  selector: 'ui-table-footer',
  standalone: true,
  template: `
    <tfoot class="border-t bg-muted/50 font-medium [&>tr]:last:border-b-0">
      <ng-content></ng-content>
    </tfoot>
  `,
  styles: []
})
export class TableFooterComponent {}

@Component({
  selector: 'ui-table-row',
  standalone: true,
  imports: [CommonModule],
  template: `
    <tr [class]="getRowClasses()">
      <ng-content></ng-content>
    </tr>
  `,
  styles: []
})
export class TableRowComponent {
  @Input() class = '';

  getRowClasses(): string {
    return cn(
      'border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted',
      this.class
    );
  }
}

@Component({
  selector: 'ui-table-head',
  standalone: true,
  imports: [CommonModule],
  template: `
    <th [class]="getHeadClasses()">
      <ng-content></ng-content>
    </th>
  `,
  styles: []
})
export class TableHeadComponent {
  @Input() class = '';

  getHeadClasses(): string {
    return cn(
      'h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0',
      this.class
    );
  }
}

@Component({
  selector: 'ui-table-cell',
  standalone: true,
  imports: [CommonModule],
  template: `
    <td [class]="getCellClasses()">
      <ng-content></ng-content>
    </td>
  `,
  styles: []
})
export class TableCellComponent {
  @Input() class = '';

  getCellClasses(): string {
    return cn('p-4 align-middle [&:has([role=checkbox])]:pr-0', this.class);
  }
}

@Component({
  selector: 'ui-table-caption',
  standalone: true,
  template: `
    <caption class="mt-4 text-sm text-muted-foreground">
      <ng-content></ng-content>
    </caption>
  `,
  styles: []
})
export class TableCaptionComponent {}
