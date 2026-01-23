import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { fetchUrl } from '../global-vars';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  private readonly TOKEN_KEY = 'ff_jwt_token';
  private readonly USER_ID_KEY = 'ff_user_id';

  constructor(private router: Router) { }

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    const token = localStorage.getItem(this.TOKEN_KEY);
    const userId = localStorage.getItem(this.USER_ID_KEY);

    if (!token || !userId) {
      this.router.navigate(['/login']);
      return false;
    }

    // Check if user is a super admin
    return fetch(`${fetchUrl}/api/user/${userId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => {
        if (!response.ok) {
          // If user not found (404) or unauthorized (401/403), clear auth and redirect to login
          if (response.status === 401 || response.status === 403 || response.status === 404) {
            localStorage.removeItem(this.TOKEN_KEY);
            localStorage.removeItem(this.USER_ID_KEY);
            this.router.navigate(['/login']);
            return false;
          }
          // For other errors, redirect to dashboard
          this.router.navigate(['/dashboard']);
          return false;
        }
        return response.json();
      })
      .then((user) => {
        if (!user) return false;
        if (user.isSuperAdmin) {
          return true;
        } else {
          this.router.navigate(['/dashboard']);
          return false;
        }
      })
      .catch((error) => {
        console.error('Admin check failed:', error);
        // Clear auth on network/parsing errors
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.USER_ID_KEY);
        this.router.navigate(['/login']);
        return false;
      });
  }
}
