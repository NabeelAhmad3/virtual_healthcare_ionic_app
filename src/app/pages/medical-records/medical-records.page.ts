import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Auth } from '@angular/fire/auth';
import { AuthService } from '../../services/services/auth';
import { FirestoreService } from '../../services/services/firestore';

@Component({
  selector: 'app-medical-records',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, FormsModule],
  templateUrl: './medical-records.page.html',
  styleUrls: ['./medical-records.page.scss']
})
export class MedicalRecordsPage implements OnInit {
  profile: any = null;
  currentUser: any = null;
  isLoading = true;
  patients: any[] = [];
  filteredPatients: any[] = [];
  patientSearch = '';
  selectedPatient: any = null;
  patientRecords: any[] = [];
  showAddModal = false;
  isLoadingRecords = false;
  myRecords: any[] = [];
  selectedRecord: any = null;
  showRecordDetailModal = false;
  activeTab = 'records'; 
  
  newRecord = {
    diagnosis: '',
    symptoms: '',
    treatment: '',
    medications: '',
    notes: '',
    followUpDate: '',
    recordType: 'general'
  };

  recordTypes = [
    { value: 'general',       label: 'General Checkup',    icon: 'medical',           color: 'primary'   },
    { value: 'diagnosis',     label: 'Diagnosis',          icon: 'thermometer',       color: 'danger'    },
    { value: 'prescription',  label: 'Prescription',       icon: 'document-text',     color: 'success'   },
    { value: 'lab_result',    label: 'Lab Result',         icon: 'flask',             color: 'tertiary'  },
    { value: 'physiotherapy', label: 'Physiotherapy',      icon: 'fitness',           color: 'secondary' },
    { value: 'surgery',       label: 'Surgery',            icon: 'cut',               color: 'warning'   },
  ];

  constructor(
    private auth: Auth,
    private authService: AuthService,
    private fs: FirestoreService
  ) {}

  async ngOnInit() {
    this.auth.onAuthStateChanged(async user => {
      if (user) {
        this.currentUser = user;
        this.profile = await this.authService.getUserProfile(user.uid);

        if (this.isDoctor) {
          this.activeTab = 'patients';
          this.loadPatients();
        } else if (this.profile?.role === 'patient') {
          this.activeTab = 'records';
          this.loadMyRecords(user.uid);
        }
        this.isLoading = false;
      }
    });
  }

  get isDoctor(): boolean {
    return ['doctor', 'physiotherapist', 'nurse'].includes(this.profile?.role);
  }

  loadPatients() {
    this.fs.getPatients().subscribe(patients => {
      this.patients = patients;
      this.filteredPatients = patients;
    });
  }

  onPatientSearch() {
    const q = this.patientSearch.trim().toLowerCase();
    if (!q) {
      this.filteredPatients = this.patients;
      return;
    }
    this.filteredPatients = this.patients.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q)
    );
  }

  selectPatient(patient: any) {
    this.selectedPatient = patient;
    this.activeTab = 'records';
    this.isLoadingRecords = true;
    this.fs.getPatientMedicalRecords(patient.uid || patient.id).subscribe(records => {
      this.patientRecords = records;
      this.isLoadingRecords = false;
    });
  }

  backToPatients() {
    this.selectedPatient = null;
    this.patientRecords = [];
    this.activeTab = 'patients';
  }

  openAddModal() {
    this.newRecord = {
      diagnosis: '',
      symptoms: '',
      treatment: '',
      medications: '',
      notes: '',
      followUpDate: '',
      recordType: 'general'
    };
    this.showAddModal = true;
  }

  async addRecord() {
    if (!this.newRecord.diagnosis || !this.selectedPatient || !this.currentUser) return;

    const record = {
      patientId:    this.selectedPatient.uid || this.selectedPatient.id,
      patientName:  this.selectedPatient.name,
      doctorId:     this.currentUser.uid,
      doctorName:   this.profile?.name || 'Unknown',
      doctorRole:   this.profile?.role || 'doctor',
      diagnosis:    this.newRecord.diagnosis,
      symptoms:     this.newRecord.symptoms,
      treatment:    this.newRecord.treatment,
      medications:  this.newRecord.medications,
      notes:        this.newRecord.notes,
      followUpDate: this.newRecord.followUpDate,
      recordType:   this.newRecord.recordType,
      createdAt:    new Date()
    };

    await this.fs.addMedicalRecord(record);
    this.showAddModal = false;
    this.fs.getPatientMedicalRecords(this.selectedPatient.uid || this.selectedPatient.id)
      .subscribe(records => { this.patientRecords = records; });
  }

  loadMyRecords(uid: string) {
    this.fs.getPatientMedicalRecords(uid).subscribe(records => {
      this.myRecords = records;
    });
  }

  openRecordDetail(record: any) {
    this.selectedRecord = record;
    this.showRecordDetailModal = true;
  }

  getRecordType(value: string) {
    return this.recordTypes.find(r => r.value === value) || this.recordTypes[0];
  }

  formatDate(date: any): string {
    if (!date) return '—';
    const d = date?.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  getDoctorRoleLabel(role: string): string {
    switch (role) {
      case 'doctor':          return 'Doctor';
      case 'physiotherapist': return 'Physiotherapist';
      case 'nurse':           return 'Nurse';
      default:                return 'Specialist';
    }
  }

  getDoctorRoleIcon(role: string): string {
    switch (role) {
      case 'doctor':          return 'medkit';
      case 'physiotherapist': return 'fitness';
      case 'nurse':           return 'heart-circle';
      default:                return 'person-circle';
    }
  }

  getDoctorRoleColor(role: string): string {
    switch (role) {
      case 'doctor':          return 'tertiary';
      case 'physiotherapist': return 'secondary';
      case 'nurse':           return 'success';
      default:                return 'medium';
    }
  }
}