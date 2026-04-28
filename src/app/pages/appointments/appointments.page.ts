import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { FirestoreService } from '../../services/services/firestore';
import { AuthService } from '../../services/services/auth';

@Component({
  selector: 'app-appointments',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './appointments.page.html'
})
export class AppointmentsPage implements OnInit {
  specialist: any = null;
  date = '';
  time = '';
  loading = false;
  success = false;
  appointments: any[] = [];
  currentUser: any = null;
  userProfile: any = null;

  filterStatus = 'all';
  get filteredAppointments() {
    if (this.filterStatus === 'all') return this.appointments;
    return this.appointments.filter(a => a.status === this.filterStatus);
  }

  constructor(
    private router: Router,
    private auth: Auth,
    private authService: AuthService,
    private fs: FirestoreService
  ) {
    const nav = this.router.getCurrentNavigation();
    this.specialist = nav?.extras?.state?.['specialist'] || null;
  }

async ngOnInit() {
  this.auth.onAuthStateChanged(async user => {
    if (user) {
      this.currentUser = user;
      this.userProfile = await this.authService.getUserProfile(user.uid);
      this.loadAppointments();
    }
  });
}
loadAppointments() {
  const role = this.userProfile?.role;
  const uid  = this.currentUser?.uid;

  if (!role || !uid) {
    console.error('❌ role or uid is missing', { role, uid });
    return;
  }

  if (role === 'admin') {
    this.fs.getAllAppointments().subscribe(appts => {
      this.appointments = this.sortByDate(appts);
    });

  } else if (role === 'doctor' || role === 'physiotherapist') {
    this.fs.getDoctorAppointments(uid).subscribe(appts => {
      this.appointments = this.sortByDate(appts);
    });

  } else {
    this.fs.getPatientAppointments(uid).subscribe(appts => {
      this.appointments = this.sortByDate(appts);
    });
  }
}
  sortByDate(appts: any[]) {
    return appts.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(0);
      const dateB = b.createdAt?.toDate?.() || new Date(0);
      return dateB.getTime() - dateA.getTime();
    });
  }

  async book() {
    if (!this.date || !this.time || !this.specialist) return;
    this.loading = true;
    try {
      await this.fs.bookAppointment({
        patientId: this.currentUser.uid,
        patientName: this.userProfile?.name || 'Patient',
        doctorId: this.specialist.uid,
        doctorName: this.specialist.name,
        date: this.date,
        time: this.time,
        type: this.specialist.role,
        status: 'pending'
      });
      this.success = true;
      this.date = '';
      this.time = '';
      setTimeout(() => this.success = false, 3000);
    } catch (e) {
      console.error(e);
    } finally {
      this.loading = false;
    }
  }

  async updateStatus(appointmentId: string, status: string) {
    await this.fs.updateAppointmentStatus(appointmentId, status);
  }

  getStatusColor(status: string) {
    switch(status) {
      case 'pending':   return 'warning';
      case 'confirmed': return 'primary';
      case 'completed': return 'success';
      case 'cancelled': return 'danger';
      default:          return 'medium';
    }
  }
}