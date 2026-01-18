import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ZardButtonComponent } from '@/shared/components/button';
import { ZardCardComponent } from '@/shared/components/card';
import { ZardInputDirective } from '@/shared/components/input';
import { ZardBadgeComponent } from '@/shared/components/badge';
import {
  ZardTableComponent,
  ZardTableHeaderComponent,
  ZardTableBodyComponent,
  ZardTableRowComponent,
  ZardTableHeadComponent,
  ZardTableCellComponent,
} from '@/shared/components/table';

interface Submission {
  id: string;
  name: string;
  email: string;
  message: string;
  date: string;
  status: 'sent' | 'pending' | 'failed';
}

/**
 * Submissions Page Component
 *
 * Displays all form submissions in a table
 */
@Component({
  selector: 'app-submissions-page',
  standalone: true,
  imports: [
    CommonModule,
    ZardButtonComponent,
    ZardCardComponent,
    ZardInputDirective,
    ZardBadgeComponent,
    ZardTableComponent,
    ZardTableHeaderComponent,
    ZardTableBodyComponent,
    ZardTableRowComponent,
    ZardTableHeadComponent,
    ZardTableCellComponent,
  ],
  template: `
    <div class="p-8 space-y-8">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold tracking-tight">Form Submissions</h1>
          <p class="text-muted-foreground">View and manage all your form submissions</p>
        </div>
        <div class="flex gap-2">
          <button z-button zType="outline">
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filter
          </button>
          <button z-button zType="outline">
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </button>
        </div>
      </div>

      <!-- Submissions Table -->
      <z-card
        [zTitle]="'All Submissions'"
        [zDescription]="submissions.length + ' submissions found'">
        <div class="flex items-center justify-between mb-4">
          <input
            z-input
            type="search"
            placeholder="Search submissions..."
            class="max-w-sm">
        </div>
        <table z-table class="w-full">
          <thead z-table-header>
            <tr z-table-row>
              <th z-table-head class="w-[100px]">ID</th>
              <th z-table-head>Name</th>
              <th z-table-head>Email</th>
              <th z-table-head>Message</th>
              <th z-table-head>Date</th>
              <th z-table-head>Status</th>
              <th z-table-head class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody z-table-body>
              @for (submission of submissions; track submission.id) {
                <tr z-table-row>
                  <td z-table-cell class="font-medium">
                    {{ submission.id }}
                  </td>
                  <td z-table-cell>
                    {{ submission.name }}
                  </td>
                  <td z-table-cell>
                    {{ submission.email }}
                  </td>
                  <td z-table-cell class="max-w-xs truncate">
                    {{ submission.message }}
                  </td>
                  <td z-table-cell>
                    {{ submission.date }}
                  </td>
                  <td z-table-cell>
                    <z-badge [zType]="getStatusVariant(submission.status)">
                      {{ submission.status }}
                    </z-badge>
                  </td>
                  <td z-table-cell class="text-right">
                    <button z-button zType="ghost" zSize="sm">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr z-table-row>
                  <td z-table-cell colspan="7" class="text-center py-8">
                    <div class="flex flex-col items-center gap-2 text-muted-foreground">
                      <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      <p class="text-lg font-medium">No submissions found</p>
                      <p class="text-sm">Start receiving submissions to see them here</p>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>

          <!-- Pagination -->
          <div class="flex items-center justify-between px-2 py-4">
            <div class="text-sm text-muted-foreground">
              Showing <strong>1-{{ submissions.length }}</strong> of <strong>{{ submissions.length }}</strong> submissions
            </div>
            <div class="flex items-center gap-2">
              <button z-button zType="outline" zSize="sm" disabled>
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </button>
              <button z-button zType="outline" zSize="sm" disabled>
                Next
                <svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
        </z-card>
    </div>
  `,
  styles: []
})
export class SubmissionsPageComponent {
  submissions: Submission[] = [
    {
      id: 'SUB001',
      name: 'John Doe',
      email: 'john@example.com',
      message: 'I would like to inquire about your services...',
      date: '2024-01-16',
      status: 'sent'
    },
    {
      id: 'SUB002',
      name: 'Jane Smith',
      email: 'jane@example.com',
      message: 'Great product! Looking forward to working with you.',
      date: '2024-01-16',
      status: 'sent'
    },
    {
      id: 'SUB003',
      name: 'Bob Johnson',
      email: 'bob@example.com',
      message: 'Can you provide more information about pricing?',
      date: '2024-01-15',
      status: 'sent'
    },
    {
      id: 'SUB004',
      name: 'Alice Williams',
      email: 'alice@example.com',
      message: 'I have a question regarding the integration process.',
      date: '2024-01-15',
      status: 'pending'
    },
    {
      id: 'SUB005',
      name: 'Charlie Brown',
      email: 'charlie@example.com',
      message: 'Interested in the Enterprise plan features.',
      date: '2024-01-14',
      status: 'sent'
    }
  ];

  // Zard UI badge types: 'default', 'secondary', 'destructive', 'outline'
  // Mapping status to Zard UI badge variants
  getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
    switch (status) {
      case 'sent':
        return 'default'; // or 'secondary' depending on Zard UI theme
      case 'pending':
        return 'secondary'; // may need adjustment based on Zard UI variants
      case 'failed':
        return 'destructive';
      default:
        return 'default';
    }
  }
}
