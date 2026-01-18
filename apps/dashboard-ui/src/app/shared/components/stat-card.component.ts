import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="stat-card" [class.with-progress]="showProgress">
      <div class="stat-icon" *ngIf="icon">
        <span [innerHTML]="icon"></span>
      </div>
      <div class="stat-content">
        <span class="stat-title">{{ title }}</span>
        <div class="stat-value-row">
          <span class="stat-value">{{ value }}</span>
          <span class="stat-suffix" *ngIf="suffix">{{ suffix }}</span>
        </div>
        <div class="progress-bar" *ngIf="showProgress">
          <div class="progress-fill" [style.width.%]="progressPercent"></div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .stat-card {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 20px 24px;
      display: flex;
      align-items: flex-start;
      gap: 16px;
      min-width: 200px;
    }

    .stat-icon {
      width: 48px;
      height: 48px;
      background: #f0fdf4;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      color: #22c55e;
    }

    .stat-content {
      flex: 1;
    }

    .stat-title {
      display: block;
      font-size: 0.875rem;
      color: #6b7280;
      margin-bottom: 4px;
    }

    .stat-value-row {
      display: flex;
      align-items: baseline;
      gap: 4px;
    }

    .stat-value {
      font-size: 1.75rem;
      font-weight: 700;
      color: #1f2937;
      line-height: 1.2;
    }

    .stat-suffix {
      font-size: 0.875rem;
      color: #9ca3af;
    }

    .progress-bar {
      margin-top: 12px;
      height: 6px;
      background: #e5e7eb;
      border-radius: 3px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #22c55e, #16a34a);
      border-radius: 3px;
      transition: width 0.3s ease;
    }

    .stat-card.with-progress {
      min-width: 280px;
    }
  `]
})
export class StatCardComponent {
  @Input() title = '';
  @Input() value: string | number = '';
  @Input() suffix = '';
  @Input() icon = '';
  @Input() showProgress = false;
  @Input() progressPercent = 0;
}
