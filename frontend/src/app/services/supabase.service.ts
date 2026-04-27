import { Injectable } from '@angular/core';
import { inject } from '@angular/core';
import { Transaction } from '../models/transaction.model';
import Decimal from 'decimal.js';
import { AuthService } from './auth.service';
import { supabase } from '../init-supabase';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private authService = inject(AuthService);

  private get supabase() {
    return supabase;
  }

  constructor() {}

  async getTransactions(): Promise<Transaction[]> {
    const user = this.authService.currentUser;
    if (!user) return [];

    const { data, error } = await this.supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }

    // แปลงจำนวนเงินให้เป็น Decimal.js เพื่อความแม่นยำ 100% (ป้องกันค่า null)
    return (data || []).map(item => ({
      ...item,
      amount: new Decimal(item.amount || 0),
      date: new Date(item.date || new Date())
    })) as Transaction[];
  }

  async addTransaction(transaction: Omit<Transaction, 'id'>): Promise<Transaction> {
    // แปลง Decimal กลับเป็น number เพื่อบันทึกลง Supabase
    const user = this.authService.currentUser;
    if (!user) throw new Error('User not authenticated');

    const payload = {
      ...transaction,
      amount: transaction.amount.toNumber(),
      user_id: user.id
    };

    const { data, error } = await this.supabase
      .from('transactions')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error('Error adding transaction:', error);
      throw error;
    }

    return {
      ...data,
      amount: new Decimal(data.amount || 0),
      date: new Date(data.date || new Date())
    } as Transaction;
  }
  async updateTransaction(id: string, changes: Partial<Omit<Transaction, 'id' | 'amount'>> & { amount?: Decimal }): Promise<Transaction> {
    const user = this.authService.currentUser;
    if (!user) throw new Error('User not authenticated');

    const payload: any = { ...changes };
    if (changes.amount) payload.amount = changes.amount.toNumber();

    const { data, error } = await this.supabase
      .from('transactions')
      .update(payload)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) { console.error('Error updating transaction:', error); throw error; }
    return { ...data, amount: new Decimal(data.amount || 0), date: new Date(data.date) } as Transaction;
  }

  async deleteTransaction(id: string): Promise<void> {
    const user = this.authService.currentUser;
    if (!user) throw new Error('User not authenticated');

    const { error } = await this.supabase
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) { console.error('Error deleting transaction:', error); throw error; }
  }
}
