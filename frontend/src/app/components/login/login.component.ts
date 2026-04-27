import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  private authService = inject(AuthService);
  
  isLoading = false;

  async loginWithGoogle() {
    console.log('Login button clicked!');
    this.isLoading = true;
    try {
      await this.authService.signInWithGoogle();
    } catch (error: any) {
      console.error('Login failed:', error);
      alert('Login failed: ' + (error?.message || 'Unknown error'));
      this.isLoading = false;
    }
  }
}
