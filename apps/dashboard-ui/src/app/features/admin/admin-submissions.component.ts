import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService, PaginatedResponse } from '../../services/admin.service';

@Component({
  selector: 'app-admin-submissions',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="admin-submissions">
      <h1 class="page-title">All Submissions</h1>

      <div class="loading" *ngIf="loading">Loading submissions...</div>

      <div class="table-container" *ngIf="!loading && submissions">
        <table class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Form</th>
              <th>Organization</th>
              <th>Origin</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let sub of submissions.data">
              <td class="cell-id">#{{ sub.id }}</td>
              <td>{{ sub.form?.name || 'Unknown' }}</td>
              <td>{{ sub.form?.organization?.name || '-' }}</td>
              <td class="cell-origin">{{ sub.originDomain || '-' }}</td>
              <td>{{ sub.createdAt | date:'short' }}</td>
              <td>
                <button class="view-btn" (click)="viewSubmission(sub)">View</button>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="pagination" *ngIf="submissions.pagination.totalPages > 1">
          <button [disabled]="submissions.pagination.page === 1" (click)="loadPage(submissions.pagination.page - 1)">Previous</button>
          <span>Page {{ submissions.pagination.page }} of {{ submissions.pagination.totalPages }}</span>
          <button [disabled]="submissions.pagination.page === submissions.pagination.totalPages" (click)="loadPage(submissions.pagination.page + 1)">Next</button>
        </div>
      </div>

      <!-- View Modal -->
      <div class="modal-overlay" *ngIf="selectedSubmission" (click)="selectedSubmission = null">
        <div class="modal" (click)="$event.stopPropagation()">
          <h2>Submission #{{ selectedSubmission.id }}</h2>
          <div class="submission-meta">
            <div class="meta-row"><strong>Form:</strong> {{ selectedSubmission.form?.name }}</div>
            <div class="meta-row"><strong>Organization:</strong> {{ selectedSubmission.form?.organization?.name }}</div>
            <div class="meta-row"><strong>Origin:</strong> {{ selectedSubmission.originDomain || 'N/A' }}</div>
            <div class="meta-row"><strong>IP:</strong> {{ selectedSubmission.ipAddress || 'N/A' }}</div>
            <div class="meta-row"><strong>Date:</strong> {{ selectedSubmission.createdAt | date:'medium' }}</div>
          </div>
          <h3>Data</h3>
          <pre class="submission-data">{{ selectedSubmission.data | json }}</pre>
          <div class="modal-actions">
            <button class="btn-secondary" (click)="selectedSubmission = null">Close</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-submissions { max-width: 1200px; }

    .page-title {
      font-size: 1.75rem;
      font-weight: 600;
      color: #1f2937;
      margin: 0 0 24px 0;
    }

    .loading {
      text-align: center;
      padding: 48px;
      background: #fff;
      border-radius: 12px;
      color: #6b7280;
    }

    .table-container {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      overflow: hidden;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
    }

    .data-table th,
    .data-table td {
      padding: 14px 20px;
      text-align: left;
      border-bottom: 1px solid #f3f4f6;
    }

    .data-table th {
      font-size: 0.8rem;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      background: #f9fafb;
    }

    .cell-id { font-weight: 500; color: #374151; }
    .cell-origin { color: #6b7280; font-size: 0.9rem; }

    .view-btn {
      padding: 6px 12px;
      background: #f3f4f6;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.85rem;
      color: #374151;
    }

    .view-btn:hover { background: #e5e7eb; }

    .pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 16px;
      padding: 16px;
      border-top: 1px solid #e5e7eb;
    }

    .pagination button {
      padding: 8px 16px;
      border: 1px solid #d1d5db;
      background: #fff;
      border-radius: 6px;
      cursor: pointer;
    }

    .pagination button:disabled { opacity: 0.5; cursor: not-allowed; }

    .modal-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal {
      background: #fff;
      border-radius: 12px;
      padding: 24px;
      width: 100%;
      max-width: 600px;
      max-height: 80vh;
      overflow-y: auto;
    }

    .modal h2 { margin: 0 0 16px 0; font-size: 1.25rem; color: #1f2937; }
    .modal h3 { margin: 16px 0 8px 0; font-size: 0.9rem; color: #6b7280; }

    .submission-meta {
      background: #f9fafb;
      padding: 12px;
      border-radius: 8px;
    }

    .meta-row { padding: 4px 0; font-size: 0.9rem; }

    .submission-data {
      background: #1f2937;
      color: #f9fafb;
      padding: 16px;
      border-radius: 8px;
      overflow-x: auto;
      font-size: 0.85rem;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 20px;
    }

    .btn-secondary {
      background: #f3f4f6;
      color: #374151;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      cursor: pointer;
    }
  `]
})
export class AdminSubmissionsComponent implements OnInit {
  submissions: PaginatedResponse<any> | null = null;
  loading = true;
  selectedSubmission: any = null;

  constructor(private adminService: AdminService) {}

  async ngOnInit() {
    await this.loadSubmissions();
  }

  async loadSubmissions() {
    this.loading = true;
    try {
      this.submissions = await this.adminService.getSubmissions();
    } catch (err) {
      console.error('Failed to load submissions:', err);
    } finally {
      this.loading = false;
    }
  }

  async loadPage(page: number) {
    this.loading = true;
    try {
      this.submissions = await this.adminService.getSubmissions(page);
    } catch (err) {
      console.error('Failed to load page:', err);
    } finally {
      this.loading = false;
    }
  }

  viewSubmission(sub: any) {
    this.selectedSubmission = sub;
  }
}
