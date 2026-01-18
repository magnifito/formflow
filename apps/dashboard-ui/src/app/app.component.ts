import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { fetchUrl } from './global-vars';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'FormFlow';
  private router = inject(Router);

  async ngOnInit(): Promise<void> {
    // Check setup status on app initialization if we're on login or root
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(async (event: NavigationEnd) => {
        const url = event.urlAfterRedirects;
        
        // Only check setup if we're on login page or root (before auth)
        if (url === '/login' || url === '/') {
          await this.checkAndRedirectToSetup();
        }
      });

    // Also check on initial load
    await this.checkAndRedirectToSetup();
  }

  private async checkAndRedirectToSetup(): Promise<void> {
    try {
      const response = await fetch(`${fetchUrl}/setup`);
      const data = await response.json();

      if (data.setupNeeded) {
        // Check current route to avoid infinite redirects
        const currentUrl = this.router.url;
        if (currentUrl !== '/setup' && !currentUrl.startsWith('/setup')) {
          void this.router.navigate(['/setup']);
        }
      }
    } catch (error) {
      // If check fails, don't block the app - let user proceed to login
      console.error('Failed to check setup status:', error);
    }
  }
}
