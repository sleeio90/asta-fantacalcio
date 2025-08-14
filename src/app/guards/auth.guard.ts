import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    return this.authService.user$.pipe(
      take(1),
      map(user => {
        if (!user) {
          // User not authenticated
          this.router.navigate(['/login']);
          return false;
        }

        // Check if route requires admin role
        const requiredRole = route.data['role'] as string;
        if (requiredRole && requiredRole === 'admin' && user.role !== 'admin') {
          // User is not admin, redirect to auction table (player view)
          this.router.navigate(['/auction-table']);
          return false;
        }

        return true;
      })
    );
  }
}

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> {
    return this.authService.user$.pipe(
      take(1),
      map(user => {
        if (!user) {
          this.router.navigate(['/login']);
          return false;
        }

        if (user.role !== 'admin') {
          this.router.navigate(['/auction-table']);
          return false;
        }

        return true;
      })
    );
  }
}

@Injectable({
  providedIn: 'root'
})
export class LoginGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> {
    return this.authService.user$.pipe(
      take(1),
      map(user => {
        if (user) {
          // User is already logged in, redirect based on role
          if (user.role === 'admin') {
            this.router.navigate(['/home']);
          } else {
            this.router.navigate(['/auction-table']);
          }
          return false;
        }
        return true;
      })
    );
  }
}
