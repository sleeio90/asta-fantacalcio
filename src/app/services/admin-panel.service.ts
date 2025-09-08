import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AdminPanelAuth {
  isAuthenticated: boolean;
  authenticatedAt?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class AdminPanelService {
  private authSubject = new BehaviorSubject<AdminPanelAuth>({ isAuthenticated: false });
  public auth$ = this.authSubject.asObservable();

  // Credenziali per il pannello amministrativo (hash SHA-256)
  // 🔐 PRODUZIONE: Password forte hashata con SHA-256
  // 🔄 Per cambiare password: 
  //    1. Modifica la password in generateProductionHash()
  //    2. Copia il nuovo hash dalla console
  //    3. Sostituisci passwordHash qui sotto
  //    4. Rimuovi generateProductionHash()
  private readonly ADMIN_CREDENTIALS = {
    username: 'admin',
    passwordHash: 'da9035b8a86079e974d3163eb3b7f3e9c712ea8042bced51012cbcb3e5d0af24',
  };

  // Durata della sessione (24 ore)
  private readonly SESSION_DURATION = 24 * 60 * 60 * 1000;

  constructor() {
    this.checkExistingSession();
    
    // TEMPORANEO: Solo per generare l'hash della password di produzione
    // Rimuovere dopo aver ottenuto l'hash
    // this.generateProductionHash();
  }

  private async hashPassword(password: string): Promise<string> {
    // Usa l'API Web Crypto per SHA-256
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Metodo helper per generare hash di nuove password (solo per sviluppo)
  async generateHashForPassword(password: string): Promise<string> {
    return await this.hashPassword(password);
  }

  private checkExistingSession(): void {
    const sessionData = localStorage.getItem('adminPanelSession');
    if (sessionData) {
      try {
        const session = JSON.parse(sessionData);
        const now = new Date().getTime();
        
        // Controlla se la sessione è ancora valida
        if (session.authenticatedAt && (now - new Date(session.authenticatedAt).getTime()) < this.SESSION_DURATION) {
          this.authSubject.next({
            isAuthenticated: true,
            authenticatedAt: new Date(session.authenticatedAt)
          });
        } else {
          // Sessione scaduta
          this.clearSession();
        }
      } catch (error) {
        console.error('Errore nel parsing della sessione admin:', error);
        this.clearSession();
      }
    }
  }

  async authenticate(username: string, password: string): Promise<boolean> {
    // Simula un piccolo delay per l'autenticazione
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      // Hash della password fornita
      const passwordHash = await this.hashPassword(password);
      
      if (username === this.ADMIN_CREDENTIALS.username && passwordHash === this.ADMIN_CREDENTIALS.passwordHash) {
        const auth: AdminPanelAuth = {
          isAuthenticated: true,
          authenticatedAt: new Date()
        };

        // Salva la sessione nel localStorage
        localStorage.setItem('adminPanelSession', JSON.stringify(auth));
        this.authSubject.next(auth);
        
        return true;
      }

      return false;
    } catch (error) {
      console.error('Errore durante l\'autenticazione:', error);
      return false;
    }
  }

  logout(): void {
    this.clearSession();
    this.authSubject.next({ isAuthenticated: false });
  }

  private clearSession(): void {
    localStorage.removeItem('adminPanelSession');
  }

  isAuthenticated(): boolean {
    return this.authSubject.value.isAuthenticated;
  }

  getSessionInfo(): AdminPanelAuth {
    return this.authSubject.value;
  }

  // Verifica se la sessione sta per scadere (meno di 1 ora rimasta)
  isSessionExpiringSoon(): boolean {
    const session = this.getSessionInfo();
    if (!session.isAuthenticated || !session.authenticatedAt) {
      return false;
    }

    const now = new Date().getTime();
    const sessionTime = new Date(session.authenticatedAt).getTime();
    const timeLeft = this.SESSION_DURATION - (now - sessionTime);
    
    return timeLeft < (60 * 60 * 1000); // Meno di 1 ora
  }

  // Estende la sessione corrente
  extendSession(): void {
    if (this.isAuthenticated()) {
      const auth: AdminPanelAuth = {
        isAuthenticated: true,
        authenticatedAt: new Date()
      };

      localStorage.setItem('adminPanelSession', JSON.stringify(auth));
      this.authSubject.next(auth);
    }
  }
}
