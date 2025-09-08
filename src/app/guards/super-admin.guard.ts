import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { AdminPanelService } from '../services/admin-panel.service';

@Injectable({
  providedIn: 'root'
})
export class AdminPanelGuard implements CanActivate {
  constructor(
    private adminPanelService: AdminPanelService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | boolean {
    return this.adminPanelService.auth$.pipe(
      take(1),
      map(auth => {
        if (!auth.isAuthenticated) {
          // Non autenticato, redirect al login del pannello admin
          this.router.navigate(['/admin-panel/login']);
          return false;
        }

        return true;
      })
    );
  }
}
