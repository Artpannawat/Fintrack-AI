import { Component, inject, Input, Output, EventEmitter, signal, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';
import { Transaction } from '../../models/transaction.model';
import Decimal from 'decimal.js';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-edit-transaction-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="modal-overlay" (click)="onOverlayClick($event)">
      <div class="modal-panel glass-panel" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h3>✏️ แก้ไขรายการ</h3>
          <button class="modal-close" (click)="close.emit()">✕</button>
        </div>

        <form [formGroup]="editForm" (ngSubmit)="onSave()" class="edit-form">
          <div class="form-group">
            <label>ประเภท</label>
            <select formControlName="type" class="form-control">
              <option value="expense">รายจ่าย</option>
              <option value="income">รายรับ</option>
            </select>
          </div>

          <div class="form-group">
            <label>จำนวนเงิน (บาท)</label>
            <input type="number" formControlName="amount" class="form-control" min="0.01" step="0.01">
            <span *ngIf="editForm.get('amount')?.invalid && editForm.get('amount')?.touched" class="field-error">
              กรุณากรอกจำนวนเงินที่ถูกต้อง (มากกว่า 0)
            </span>
          </div>

          <div class="form-group">
            <label>หมวดหมู่</label>
            <select formControlName="category" class="form-control">
              <option *ngFor="let c of categories" [value]="c">{{ c }}</option>
            </select>
          </div>

          <div class="form-group">
            <label>รายละเอียด</label>
            <input type="text" formControlName="description" class="form-control" placeholder="รายละเอียด...">
          </div>

          <div class="modal-actions">
            <button type="button" class="btn-secondary" (click)="close.emit()" [disabled]="isSaving()">ยกเลิก</button>
            <button type="submit" class="btn-glow" [disabled]="editForm.invalid || isSaving()">
              {{ isSaving() ? '🤖 AI กำลังวิเคราะห์ใหม่...' : '💾 บันทึก' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed; inset: 0; z-index: 1000;
      background: rgba(0,0,0,0.65);
      backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center;
      animation: fadeIn 0.2s ease;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    .modal-panel {
      width: 100%; max-width: 480px;
      padding: 2rem; border-radius: 16px;
      animation: slideUp 0.25s ease;
    }
    @keyframes slideUp { from { transform: translateY(24px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

    .modal-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 1.5rem;
      h3 { margin: 0; font-size: 1.2rem; }
    }
    .modal-close {
      background: none; border: none; color: var(--text-secondary);
      font-size: 1.25rem; cursor: pointer; padding: 0.25rem 0.5rem;
      border-radius: 6px; transition: background 0.2s;
      &:hover { background: rgba(255,255,255,0.1); }
    }

    .edit-form { display: flex; flex-direction: column; gap: 1rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.35rem; }
    .form-group label { font-size: 0.85rem; color: var(--text-secondary); }
    .form-control {
      padding: 0.6rem 0.85rem;
      background: var(--bg-input, rgba(255,255,255,0.06));
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px; color: #f8fafc; font-size: 0.95rem;
      &:focus { outline: none; border-color: var(--primary-color); }
    }
    .field-error { font-size: 0.78rem; color: #f87171; }

    .modal-actions {
      display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 0.5rem;
    }
    .btn-secondary {
      padding: 0.6rem 1.2rem; border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.15);
      background: transparent; color: var(--text-secondary); cursor: pointer;
      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }
  `]
})
export class EditTransactionModalComponent implements OnChanges {
  @Input() transaction: Transaction | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private supabaseService = inject(SupabaseService);
  private http = inject(HttpClient);

  isSaving = signal(false);

  categories = ['Salary', 'Food', 'Transport', 'Bills', 'Entertainment', 'Other'];

  editForm = this.fb.group({
    type: ['expense'],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    category: ['', Validators.required],
    description: ['']
  });

  ngOnChanges(changes: SimpleChanges) {
    if (changes['transaction'] && this.transaction) {
      const t = this.transaction;
      this.editForm.patchValue({
        type: t.type || 'expense',
        amount: Math.abs(t.amount.toNumber()),
        category: t.category,
        description: t.description || ''
      });
    }
  }

  onOverlayClick(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains('modal-overlay')) {
      this.close.emit();
    }
  }

  async onSave() {
    if (this.editForm.invalid || !this.transaction?.id) return;
    this.isSaving.set(true);

    const formValue = this.editForm.value;
    const rawAmount = new Decimal(formValue.amount!);
    const amount = formValue.type === 'expense' ? rawAmount.negated() : rawAmount;

    // Re-analyze with AI if expense
    let verdict = this.transaction.verdict || 'yellow';
    let reason = this.transaction.reason || '';

    if (formValue.type === 'expense') {
      try {
        const aiResponse = await firstValueFrom(
          this.http.post<{ verdict: string; reason: string }>(
            `${environment.apiUrl}/analyze-transaction`,
            { description: formValue.description || 'Unknown', amount: rawAmount.toNumber(), category: formValue.category }
          )
        );
        verdict = aiResponse.verdict as any;
        reason = aiResponse.reason;
      } catch {
        console.warn('AI re-analysis skipped');
      }
    }

    try {
      await this.supabaseService.updateTransaction(this.transaction.id, {
        type: formValue.type as 'income' | 'expense',
        amount,
        category: formValue.category!,
        description: formValue.description || '',
        verdict: verdict as any,
        reason
      });
      this.saved.emit();
      this.close.emit();
    } catch (err) {
      console.error('Failed to update transaction', err);
    } finally {
      this.isSaving.set(false);
    }
  }
}
