import Decimal from 'decimal.js';

export interface Transaction {
  id?: string;
  user_id?: string;
  type: 'income' | 'expense';
  amount: Decimal;
  category: string;
  description?: string;
  date: Date;

  // AI Smart Audit Fields (เตรียมไว้สำหรับ AI)
  verdict?: 'green' | 'yellow' | 'red';
  reason?: string;
}