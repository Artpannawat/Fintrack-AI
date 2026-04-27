import { Component, inject, EventEmitter, Output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../services/supabase.service';
import Decimal from 'decimal.js';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-transaction-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './transaction-form.component.html',
  styleUrls: ['./transaction-form.component.scss']
})
export class TransactionFormComponent {
  private fb = inject(FormBuilder);
  private supabaseService = inject(SupabaseService);
  private http = inject(HttpClient);

  @Output() transactionAdded = new EventEmitter<void>();

  isLoading = signal(false);

  transactionForm = this.fb.group({
    type: ['expense', Validators.required],
    amount: [null, [Validators.required, Validators.min(0.01)]],
    category: ['', Validators.required],
    description: ['']
  });

  categories = [
    'Salary', 'Food', 'Transport', 'Bills', 'Entertainment', 'Other'
  ];

  async onSubmit() {
    if (this.transactionForm.invalid) {
      this.transactionForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);

    const formValue = this.transactionForm.value;
    
    // Calculate Amount based on Type
    const rawAmount = new Decimal(formValue.amount!);
    const amount = formValue.type === 'expense' ? rawAmount.negated() : rawAmount;

    let verdict = 'green';
    let reason = '';

    if (formValue.type === 'expense') {
      try {
        const aiResponse = await firstValueFrom(this.http.post<{verdict: string, reason: string}>(`${environment.apiUrl}/analyze-transaction`, {
          description: formValue.description || 'Unknown',
          amount: rawAmount.toNumber(),
          category: formValue.category
        }));
        verdict = aiResponse.verdict;
        reason = aiResponse.reason;
      } catch (err: any) {
        const status = err?.status;
        if (status === 429 || status === 500) {
          console.warn('[AI] Quota exceeded or server error, saving with default verdict.');
          verdict = 'yellow';
          reason = '🧠 AI กำลังพักสมอง ลองถามใหม่ทีหลังนะครับ...';
        } else {
          console.error('Failed to get AI analysis', err);
          verdict = 'yellow';
        }
      }
    }

    const newTransaction = {
      type: formValue.type as 'income' | 'expense',
      amount,
      category: formValue.category!,
      description: formValue.description || '',
      date: new Date(),
      verdict: verdict as 'green' | 'yellow' | 'red',
      reason
    };

    try {
      await this.supabaseService.addTransaction(newTransaction);
      this.transactionForm.reset({ type: 'expense', category: '', description: '' });
      this.transactionAdded.emit();
    } catch (error) {
      console.error('Failed to add transaction', error);
    } finally {
      this.isLoading.set(false);
    }
  }
}
