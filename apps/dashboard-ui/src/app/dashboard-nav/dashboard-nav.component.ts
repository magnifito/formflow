import { Component, Input } from '@angular/core';
import { OnInit } from '@angular/core';
import { NgFor } from '@angular/common';
import { Router } from '@angular/router';
import { fetchUrl } from '../global-vars';

@Component({
  selector: 'app-dashboard-nav',
  standalone: true,
  imports: [NgFor],
  templateUrl: './dashboard-nav.component.html',
  styleUrl: './dashboard-nav.component.scss'
})
export class DashboardNavComponent implements OnInit {
  @Input() name: string | undefined;
  @Input() email: string | undefined;
  @Input() userId: string | undefined;
  isDropdownOpen = false;
  themes: string[] = ['dark', 'neutral', 'light-theme'];
  currentTheme = 'neutral';
  isThemeMenuOpen = false;

  private readonly TOKEN_KEY = 'ff_jwt_token';
  private readonly USER_ID_KEY = 'ff_user_id';

  constructor(private router: Router) { }

  ngOnInit(): void {
    if (!this.userId) {
      const userId = localStorage.getItem(this.USER_ID_KEY);
      const token = localStorage.getItem(this.TOKEN_KEY);

      if (!token || !userId) {
        this.router.navigate(['/login']);
        return;
      }

      this.userId = userId;
      this.getUser(userId);
    } else {
      this.getUser(this.userId);
    }
  }

  private async getUser(userId: string | undefined) {
    if (userId) {
      const jwtToken = localStorage.getItem(this.TOKEN_KEY);
      try {
        const response = await fetch(fetchUrl + '/api/user/' + userId, {
          headers: {
            'Authorization': `Bearer ${jwtToken}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch user data');
        }

        const data = await response.json();
        this.name = data.name || data.email;
        this.email = data.email;
        this.currentTheme = localStorage.getItem("theme") || "neutral";
        document.documentElement.className = this.currentTheme;
      } catch (error) {
        console.error('Error fetching user data:', error);
        this.router.navigate(['/login']);
      }
    }
  }

  goToDocs() {
    window.open("https://docs.formflow.fyi/docs");
  }

  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_ID_KEY);
    this.router.navigate(['/login']);
  }

  changeTheme(theme: string): void {
    this.currentTheme = theme;
    localStorage.setItem("theme", theme);
    document.documentElement.className = this.currentTheme;
  }

  toggleThemeMenu(): void {
    this.isThemeMenuOpen = !this.isThemeMenuOpen;
  }

  dashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}
