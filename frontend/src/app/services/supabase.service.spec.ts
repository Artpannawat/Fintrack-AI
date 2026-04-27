import { TestBed } from '@angular/core/testing';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import Decimal from 'decimal.js';
import { Transaction } from '../models/transaction.model';

describe('SupabaseService', () => {
  let service: SupabaseService;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  const mockUser = { id: 'test-user-123', email: 'test@example.com' } as any;

  const mockTransaction: Omit<Transaction, 'id'> = {
    type: 'expense',
    amount: new Decimal(-50),
    category: 'Food',
    description: 'ข้าวกะเพรา',
    date: new Date(),
    verdict: 'green',
    reason: 'ประหยัดมาก ชื่นชม!'
  };

  beforeEach(() => {
    authServiceSpy = jasmine.createSpyObj('AuthService', [], { currentUser: mockUser });

    TestBed.configureTestingModule({
      providers: [
        SupabaseService,
        { provide: AuthService, useValue: authServiceSpy }
      ]
    });

    service = TestBed.inject(SupabaseService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should throw error if user not authenticated on addTransaction', async () => {
    Object.defineProperty(authServiceSpy, 'currentUser', { get: () => null });
    await expectAsync(service.addTransaction(mockTransaction as any)).toBeRejectedWithError('User not authenticated');
  });

  it('should throw error if user not authenticated on deleteTransaction', async () => {
    Object.defineProperty(authServiceSpy, 'currentUser', { get: () => null });
    await expectAsync(service.deleteTransaction('some-id')).toBeRejectedWithError('User not authenticated');
  });
});
