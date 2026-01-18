import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ToggleSwitchComponent } from '../../shared/components/toggle-switch.component';
import { AdminService, User, PaginatedResponse } from '../../services/admin.service';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, ToggleSwitchComponent],
  template: `
    <div class="admin-users">
      <div class="page-header">
        <h1 class="page-title">Users</h1>
        <button class="btn-primary" (click)="createUser()">+ New User</button>
      </div>

      <div class="loading" *ngIf="loading">Loading users...</div>

      <div class="table-container" *ngIf="!loading && users">
        <table class="data-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th>Organization</th>
              <th>Role</th>
              <th>Status</th>
              <th>Super Admin</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let user of users.data" [class.row-suspended]="!user.isActive">
              <td class="cell-email">{{ user.email }}</td>
              <td>{{ user.name || '-' }}</td>
              <td>{{ user.organization?.name || '-' }}</td>
              <td>
                <span class="role-badge">{{ user.role }}</span>
              </td>
              <td>
                <span class="status-badge" [class.status-active]="user.isActive" [class.status-suspended]="!user.isActive">
                  {{ user.isActive ? 'Active' : 'Suspended' }}
                </span>
              </td>
              <td>
                <app-toggle-switch
                  [checked]="user.isSuperAdmin"
                  (change)="toggleSuperAdmin(user, $event)"
                  [disabled]="toggling === user.id || user.id === currentUserId"
                ></app-toggle-switch>
              </td>
              <td>{{ user.createdAt | date:'shortDate' }}</td>
              <td class="cell-actions">
                <button
                  class="action-btn"
                  [class.action-btn-warning]="user.isActive"
                  [class.action-btn-success]="!user.isActive"
                  (click)="toggleSuspend(user)"
                  [disabled]="user.id === currentUserId"
                  [title]="user.isActive ? 'Suspend user' : 'Activate user'"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line *ngIf="user.isActive" x1="15" y1="9" x2="9" y2="15"/>
                    <line *ngIf="user.isActive" x1="9" y1="9" x2="15" y2="15"/>
                    <polyline *ngIf="!user.isActive" points="9 11 12 14 22 4"/>
                  </svg>
                </button>
                <button
                  class="action-btn action-btn-danger"
                  (click)="confirmDelete(user)"
                  [disabled]="user.id === currentUserId"
                  title="Delete user"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    <line x1="10" y1="11" x2="10" y2="17"/>
                    <line x1="14" y1="11" x2="14" y2="17"/>
                  </svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="pagination" *ngIf="users.pagination.totalPages > 1">
          <button [disabled]="users.pagination.page === 1" (click)="loadPage(users.pagination.page - 1)">Previous</button>
          <span>Page {{ users.pagination.page }} of {{ users.pagination.totalPages }}</span>
          <button [disabled]="users.pagination.page === users.pagination.totalPages" (click)="loadPage(users.pagination.page + 1)">Next</button>
        </div>
      </div>

      <!-- Delete Confirmation Modal -->
      <div class="modal-overlay" *ngIf="userToDelete" (click)="userToDelete = null">
        <div class="modal" (click)="$event.stopPropagation()">
          <h2>Delete User</h2>
          <p class="modal-warning">
            Are you sure you want to delete <strong>{{ userToDelete.email }}</strong>?
            This action cannot be undone.
          </p>
          <div class="modal-actions">
            <button class="btn-secondary" (click)="userToDelete = null">Cancel</button>
            <button class="btn-danger" (click)="deleteUser()" [disabled]="deleting">
              {{ deleting ? 'Deleting...' : 'Delete User' }}
            </button>
          </div>
          <div class="error-message" *ngIf="deleteError">{{ deleteError }}</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-users { max-width: 1200px; }

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

    .btn-primary {
      background: #1f2937;
      color: #fff;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
    }

    .btn-primary:hover { background: #374151; }

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

    .cell-email { font-weight: 500; color: #1f2937; }

    .role-badge {
      display: inline-block;
      padding: 4px 10px;
      background: #f3f4f6;
      border-radius: 4px;
      font-size: 0.8rem;
      color: #6b7280;
    }

    .status-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: 500;
    }

    .status-active {
      background: #d1fae5;
      color: #065f46;
    }

    .status-suspended {
      background: #fee2e2;
      color: #dc2626;
    }

    .row-suspended {
      opacity: 0.6;
    }

    .cell-actions {
      display: flex;
      gap: 8px;
    }

    .action-btn {
      padding: 8px;
      border: none;
      background: transparent;
      border-radius: 6px;
      cursor: pointer;
      color: #9ca3af;
      transition: all 0.2s;
    }

    .action-btn:hover:not(:disabled) {
      background: #f3f4f6;
      color: #374151;
    }

    .action-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .action-btn-warning {
      color: #f59e0b;
    }

    .action-btn-warning:hover:not(:disabled) {
      background: #fef3c7;
      color: #d97706;
    }

    .action-btn-success {
      color: #22c55e;
    }

    .action-btn-success:hover:not(:disabled) {
      background: #dcfce7;
      color: #16a34a;
    }

    .action-btn-danger {
      color: #ef4444;
    }

    .action-btn-danger:hover:not(:disabled) {
      background: #fee2e2;
      color: #dc2626;
    }

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
      max-width: 480px;
    }

    .modal h2 {
      margin: 0 0 16px 0;
      font-size: 1.25rem;
      color: #1f2937;
    }

    .modal-warning {
      color: #6b7280;
      margin-bottom: 24px;
      line-height: 1.5;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }

    .btn-secondary {
      background: #f3f4f6;
      color: #374151;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      cursor: pointer;
    }

    .btn-secondary:hover {
      background: #e5e7eb;
    }

    .btn-danger {
      background: #ef4444;
      color: #fff;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
    }

    .btn-danger:hover:not(:disabled) {
      background: #dc2626;
    }

    .btn-danger:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .error-message {
      background: #fee2e2;
      color: #dc2626;
      padding: 12px;
      border-radius: 8px;
      font-size: 0.875rem;
      margin-top: 12px;
    }

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
  `]
})
export class AdminUsersComponent implements OnInit {
  users: PaginatedResponse<User> | null = null;
  loading = true;
  toggling: number | null = null;
  userToDelete: User | null = null;
  deleting = false;
  deleteError = '';
  currentUserId: number | null = null;

  constructor(
    private adminService: AdminService,
    private router: Router
  ) {}

  async ngOnInit() {
    this.loadCurrentUserId();
    await this.loadUsers();
  }

  loadCurrentUserId() {
    const userId = localStorage.getItem('FB_user_id');
    if (userId) {
      this.currentUserId = parseInt(userId, 10);
    }
  }

  async loadUsers() {
    this.loading = true;
    try {
      this.users = await this.adminService.getUsers();
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      this.loading = false;
    }
  }

  async loadPage(page: number) {
    this.loading = true;
    try {
      this.users = await this.adminService.getUsers(page);
    } catch (err) {
      console.error('Failed to load page:', err);
    } finally {
      this.loading = false;
    }
  }

  async toggleSuperAdmin(user: User, isSuperAdmin: boolean) {
    this.toggling = user.id;
    try {
      await this.adminService.toggleSuperAdmin(user.id, isSuperAdmin);
      user.isSuperAdmin = isSuperAdmin;
    } catch (err) {
      console.error('Failed to toggle super admin:', err);
    } finally {
      this.toggling = null;
    }
  }

  createUser() {
    void this.router.navigate(['/admin/users/create']);
  }

  async toggleSuspend(user: User) {
    try {
      const newStatus = !user.isActive;
      await this.adminService.suspendUser(user.id, newStatus);
      user.isActive = newStatus;
    } catch (err: any) {
      console.error('Failed to toggle suspend:', err);
      alert(err.message || 'Failed to update user status');
    }
  }

  confirmDelete(user: User) {
    this.userToDelete = user;
    this.deleteError = '';
  }

  async deleteUser() {
    if (!this.userToDelete) return;

    this.deleting = true;
    this.deleteError = '';

    try {
      await this.adminService.deleteUser(this.userToDelete.id);
      this.userToDelete = null;
      await this.loadUsers();
    } catch (err: any) {
      this.deleteError = err.message || 'Failed to delete user';
      console.error('Failed to delete user:', err);
    } finally {
      this.deleting = false;
    }
  }
}
