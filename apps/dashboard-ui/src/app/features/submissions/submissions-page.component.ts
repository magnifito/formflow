import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  CardComponent,
  CardHeaderComponent,
  CardTitleComponent,
  CardDescriptionComponent,
  CardContentComponent
} from '../../shared/ui/card.component';
import { ButtonComponent } from '../../shared/ui/button.component';
import { BadgeComponent } from '../../shared/ui/badge.component';
import { InputComponent } from '../../shared/ui/input.component';
import {
  TableComponent,
  TableHeaderComponent,
  TableBodyComponent,
  TableRowComponent,
  TableHeadComponent,
  TableCellComponent
} from '../../shared/ui/table.component';

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
    CardComponent,
    CardHeaderComponent,
    CardTitleComponent,
    CardDescriptionComponent,
    CardContentComponent,
    ButtonComponent,
    BadgeComponent,
    InputComponent,
    TableComponent,
    TableHeaderComponent,
    TableBodyComponent,
    TableRowComponent,
    TableHeadComponent,
    TableCellComponent
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
          <ui-button variant="outline">
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filter
          </ui-button>
          <ui-button variant="outline">
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </ui-button>
        </div>
      </div>

      <!-- Submissions Table -->
      <ui-card>
        <ui-card-header>
          <div class="flex items-center justify-between">
            <div>
              <ui-card-title>All Submissions</ui-card-title>
              <ui-card-description>
                {{ submissions.length }} submissions found
              </ui-card-description>
            </div>
            <ui-input
              type="search"
              placeholder="Search submissions..."
              class="max-w-sm">
            </ui-input>
          </div>
        </ui-card-header>
        <ui-card-content>
          <ui-table>
            <ui-table-header>
              <ui-table-row>
                <ui-table-head class="w-[100px]">ID</ui-table-head>
                <ui-table-head>Name</ui-table-head>
                <ui-table-head>Email</ui-table-head>
                <ui-table-head>Message</ui-table-head>
                <ui-table-head>Date</ui-table-head>
                <ui-table-head>Status</ui-table-head>
                <ui-table-head class="text-right">Actions</ui-table-head>
              </ui-table-row>
            </ui-table-header>
            <ui-table-body>
              @for (submission of submissions; track submission.id) {
                <ui-table-row>
                  <ui-table-cell class="font-medium">
                    {{ submission.id }}
                  </ui-table-cell>
                  <ui-table-cell>
                    {{ submission.name }}
                  </ui-table-cell>
                  <ui-table-cell>
                    {{ submission.email }}
                  </ui-table-cell>
                  <ui-table-cell class="max-w-xs truncate">
                    {{ submission.message }}
                  </ui-table-cell>
                  <ui-table-cell>
                    {{ submission.date }}
                  </ui-table-cell>
                  <ui-table-cell>
                    <ui-badge [variant]="getStatusVariant(submission.status)">
                      {{ submission.status }}
                    </ui-badge>
                  </ui-table-cell>
                  <ui-table-cell class="text-right">
                    <ui-button variant="ghost" size="sm">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </ui-button>
                  </ui-table-cell>
                </ui-table-row>
              } @empty {
                <ui-table-row>
                  <ui-table-cell colspan="7" class="text-center py-8">
                    <div class="flex flex-col items-center gap-2 text-muted-foreground">
                      <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      <p class="text-lg font-medium">No submissions found</p>
                      <p class="text-sm">Start receiving submissions to see them here</p>
                    </div>
                  </ui-table-cell>
                </ui-table-row>
              }
            </ui-table-body>
          </ui-table>

          <!-- Pagination -->
          <div class="flex items-center justify-between px-2 py-4">
            <div class="text-sm text-muted-foreground">
              Showing <strong>1-{{ submissions.length }}</strong> of <strong>{{ submissions.length }}</strong> submissions
            </div>
            <div class="flex items-center gap-2">
              <ui-button variant="outline" size="sm" disabled>
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </ui-button>
              <ui-button variant="outline" size="sm" disabled>
                Next
                <svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </ui-button>
            </div>
          </div>
        </ui-card-content>
      </ui-card>
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

  getStatusVariant(status: string): 'success' | 'warning' | 'destructive' | 'default' {
    switch (status) {
      case 'sent':
        return 'success';
      case 'pending':
        return 'warning';
      case 'failed':
        return 'destructive';
      default:
        return 'default';
    }
  }
}
