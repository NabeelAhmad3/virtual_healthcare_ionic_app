import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Auth } from '@angular/fire/auth';
import { AuthService } from '../../services/services/auth';
import { FirestoreService } from '../../services/services/firestore';

@Component({
  selector: 'app-medicines',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, FormsModule],
  templateUrl: './medicines.page.html',
  styleUrls: ['./medicines.page.scss']
})
export class MedicinesPage implements OnInit {
  profile: any = null;
  currentUser: any = null;
  medicines: any[] = [];
  allOrders: any[] = [];
  filteredOrders: any[] = [];
  selectedOrderStatus = 'all';
  showAddMedicineModal = false;
  newMedicine = { name: '', description: '', price: 0, stock: 0, category: '' };
  showEditMedicineModal = false;
  editingMedicine: any = null;
  editMedicineForm = { name: '', description: '', price: 0, stock: 0, category: '' };
  availableMedicines: any[] = [];
  patientOrders: any[] = [];
  showOrderModal = false;
  selectedMedicine: any = null;
  orderForm = { quantity: 1, notes: '', date: new Date().toISOString().split('T')[0] };
  isLoading = true;
  activeTab = 'orders';
  readonly LOW_STOCK_THRESHOLD = 10;

  constructor(
    private auth: Auth,
    private authService: AuthService,
    private fs: FirestoreService
  ) { }

  async ngOnInit() {
    this.auth.onAuthStateChanged(async user => {
      if (user) {
        this.currentUser = user;
        this.profile = await this.authService.getUserProfile(user.uid);

        if (this.profile?.role === 'pharmacy') {
          this.activeTab = 'orders';
          this.loadPharmacyData();
        } else if (this.profile?.role === 'patient') {
          this.activeTab = 'browse';
          this.loadPatientData(user.uid);
        }
        this.isLoading = false;
      }
    });
  }

  loadPharmacyData() {
    this.fs.getMedicines().subscribe(meds => {
      this.medicines = meds;
    });
    this.fs.getAllMedicineOrders().subscribe(orders => {
      this.allOrders = orders.sort((a, b) => {
        const dA = a.createdAt?.toDate?.() || new Date(0);
        const dB = b.createdAt?.toDate?.() || new Date(0);
        return dB.getTime() - dA.getTime();
      });
      this.filterOrders();
    });
  }

  filterOrders() {
    this.filteredOrders = this.selectedOrderStatus === 'all'
      ? this.allOrders
      : this.allOrders.filter(o => o.status === this.selectedOrderStatus);
  }

  async addMedicine() {
    if (!this.newMedicine.name || this.newMedicine.price <= 0) return;
    await this.fs.addMedicine({ ...this.newMedicine });
    this.newMedicine = { name: '', description: '', price: 0, stock: 0, category: '' };
    this.showAddMedicineModal = false;
  }

  openEditModal(med: any) {
    this.editingMedicine = med;
    this.editMedicineForm = {
      name: med.name,
      description: med.description || '',
      price: med.price,
      stock: med.stock,
      category: med.category || ''
    };
    this.showEditMedicineModal = true;
  }

  async updateMedicine() {
    if (!this.editingMedicine || !this.editMedicineForm.name) return;
    await this.fs.updateMedicine(this.editingMedicine.id, {
      name: this.editMedicineForm.name,
      description: this.editMedicineForm.description,
      price: Number(this.editMedicineForm.price),
      stock: Number(this.editMedicineForm.stock),
      category: this.editMedicineForm.category
    });
    this.showEditMedicineModal = false;
    this.editingMedicine = null;
  }

  async deleteMedicine(id: string) {
    await this.fs.deleteMedicine(id);
  }

  async updateOrderStatus(orderId: string, status: string) {
    await this.fs.updateMedicineOrderStatus(orderId, status);
  }

  loadPatientData(uid: string) {
    this.fs.getMedicines().subscribe(meds => {
      // Show ALL medicines sorted: ok → low → out
      this.availableMedicines = [...meds].sort((a, b) => {
        const rank: Record<string, number> = { ok: 0, low: 1, out: 2 };
        return rank[this.getStockStatus(a.stock)] - rank[this.getStockStatus(b.stock)];
      });
    });

    this.fs.getPatientMedicineOrders(uid).subscribe(orders => {
      this.patientOrders = orders.sort((a, b) => {
        const dA = a.createdAt?.toDate?.() || new Date(0);
        const dB = b.createdAt?.toDate?.() || new Date(0);
        return dB.getTime() - dA.getTime();
      });
    });
  }

  openOrderModal(medicine: any) {
    if (medicine.stock <= 0) return;
    this.selectedMedicine = medicine;
    this.orderForm = {
      quantity: 1,
      notes: '',
      date: new Date().toISOString().split('T')[0]
    };
    this.showOrderModal = true;
  }

  onQuantityChange(event: any) {
    // Force parse to integer — this is the key fix
    const raw = event?.detail?.value ?? event?.target?.value ?? '';
    const parsed = parseInt(String(raw), 10);
    this.orderForm.quantity = isNaN(parsed) ? 0 : parsed;
  }

  get orderQuantityError(): string | null {
    if (!this.selectedMedicine) return null;
    const qty = this.orderForm.quantity;
    if (!qty || qty < 1) return 'Quantity must be at least 1.';
    if (qty > this.selectedMedicine.stock) {
      return `Only ${this.selectedMedicine.stock} unit(s) available in stock.`;
    }
    return null;
  }

  get isOrderFormValid(): boolean {
    return (
      this.orderQuantityError === null &&
      !!this.orderForm.date &&
      this.orderForm.quantity >= 1
    );
  }

  get orderTotal(): number {
    if (!this.selectedMedicine) return 0;
    return (this.selectedMedicine.price || 0) * (this.orderForm.quantity || 0);
  }

  async placeOrder() {
    if (!this.selectedMedicine || !this.currentUser) return;
    if (!this.isOrderFormValid) return;

    const qty = Number(this.orderForm.quantity);

    const liveMed = this.availableMedicines.find(m => m.id === this.selectedMedicine.id);
    const availableStock = liveMed?.stock ?? this.selectedMedicine.stock;

    if (qty > availableStock || qty < 1) return;

    const order = {
      medicineId: this.selectedMedicine.id,
      medicineName: this.selectedMedicine.name,
      patientId: this.currentUser.uid,
      patientName: this.profile?.name || 'Unknown',
      quantity: qty,
      notes: this.orderForm.notes,
      date: this.orderForm.date,
      status: 'pending',
      price: this.selectedMedicine.price * qty,
      createdAt: new Date()
    };

    await this.fs.placeMedicineOrder(order);
    await this.fs.updateMedicine(this.selectedMedicine.id, {
      stock: availableStock - qty
    });

    this.showOrderModal = false;
    this.loadPatientData(this.currentUser.uid);
  }

  getStockStatus(stock: number): 'out' | 'low' | 'ok' {
    if (stock <= 0) return 'out';
    if (stock <= this.LOW_STOCK_THRESHOLD) return 'low';
    return 'ok';
  }

  getStockColor(stock: number): string {
    const s = this.getStockStatus(stock);
    if (s === 'out') return 'danger';
    if (s === 'low') return 'warning';
    return 'primary';
  }

  getStockLabel(stock: number): string {
    const s = this.getStockStatus(stock);
    if (s === 'out') return '❌ Out of Stock';
    if (s === 'low') return `⚠️ Low Stock: ${stock} left`;
    return `In Stock: ${stock}`;
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'pending': return 'warning';
      case 'processing': return 'primary';
      case 'completed': return 'success';
      case 'cancelled': return 'danger';
      default: return 'medium';
    }
  }

  getCategoryIcon(category: string): string {
    switch (category?.toLowerCase()) {
      case 'antibiotic': return 'shield-checkmark';
      case 'painkiller': return 'bandage';
      case 'vitamin': return 'sunny';
      case 'cardiac': return 'heart';
      default: return 'medkit';
    }
  }
}