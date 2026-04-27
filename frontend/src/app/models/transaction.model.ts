import Decimal from 'decimal.js';

export type Verdict = 'green' | 'yellow' | 'red';

export interface Transaction {
  id?: string;
  user_id?: string;
  type?: 'income' | 'expense';
  amount: Decimal;
  category: string;
  date: Date;
  description?: string;
  verdict?: Verdict;
  reason?: string;
}
