import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/services/auth';
import { filter, take } from 'rxjs/operators';
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule,RouterModule],
  templateUrl: './login.page.html'
})
export class LoginPage {
  email = '';
  password = '';
  loading = false;
  error = '';

  constructor(private auth: AuthService, private router: Router) {}

async login() {
  this.loading = true;
  this.error = '';
  try {
    await this.auth.login(this.email, this.password);

    this.auth.currentUser$.pipe(
      filter(user => user !== null),
      take(1)
    ).subscribe(user => {
      if (user?.role === 'admin') {
        this.router.navigate(['/admin']);
      } else {
        this.router.navigate(['/home']);
      }
    });

  } catch (e: any) {
    this.error = e.message;
  } finally {
    this.loading = false;
  }
}
}