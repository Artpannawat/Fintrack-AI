import { Injectable } from '@angular/core';
import { User } from '@supabase/supabase-js';
import { BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router';
import { supabase } from '../init-supabase';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private router: Router) {
    this.loadUser();

    supabase.auth.onAuthStateChange((event, session) => {
      this.currentUserSubject.next(session?.user || null);
      if (event === 'SIGNED_IN') {
        this.router.navigate(['/']);
      } else if (event === 'SIGNED_OUT') {
        this.router.navigate(['/login']);
      }
    });
  }

  get client() {
    return supabase;
  }

  private async loadUser() {
    const { data } = await supabase.auth.getSession();
    this.currentUserSubject.next(data.session?.user || null);
  }

  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  async signInWithGoogle() {
    console.log('Login button clicked!');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'http://localhost:4200'
        }
      });

      if (error) {
        alert('Auth Error: ' + error.message);
        console.error('Login error:', error);
      }
    } catch (err: any) {
      alert('Unexpected Error: ' + (err?.message || 'Unknown'));
      console.error('Unexpected login error:', err);
    }
  }

  async signOut() {
    await supabase.auth.signOut();
    this.router.navigate(['/login']);
  }
}
