import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-toggle-switch',
  standalone: true,
  imports: [CommonModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ToggleSwitchComponent),
      multi: true
    }
  ],
  template: `
    <label class="toggle-container" [class.disabled]="disabled">
      <input
        type="checkbox"
        [checked]="checked"
        [disabled]="disabled"
        (change)="onToggle($event)"
        class="toggle-input"
      >
      <span class="toggle-slider" [class.checked]="checked"></span>
      <span class="toggle-label" *ngIf="label">{{ checked ? activeLabel || label : inactiveLabel || label }}</span>
    </label>
  `,
  styles: [`
    .toggle-container {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      user-select: none;
    }

    .toggle-container.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .toggle-input {
      display: none;
    }

    .toggle-slider {
      position: relative;
      width: 44px;
      height: 24px;
      background: #d1d5db;
      border-radius: 12px;
      transition: background 0.2s ease;
    }

    .toggle-slider::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 20px;
      height: 20px;
      background: #fff;
      border-radius: 50%;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
      transition: transform 0.2s ease;
    }

    .toggle-slider.checked {
      background: #22c55e;
    }

    .toggle-slider.checked::after {
      transform: translateX(20px);
    }

    .toggle-label {
      font-size: 0.875rem;
      color: #6b7280;
    }

    .toggle-slider.checked + .toggle-label {
      color: #16a34a;
    }
  `]
})
export class ToggleSwitchComponent implements ControlValueAccessor {
  @Input() checked = false;
  @Input() disabled = false;
  @Input() label = '';
  @Input() activeLabel = '';
  @Input() inactiveLabel = '';
  @Output() change = new EventEmitter<boolean>();

  private onChange: (value: boolean) => void = () => {};
  private onTouched: () => void = () => {};

  onToggle(event: Event) {
    if (this.disabled) return;
    const target = event.target as HTMLInputElement;
    this.checked = target.checked;
    this.onChange(this.checked);
    this.onTouched();
    this.change.emit(this.checked);
  }

  writeValue(value: boolean): void {
    this.checked = value;
  }

  registerOnChange(fn: (value: boolean) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
