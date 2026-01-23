import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { fetchUrl } from './global-vars';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
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

    // Verify the token is still valid by making a request to the API
    return fetch(`${fetchUrl}/api/user/${userId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => {
        if (response.ok) {
          return true;
        } else if (response.status === 401 || response.status === 403 || response.status === 404) {
          // Token expired, invalid, or user not found (e.g., after DB reset) - clear auth and redirect
          localStorage.removeItem(this.TOKEN_KEY);
          localStorage.removeItem(this.USER_ID_KEY);
          this.router.navigate(['/login']);
          return false;
        } else {
          // For any other error, clear auth and redirect to login
          localStorage.removeItem(this.TOKEN_KEY);
          localStorage.removeItem(this.USER_ID_KEY);
          this.router.navigate(['/login']);
          return false;
        }
      })
      .catch((error) => {
        console.error('Auth check failed:', error);
        // Clear auth on any network/parsing error
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.USER_ID_KEY);
        this.router.navigate(['/login']);
        return false;
      });
  }
}
