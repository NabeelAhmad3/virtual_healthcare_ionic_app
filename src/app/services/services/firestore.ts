import { Injectable } from '@angular/core';
import {Firestore, collection, addDoc, collectionData, query, where, doc, updateDoc, getDocs} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class FirestoreService {
  constructor(private firestore: Firestore) {}

  getAllUsers(): Observable<any[]> {
    const ref = collection(this.firestore, 'users');
    return collectionData(ref, { idField: 'id' });
  }

  getUsersByRole(role: string): Observable<any[]> {
    const ref = collection(this.firestore, 'users');
    const q = query(ref, where('role', '==', role));
    return collectionData(q, { idField: 'id' });
  }

  getDoctors(): Observable<any[]> {
    return this.getUsersByRole('doctor');
  }

  getPhysiotherapists(): Observable<any[]> {
    return this.getUsersByRole('physiotherapist');
  }

  bookAppointment(data: {
    patientId: string;
    patientName: string;
    doctorId: string;
    doctorName: string;
    date: string;
    time: string;
    type: string;
    status: string;
  }) {
    return addDoc(collection(this.firestore, 'appointments'), {
      ...data,
      createdAt: new Date()
    });
  }

  getPatientAppointments(patientId: string): Observable<any[]> {
    const ref = collection(this.firestore, 'appointments');
    const q = query(ref, where('patientId', '==', patientId));
    return collectionData(q, { idField: 'id' });
  }

  getDoctorAppointments(doctorId: string): Observable<any[]> {
    const ref = collection(this.firestore, 'appointments');
    const q = query(ref, where('doctorId', '==', doctorId));
    return collectionData(q, { idField: 'id' });
  }

  getAllAppointments(): Observable<any[]> {
    const ref = collection(this.firestore, 'appointments');
    return collectionData(ref, { idField: 'id' });
  }

  updateAppointmentStatus(appointmentId: string, status: string) {
    const ref = doc(this.firestore, 'appointments', appointmentId);
    return updateDoc(ref, { status });
  }

  async deleteUserFromFirestore(uid: string) {
    const ref = doc(this.firestore, 'users', uid);
    const { deleteDoc } = await import('@angular/fire/firestore');
    return deleteDoc(ref);
  }
}