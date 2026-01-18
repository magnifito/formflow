import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrganizationService, Submission, Form, PaginatedResponse } from '../../services/organization.service';

@Component({
  selector: 'app-org-submissions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="submissions-page">
      <div class="page-header">
        <h1 class="page-title">Submissions</h1>
        <div class="filters">
          <select [(ngModel)]="selectedFormId" (change)="loadSubmissions()" class="form-select">
            <option [value]="null">All Forms</option>
            <option *ngFor="let form of forms" [value]="form.id">{{ form.name }}</option>
          </select>
        </div>
      </div>

      <div class="submissions-container">
        <div class="loading" *ngIf="loading">Loading submissions...</div>

        <div class="submissions-table-container" *ngIf="!loading && submissions.length > 0">
          <table class="submissions-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Form</th>
                <th>Origin</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let sub of submissions">
                <td class="sub-id">#{{ sub.id }}</td>
                <td>{{ sub.form?.name || 'Unknown' }}</td>
                <td class="sub-origin">{{ sub.originDomain || '-' }}</td>
                <td>{{ sub.createdAt | date:'short' }}</td>
                <td>
                  <button class="view-btn" (click)="viewSubmission(sub)">View Data</button>
                </td>
              </tr>
            </tbody>
          </table>

          <div class="pagination" *ngIf="pagination && pagination.totalPages > 1">
            <button 
              [disabled]="pagination.page === 1" 
              (click)="loadSubmissions(pagination.page - 1)"
            >Previous</button>
            <span>Page {{ pagination.page }} of {{ pagination.totalPages }}</span>
            <button 
              [disabled]="pagination.page === pagination.totalPages" 
              (click)="loadSubmissions(pagination.page + 1)"
            >Next</button>
          </div>
        </div>

        <div class="empty-state" *ngIf="!loading && submissions.length === 0">
          <p>No submissions yet.</p>
        </div>
      </div>

      <!-- View Submission Modal -->
      <div class="modal-overlay" *ngIf="selectedSubmission" (click)="selectedSubmission = null">
        <div class="modal" (click)="$event.stopPropagation()">
          <h2>Submission #{{ selectedSubmission.id }}</h2>
          <div class="submission-meta">
            <div class="meta-row"><strong>Form:</strong> {{ selectedSubmission.form?.name }}</div>
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
    .submissions-page { max-width: 1200px; }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .page-title {
      font-size: 1.75rem;
      font-weight: 600;
      color: #1f2937;
      margin: 0;
    }

    .form-select {
      padding: 10px 16px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-size: 0.9rem;
      background: #fff;
      min-width: 200px;
    }

    .submissions-container {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      overflow: hidden;
    }

    .loading, .empty-state {
      text-align: center;
      padding: 48px 24px;
      color: #6b7280;
    }

    .submissions-table {
      width: 100%;
      border-collapse: collapse;
    }

    .submissions-table th,
    .submissions-table td {
      padding: 14px 20px;
      text-align: left;
      border-bottom: 1px solid #f3f4f6;
    }

    .submissions-table th {
      font-size: 0.8rem;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      background: #f9fafb;
    }

    .sub-id { font-weight: 500; color: #374151; }
    .sub-origin { color: #6b7280; font-size: 0.9rem; }

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
export class OrgSubmissionsComponent implements OnInit {
  submissions: Submission[] = [];
  forms: Form[] = [];
  loading = true;
  selectedFormId: number | null = null;
  pagination: { page: number; totalPages: number } | null = null;
  selectedSubmission: Submission | null = null;

  constructor(private orgService: OrganizationService) {}

  async ngOnInit() {
    await Promise.all([
      this.loadForms(),
      this.loadSubmissions()
    ]);
  }

  async loadForms() {
    try {
      this.forms = await this.orgService.getForms();
    } catch (err) {
      console.error('Failed to load forms:', err);
    }
  }

  async loadSubmissions(page = 1) {
    this.loading = true;
    try {
      const response = await this.orgService.getSubmissions(page, 50, this.selectedFormId || undefined);
      this.submissions = response.data;
      this.pagination = {
        page: response.pagination.page,
        totalPages: response.pagination.totalPages
      };
    } catch (err) {
      console.error('Failed to load submissions:', err);
    } finally {
      this.loading = false;
    }
  }

  viewSubmission(sub: Submission) {
    this.selectedSubmission = sub;
  }
}
