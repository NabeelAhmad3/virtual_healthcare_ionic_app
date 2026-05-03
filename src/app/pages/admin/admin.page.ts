import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FirestoreService } from '../../services/services/firestore';
import { FormsModule } from '@angular/forms';
import { AuthService } from 'src/app/services/services/auth';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, RouterModule],
  templateUrl: './admin.page.html',
  styleUrls: ['./admin.page.scss']
})
export class AdminPage implements OnInit {
  segment = 'appointments';
  allAppointments: any[] = [];
  patients: any[] = [];
  doctors: any[] = [];
  physiotherapists: any[] = [];
  editingAppt: any = null;
  selectedStatus = '';
  adminRole = 'admin';
  adminProfile: any = null;
  nurses: any[] = [];
  labTests: any[] = [];
  editingLabTest: any = null;
  updatingLabStatus = '';
  updatingLabResult = '';
  allMedicalRecords: any[] = [];
  filteredMedicalRecords: any[] = [];
  medicalRecordSearch = '';
  editingRecord: any = null;
  showRecordDetailModal = false;
  selectedRecordDetail: any = null;
  allMedicineOrders: any[] = [];
  filteredMedicineOrders: any[] = [];
  medicineOrderSearch = '';
  editingMedicineOrder: any = null;
  updatingOrderStatus = '';

  get totalAppointments() { return this.allAppointments.length; }
  get pendingCount() { return this.allAppointments.filter(a => a.status === 'pending').length; }
  get confirmedCount() { return this.allAppointments.filter(a => a.status === 'confirmed').length; }
  get completedCount() { return this.allAppointments.filter(a => a.status === 'completed').length; }
  
  get allStaff() { return [...this.doctors, ...this.physiotherapists, ...this.nurses]; }
  get totalLabTestsCount() { return this.labTests.length; }
  get totalMedicalRecors(){return this.allMedicalRecords.length;}

  get pendingLabTests() { return this.labTests.filter(t => t.status === 'pending').length; }
  get processingLabTests() { return this.labTests.filter(t => t.status === 'processing').length; }
  get completedLabTests() { return this.labTests.filter(t => t.status === 'completed').length; }

  get pendingMedicineOrders() { return this.allMedicineOrders.filter(o => o.status === 'pending').length; }
  get processingMedicineOrders() { return this.allMedicineOrders.filter(o => o.status === 'processing').length; }
  get completedMedicineOrders() { return this.allMedicineOrders.filter(o => o.status === 'completed').length; }

  recordTypes = [
    { value: 'general', label: 'General Checkup', icon: 'medical', color: 'primary' },
    { value: 'diagnosis', label: 'Diagnosis', icon: 'thermometer', color: 'danger' },
    { value: 'prescription', label: 'Prescription', icon: 'document-text', color: 'success' },
    { value: 'lab_result', label: 'Lab Result', icon: 'flask', color: 'tertiary' },
    { value: 'physiotherapy', label: 'Physiotherapy', icon: 'fitness', color: 'secondary' },
    { value: 'surgery', label: 'Surgery', icon: 'cut', color: 'warning' },
  ];

  constructor(private fs: FirestoreService, private authService: AuthService) { }

  ngOnInit() {
    this.adminProfile = this.authService.getCurrentUser();

    this.fs.getAllAppointments().subscribe(a => {
      this.allAppointments = a.sort((x: any, y: any) => {
        const dA = x.createdAt?.toDate?.() || new Date(0);
        const dB = y.createdAt?.toDate?.() || new Date(0);
        return dB.getTime() - dA.getTime();
      });
    });

    this.fs.getUsersByRole('patient').subscribe(p => this.patients = p);
    this.fs.getUsersByRole('doctor').subscribe(d => this.doctors = d);
    this.fs.getUsersByRole('physiotherapist').subscribe(p => this.physiotherapists = p);
    this.fs.getUsersByRole('nurse').subscribe(n => this.nurses = n);
    this.fs.getAllLabTests().subscribe(t => this.labTests = t);
    this.fs.getAllMedicineOrders().subscribe(orders => {
      this.allMedicineOrders = orders.sort((a, b) => {
        const dA = a.createdAt?.toDate?.() || new Date(0);
        const dB = b.createdAt?.toDate?.() || new Date(0);
        return dB.getTime() - dA.getTime();
      });
      this.filteredMedicineOrders = this.allMedicineOrders;
    });

    this.fs.getAllMedicalRecords().subscribe(records => {
      this.allMedicalRecords = records;
      this.filteredMedicalRecords = records;
    });
  }

  onMedicalRecordSearch() {
    const q = this.medicalRecordSearch.trim().toLowerCase();
    if (!q) {
      this.filteredMedicalRecords = this.allMedicalRecords;
      return;
    }
    this.filteredMedicalRecords = this.allMedicalRecords.filter(r =>
      r.patientName?.toLowerCase().includes(q) ||
      r.doctorName?.toLowerCase().includes(q) ||
      r.diagnosis?.toLowerCase().includes(q) ||
      r.recordType?.toLowerCase().includes(q)
    );
  }


  openRecordDetail(record: any) {
    this.selectedRecordDetail = record;
    this.showRecordDetailModal = true;
  }

  openEditRecord(record: any) {
    this.editingRecord = { ...record };
  }

  closeEditRecord() {
    this.editingRecord = null;
  }

  async saveEditRecord() {
    if (!this.editingRecord) return;
    try {
      await this.fs.updateMedicalRecord(this.editingRecord.id, {
        diagnosis: this.editingRecord.diagnosis,
        symptoms: this.editingRecord.symptoms,
        treatment: this.editingRecord.treatment,
        medications: this.editingRecord.medications,
        notes: this.editingRecord.notes,
        followUpDate: this.editingRecord.followUpDate,
        recordType: this.editingRecord.recordType,
      });
      this.closeEditRecord();
    } catch (e) {
      console.error('❌ Record update failed:', e);
    }
  }

  async deleteRecord(id: string) {
    if (!id) return;
    if (confirm('Delete this medical record? This cannot be undone.')) {
      try {
        await this.fs.deleteMedicalRecord(id);
      } catch (e) {
        console.error('❌ Delete failed:', e);
      }
    }
  }

  getRecordType(value: string) {
    return this.recordTypes.find(r => r.value === value) || this.recordTypes[0];
  }

  formatDate(date: any): string {
    if (!date) return '—';
    const d = date?.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  getDoctorRoleColor(role: string): string {
    switch (role) {
      case 'doctor': return 'tertiary';
      case 'physiotherapist': return 'secondary';
      case 'nurse': return 'success';
      default: return 'medium';
    }
  }

  getDoctorRoleLabel(role: string): string {
    switch (role) {
      case 'doctor': return 'Doctor';
      case 'physiotherapist': return 'Physiotherapist';
      case 'nurse': return 'Nurse';
      default: return 'Specialist';
    }
  }

  openEdit(appt: any) {
    this.editingAppt = { ...appt };
    this.selectedStatus = appt.status;
  }

  closeEdit() {
    this.editingAppt = null;
    this.selectedStatus = '';
  }

  async saveEdit() {
    if (!this.editingAppt || !this.selectedStatus) return;
    try {
      await this.fs.updateAppointmentStatus(this.editingAppt.id, this.selectedStatus, this.adminRole);
      this.closeEdit();
    } catch (e) {
      console.error('❌ Update failed:', e);
    }
  }

  async deleteAppointment(id: string) {
    if (!id) return;
    if (confirm('Delete this appointment?')) {
      try {
        await this.fs.deleteAppointment(id, this.adminRole);
      } catch (e) {
        console.error('❌ Delete failed:', e);
      }
    }
  }

  async deleteUser(uid: string) {
    if (!uid) return;
    if (confirm('Delete this user?')) {
      try {
        await this.fs.deleteUserFromFirestore(uid, this.adminRole);
      } catch (e) {
        console.error('❌ Delete failed:', e);
      }
    }
  }


  openEditLabTest(test: any) {
    this.editingLabTest = { ...test };
    this.updatingLabStatus = test.status;
    this.updatingLabResult = test.result || '';
  }

  closeEditLabTest() {
    this.editingLabTest = null;
    this.updatingLabStatus = '';
    this.updatingLabResult = '';
  }

  async saveLabEdit() {
    if (!this.editingLabTest) return;
    try {
      await this.fs.updateLabTestStatus(this.editingLabTest.id, this.updatingLabStatus, this.updatingLabResult);
      this.closeEditLabTest();
    } catch (e) {
      console.error('❌ Lab update failed:', e);
    }
  }

  async deleteLabTest(id: string) {
    if (!id) return;
    if (confirm('Delete this lab test?')) {
      try {
        await this.fs.deleteLabTest(id, this.adminRole);
      } catch (e) {
        console.error('❌ Delete failed:', e);
      }
    }
  }

  getStatusColor(status: string) {
    switch (status) {
      case 'pending': return 'warning';
      case 'confirmed': return 'primary';
      case 'completed': return 'success';
      case 'cancelled': return 'danger';
      default: return 'medium';
    }
  }

  getRoleIcon(role: string) {
    switch (role) {
      case 'doctor': return 'medkit';
      case 'physiotherapist': return 'fitness';
      case 'nurse': return 'heart-circle';
      default: return 'person-circle';
    }
  }

  getRoleColor(role: string) {
    switch (role) {
      case 'doctor': return 'tertiary';
      case 'physiotherapist': return 'secondary';
      case 'nurse': return 'success';
      default: return 'medium';
    }
  }

  async logout() {
    await this.authService.logout();
  }

  onMedicineOrderSearch() {
    const q = this.medicineOrderSearch.trim().toLowerCase();
    if (!q) {
      this.filteredMedicineOrders = this.allMedicineOrders;
      return;
    }
    this.filteredMedicineOrders = this.allMedicineOrders.filter(o =>
      o.patientName?.toLowerCase().includes(q) ||
      o.medicineName?.toLowerCase().includes(q) ||
      o.status?.toLowerCase().includes(q)
    );
  }

  openEditMedicineOrder(order: any) {
    this.editingMedicineOrder = { ...order };
    this.updatingOrderStatus = order.status;
  }

  closeEditMedicineOrder() {
    this.editingMedicineOrder = null;
    this.updatingOrderStatus = '';
  }

  async saveEditMedicineOrder() {
    if (!this.editingMedicineOrder) return;
    try {
      await this.fs.updateMedicineOrderStatus(
        this.editingMedicineOrder.id,
        this.updatingOrderStatus
      );
      this.closeEditMedicineOrder();
    } catch (e) {
      console.error('❌ Order update failed:', e);
    }
  }

  async deleteMedicineOrder(id: string) {
    if (!id) return;
    if (confirm('Delete this medicine order?')) {
      try {
        await this.fs.deleteMedicineOrder(id);
      } catch (e) {
        console.error('❌ Delete failed:', e);
      }
    }
  }

}