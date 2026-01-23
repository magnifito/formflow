import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ZardDividerComponent } from '@/shared/components/divider';

/**
 * Dashboard Layout Component
 *
 * Provides the main layout structure with sidebar navigation
 *
 * Usage:
 * Wrap your dashboard routes with this layout
 */
@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ZardDividerComponent,
  ],
  template: `
    <div class="flex h-screen bg-background overflow-hidden selection:bg-primary/20">
      <!-- Sidebar -->
      <aside class="w-64 border-r border-border/50 bg-card/60 backdrop-blur-xl flex flex-col z-20 transition-all duration-300">
        <!-- Logo / Brand -->
        <div class="p-6">
          <div class="flex items-center gap-3">
            <div class="h-10 w-10 rounded-xl bg-linear-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20 ring-1 ring-white/10">
              <span class="text-primary-foreground font-display font-bold text-xl">F</span>
            </div>
            <span class="text-xl font-display font-bold tracking-tight bg-linear-to-br from-foreground to-muted-foreground bg-clip-text text-transparent">FormFlow</span>
          </div>
        </div>

        <div class="px-4">
            <z-divider class="opacity-50"></z-divider>
        </div>

        <!-- Navigation -->
        <nav class="flex-1 p-4 space-y-1 overflow-y-auto">
          <a
            routerLink="/dashboard"
            routerLinkActive="bg-primary/10 text-primary font-semibold shadow-sm"
            [routerLinkActiveOptions]="{exact: true}"
            class="group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-muted text-muted-foreground hover:text-foreground">
            <svg class="w-5 h-5 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span>Dashboard</span>
          </a>

          <a
            routerLink="/submissions"
            routerLinkActive="bg-primary/10 text-primary font-semibold shadow-sm"
            class="group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-muted text-muted-foreground hover:text-foreground">
            <svg class="w-5 h-5 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Submissions</span>
          </a>

          <a
            routerLink="/api-keys"
            routerLinkActive="bg-primary/10 text-primary font-semibold shadow-sm"
            class="group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-muted text-muted-foreground hover:text-foreground">
            <svg class="w-5 h-5 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            <span>API Keys</span>
          </a>

          <a
            routerLink="/integrations"
            routerLinkActive="bg-primary/10 text-primary font-semibold shadow-sm"
            class="group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-muted text-muted-foreground hover:text-foreground">
            <svg class="w-5 h-5 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
            </svg>
            <span>Integrations</span>
          </a>

          <a
            routerLink="/billing"
            routerLinkActive="bg-primary/10 text-primary font-semibold shadow-sm"
            class="group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-muted text-muted-foreground hover:text-foreground">
            <svg class="w-5 h-5 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <span>Billing</span>
          </a>

          <a
            routerLink="/settings"
            routerLinkActive="bg-primary/10 text-primary font-semibold shadow-sm"
            class="group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-muted text-muted-foreground hover:text-foreground">
            <svg class="w-5 h-5 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Settings</span>
          </a>
        </nav>

        <div class="px-4">
             <z-divider class="opacity-50"></z-divider>
        </div>

        <!-- User Section -->
        <div class="p-4">
          <div class="group flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-muted/80 cursor-pointer transition-all duration-200">
            <div class="h-9 w-9 rounded-full bg-linear-to-br from-primary to-accent flex items-center justify-center ring-2 ring-background border border-white/10 shadow-sm">
              <span class="text-primary-foreground text-sm font-bold">U</span>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">User Name</p>
              <p class="text-xs text-muted-foreground truncate">user@example.com</p>
            </div>
            <svg class="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </div>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="flex-1 overflow-auto bg-background/50 relative">
          <!-- Background decoration -->
          <div class="absolute inset-0 z-0 pointer-events-none overflow-hidden">
               <div class="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
               <div class="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
          </div>
          
          <div class="relative z-10 p-8 h-full">
            <router-outlet></router-outlet>
          </div>
      </main>
    </div>
  `,
  styles: []
})
export class DashboardLayoutComponent { }
