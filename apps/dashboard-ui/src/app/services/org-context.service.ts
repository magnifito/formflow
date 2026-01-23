import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Service to manage organization context for super admins.
 * Super admins can switch between viewing their own forms (null organization)
 * and viewing/managing forms for any specific organization.
 */
@Injectable({
  providedIn: 'root'
})
export class OrgContextService {
  private readonly STORAGE_KEY = 'ff_selected_org_id';

  // null means "My Forms" (super admin's personal forms)
  // number means a specific organization ID
  private selectedOrgIdSubject = new BehaviorSubject<number | null>(this.loadSelectedOrgId());

  selectedOrgId$: Observable<number | null> = this.selectedOrgIdSubject.asObservable();

  constructor() { }

  /**
   * Get the currently selected organization ID
   */
  getSelectedOrgId(): number | null {
    return this.selectedOrgIdSubject.value;
  }

  /**
   * Set the selected organization ID
   * @param orgId - Organization ID or null for super admin's personal forms
   */
  setSelectedOrgId(orgId: number | null): void {
    this.selectedOrgIdSubject.next(orgId);
    this.saveSelectedOrgId(orgId);
  }

  /**
   * Clear the selected organization (switch to personal forms)
   */
  clearSelection(): void {
    this.setSelectedOrgId(null);
  }

  /**
   * Load the selected organization ID from localStorage
   */
  private loadSelectedOrgId(): number | null {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored || stored === 'null') {
      return null;
    }
    const parsed = parseInt(stored, 10);
    return isNaN(parsed) ? null : parsed;
  }

  /**
   * Save the selected organization ID to localStorage
   */
  private saveSelectedOrgId(orgId: number | null): void {
    if (orgId === null) {
      localStorage.setItem(this.STORAGE_KEY, 'null');
    } else {
      localStorage.setItem(this.STORAGE_KEY, orgId.toString());
    }
  }
}
