import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { AuthService } from '../../services/services/auth';
import { FirestoreService } from '../../services/services/firestore';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule],
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss']
})
export class HomePage implements OnInit {
  profile: any = null;
  appointments: any[] = [];
  confirmCount = 0;
  completedCount = 0;
  pendingCount = 0;
  quickActions: any[] = [];

  allQuickActions = [
    { title: 'Find Doctors', icon: 'medical', route: '/doctors', color: 'primary', roles: ['patient'] },
    { title: 'My Appointments', icon: 'calendar', route: '/appointments', color: 'success', roles: ['patient', 'doctor', 'physiotherapist'] },
    { title: 'My Profile', icon: 'person-circle', route: '/profile', color: 'warning', roles: ['patient', 'doctor', 'physiotherapist'] },
  ];

  healthTips = [
    { tip: '💧 Drink at least 8 glasses of water daily.' },
    { tip: '🚶 Walk 30 minutes every day for better health.' },
    { tip: '😴 Get 7-8 hours of sleep each night.' },
    { tip: '🥦 Eat more vegetables and fruits daily.' },
  ];

  constructor(
    private auth: Auth,
    private authService: AuthService,
    private fs: FirestoreService,
    private router: Router
  ) { }

async ngOnInit() {
  this.auth.onAuthStateChanged(async user => {
    if (user) {
      this.profile = await this.authService.getUserProfile(user.uid);

      this.quickActions = this.allQuickActions.filter(a =>
        a.roles.includes(this.profile?.role)
      );

      if (this.profile?.role === 'admin') {
        this.router.navigate(['/admin']);
        return;
      }

      const role = this.profile?.role;
      const appts$ = (role === 'doctor' || role === 'physiotherapist')
        ? this.fs.getDoctorAppointments(user.uid)
        : this.fs.getPatientAppointments(user.uid);

      appts$.subscribe(appts => {
        const sorted = appts.sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(0);
          const dateB = b.createdAt?.toDate?.() || new Date(0);
          return dateB.getTime() - dateA.getTime();
        });
        this.appointments   = sorted.slice(0, 3);
        this.pendingCount   = sorted.filter(a => a.status === 'pending').length;
        this.completedCount = sorted.filter(a => a.status === 'completed').length;
        this.confirmCount = sorted.filter(a => a.status === 'confirmed').length;
      });
    }
  });
}
}