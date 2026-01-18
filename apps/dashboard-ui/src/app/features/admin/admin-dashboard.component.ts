import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { StatCardComponent } from '../../shared/components/stat-card.component';
import { AdminService, AdminStats } from '../../services/admin.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, StatCardComponent],
  template: `
    <div class="admin-dashboard">
      <h1 class="page-title">Admin Dashboard</h1>

      <div class="loading" *ngIf="loading">Loading statistics...</div>
      <div class="error" *ngIf="error">{{ error }}</div>

      <div class="stats-grid" *ngIf="stats">
        <app-stat-card
          title="Organizations"
          [value]="stats.organizations.total"
          [suffix]="stats.organizations.active + ' active'"
          icon="&#127970;"
        ></app-stat-card>

        <app-stat-card
          title="Users"
          [value]="stats.users.total"
          icon="&#128101;"
        ></app-stat-card>

        <app-stat-card
          title="Forms"
          [value]="stats.forms.total"
          icon="&#128196;"
        ></app-stat-card>

        <app-stat-card
          title="Submissions"
          [value]="stats.submissions.total"
          [suffix]="stats.submissions.last30Days + ' last 30 days'"
          icon="&#128203;"
        ></app-stat-card>
      </div>

      <div class="quick-actions" *ngIf="!loading">
        <h2>Quick Actions</h2>
        <div class="action-buttons">
          <a routerLink="/admin/organizations" class="action-btn">
            <span>&#10133;</span> Create Organization
          </a>
          <a routerLink="/admin/submissions" class="action-btn">
            <span>&#128200;</span> View All Submissions
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-dashboard { max-width: 1200px; }

    .page-title {
      font-size: 1.75rem;
      font-weight: 600;
      color: #1f2937;
      margin: 0 0 24px 0;
    }

    .loading, .error {
      padding: 20px;
      text-align: center;
      background: #fff;
      border-radius: 12px;
      border: 1px solid #e5e7eb;
    }

    .error { color: #dc2626; background: #fef2f2; }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 32px;
    }

    .quick-actions h2 {
      font-size: 1.1rem;
      font-weight: 600;
      color: #1f2937;
      margin: 0 0 16px 0;
    }

    .action-buttons {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .action-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 20px;
      background: #1f2937;
      color: #fff;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 500;
      font-size: 0.9rem;
      transition: background 0.15s;
    }

    .action-btn:hover { background: #374151; }
  `]
})
export class AdminDashboardComponent implements OnInit {
  stats: AdminStats | null = null;
  loading = true;
  error = '';

  constructor(private adminService: AdminService) {}

  async ngOnInit() {
    try {
      this.stats = await this.adminService.getStats();
    } catch (err: any) {
      this.error = err.message || 'Failed to load statistics';
    } finally {
      this.loading = false;
    }
  }
}
