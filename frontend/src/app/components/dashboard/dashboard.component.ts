import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { SupabaseService } from '../../services/supabase.service';
import { Transaction } from '../../models/transaction.model';
import { MoneyUtility } from '../../utils/money.utility';
import Decimal from 'decimal.js';
import { LucideAngularModule, ArrowUpRight, ArrowDownRight, Activity, Brain, Clock, Pencil, Trash2 } from 'lucide-angular';
import { TransactionFormComponent } from '../transaction-form/transaction-form.component';
import { EditTransactionModalComponent } from '../edit-transaction-modal/edit-transaction-modal.component';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, BaseChartDirective, LucideAngularModule, TransactionFormComponent, EditTransactionModalComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  private supabaseService = inject(SupabaseService);
  private http = inject(HttpClient);

  transactions = signal<Transaction[]>([]);
  isLoading = signal<boolean>(true);

  // AI Behavior Analysis
  selectedRange = signal<'day' | 'week' | 'month' | 'year'>('month');
  isAnalyzing = signal(false);
  aiResult = signal<{ summary: string; tips: string[]; score: number; fallback?: boolean } | null>(null);
  cooldownSeconds = signal(0);
  private cooldownInterval: any = null;

  readonly ranges = [
    { key: 'day' as const,   label: 'วันนี้' },
    { key: 'week' as const,  label: 'สัปดาห์นี้' },
    { key: 'month' as const, label: 'เดือนนี้' },
    { key: 'year' as const,  label: 'ปีนี้' },
  ];

  // Icons
  readonly ArrowUpRight = ArrowUpRight;
  readonly ArrowDownRight = ArrowDownRight;
  readonly Activity = Activity;
  readonly Brain = Brain;
  readonly Clock = Clock;
  readonly Pencil = Pencil;
  readonly Trash2 = Trash2;

  // Edit / Delete state
  editTarget = signal<Transaction | null>(null);
  confirmDeleteId = signal<string | null>(null);
  isDeleting = signal(false);

  // Computed Values
  totalBalance = computed(() => {
    const total = this.transactions().reduce((acc, t) => {
      return acc.plus(t.amount || new Decimal(0));
    }, new Decimal(0));
    return MoneyUtility.format(total);
  });

  income = computed(() => {
    const total = this.transactions()
      .filter(t => t.amount && t.amount.isPos())
      .reduce((acc, t) => acc.plus(t.amount), new Decimal(0));
    return MoneyUtility.format(total);
  });

  expenses = computed(() => {
    const total = this.transactions()
      .filter(t => t.amount && t.amount.isNeg())
      .reduce((acc, t) => acc.plus(t.amount), new Decimal(0));
    return MoneyUtility.format(total);
  });

  // Chart configuration
  public pieChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    plugins: {
      legend: { display: true, position: 'bottom', labels: { color: '#f8fafc' } }
    }
  };
  public pieChartType: ChartType = 'pie';
  
  public pieChartData = computed<ChartData<'pie'>>(() => {
    const categories = new Map<string, Decimal>();
    
    this.transactions()
      .filter(t => t.amount && t.amount.isNeg())
      .forEach(t => {
        const cat = t.category || 'Other';
        const amount = t.amount.abs();
        categories.set(cat, (categories.get(cat) || new Decimal(0)).plus(amount));
      });

    const labels = Array.from(categories.keys());
    const data = Array.from(categories.values()).map(d => d.toNumber());

    return {
      labels: labels,
      datasets: [ { 
        data: data.length > 0 ? data : [0],
        backgroundColor: [
          '#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899'
        ],
        borderWidth: 0
      } ]
    };
  });

  async ngOnInit() {
    await this.loadTransactions();
  }

  ngOnDestroy() {
    if (this.cooldownInterval) clearInterval(this.cooldownInterval);
  }

  async loadTransactions() {
    this.isLoading.set(true);
    try {
      const data = await this.supabaseService.getTransactions();
      console.log('Data from Supabase:', data);
      this.transactions.set(data);
    } catch (error) {
      console.error('Failed to load transactions', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  setRange(range: 'day' | 'week' | 'month' | 'year') {
    this.selectedRange.set(range);
    this.aiResult.set(null);
  }

  getFilteredTransactions(): Transaction[] {
    const now = new Date();
    return this.transactions().filter(t => {
      const d = new Date(t.date);
      switch (this.selectedRange()) {
        case 'day':   return d.toDateString() === now.toDateString();
        case 'week':  { const diff = (now.getTime() - d.getTime()) / 86400000; return diff < 7; }
        case 'month': return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        case 'year':  return d.getFullYear() === now.getFullYear();
      }
    });
  }

  async analyzeNow() {
    if (this.cooldownSeconds() > 0 || this.isAnalyzing()) return;
    this.isAnalyzing.set(true);
    this.aiResult.set(null);
    try {
      const txPayload = this.getFilteredTransactions().map(t => ({
        amount: t.amount.toNumber(),
        category: t.category,
        description: t.description,
        date: t.date
      }));
      const result = await firstValueFrom(
        this.http.post<{ summary: string; tips: string[]; score: number; fallback?: boolean }>(
          `${environment.apiUrl}/analyze-behavior`,
          { transactions: txPayload, range: this.selectedRange() }
        )
      );
      this.aiResult.set(result);
      this.startCooldown(60);
    } catch (err) {
      console.error('Behavior analysis failed', err);
      this.aiResult.set({ summary: 'AI กำลังพักสมอง ลองใหม่ทีหลังนะครับ', tips: [], score: 0, fallback: true });
    } finally {
      this.isAnalyzing.set(false);
    }
  }

  private startCooldown(seconds: number) {
    this.cooldownSeconds.set(seconds);
    if (this.cooldownInterval) clearInterval(this.cooldownInterval);
    this.cooldownInterval = setInterval(() => {
      const remaining = this.cooldownSeconds() - 1;
      this.cooldownSeconds.set(remaining);
      if (remaining <= 0) clearInterval(this.cooldownInterval);
    }, 1000);
  }

  formatMoney(amount: Decimal) {
    return MoneyUtility.format(amount);
  }

  openEdit(t: Transaction) {
    this.editTarget.set(t);
  }

  requestDelete(id: string) {
    this.confirmDeleteId.set(id);
  }

  cancelDelete() {
    this.confirmDeleteId.set(null);
  }

  async confirmDelete() {
    const id = this.confirmDeleteId();
    if (!id) return;
    this.isDeleting.set(true);
    try {
      await this.supabaseService.deleteTransaction(id);
      await this.loadTransactions();
    } catch (err) {
      console.error('Delete failed', err);
    } finally {
      this.isDeleting.set(false);
      this.confirmDeleteId.set(null);
    }
  }
}
