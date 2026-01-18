import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { fetchUrl } from '../global-vars';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, NgIf],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  private readonly router = inject(Router);
  
  email = '';
  password = '';
  errorMessage = signal<string | null>(null);
  isLoading = signal(false);

  private readonly TOKEN_STORAGE_KEY = 'FB_jwt_token';
  private readonly USER_ID_KEY = 'FB_user_id';

  async login(): Promise<void> {
    if (!this.email || !this.password) {
      this.errorMessage.set('Please enter email and password');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const response = await fetch(`${fetchUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: this.email,
          password: this.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        this.errorMessage.set(data.error || 'Login failed');
        return;
      }

      // Store auth data
      localStorage.setItem(this.TOKEN_STORAGE_KEY, data.token);
      localStorage.setItem(this.USER_ID_KEY, data.userId.toString());
      
      // Navigate to dashboard
      void this.router.navigate(['/dashboard']);
    } catch (error) {
      console.error('Login error:', error);
      this.errorMessage.set('Login failed. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
