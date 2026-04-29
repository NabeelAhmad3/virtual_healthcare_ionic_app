import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/services/auth';
import { map, take } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate {

  constructor(private auth: AuthService, private router: Router) {}

  canActivate() {
    return this.auth.currentUser$.pipe(
      take(1),
      map((user: any) => {
        if (user && user.role === 'admin') {
          return true;
        }
        this.router.navigate(['/home']);
        return false;
      })
    );
  }
}