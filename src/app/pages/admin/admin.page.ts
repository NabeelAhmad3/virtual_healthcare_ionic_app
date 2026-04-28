import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FirestoreService } from '../../services/services/firestore';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule],
  templateUrl: './admin.page.html'
})
export class AdminPage implements OnInit {
  segment = 'appointments';
  allAppointments: any[] = [];
  patients: any[] = [];
  doctors: any[] = [];
  physiotherapists: any[] = [];

  get totalAppointments() { return this.allAppointments.length; }
  get pendingCount()  { return this.allAppointments.filter(a => a.status === 'pending').length; }
  get completedCount(){ return this.allAppointments.filter(a => a.status === 'completed').length; }

  constructor(private fs: FirestoreService) {}

  ngOnInit() {
    this.fs.getAllAppointments().subscribe(a => this.allAppointments = a);
    this.fs.getUsersByRole('patient').subscribe(p => this.patients = p);
    this.fs.getUsersByRole('doctor').subscribe(d => this.doctors = d);
    this.fs.getUsersByRole('physiotherapist').subscribe(p => this.physiotherapists = p);
  }

  async updateStatus(id: string, status: string) {
    await this.fs.updateAppointmentStatus(id, status);
  }

  async deleteUser(uid: string) {
    if (confirm('Are you sure you want to delete this user?')) {
      await this.fs.deleteUserFromFirestore(uid);
    }
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