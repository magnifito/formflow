import { Component, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { cn } from './utils';

/**
 * Input Component - Spartan UI Style
 *
 * Usage:
 * <ui-input
 *   type="text"
 *   placeholder="Enter text..."
 *   [(ngModel)]="value">
 * </ui-input>
 */
@Component({
  selector: 'ui-input',
  standalone: true,
  imports: [CommonModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputComponent),
      multi: true
    }
  ],
  template: `
    <input
      [type]="type"
      [placeholder]="placeholder"
      [disabled]="disabled"
      [class]="getInputClasses()"
      [value]="value"
      (input)="onInput($event)"
      (blur)="onTouched()"
    />
  `,
  styles: []
})
export class InputComponent implements ControlValueAccessor {
  @Input() type = 'text';
  @Input() placeholder = '';
  @Input() disabled = false;
  @Input() class = '';

  value = '';
  onChange: any = () => {};
  onTouched: any = () => {};

  getInputClasses(): string {
    return cn(
      'flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm',
      'ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium',
      'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2',
      'focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
      this.class
    );
  }

  onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.value = value;
    this.onChange(value);
  }

  writeValue(value: any): void {
    this.value = value || '';
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
