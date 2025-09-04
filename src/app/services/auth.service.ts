import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFireDatabase } from '@angular/fire/compat/database';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { switchMap, map, take } from 'rxjs/operators';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  role: 'admin' | 'player';
  createdAt: Date;
  emailVerified?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private userSubject = new BehaviorSubject<UserProfile | null>(null);
  private authLoadingSubject = new BehaviorSubject<boolean>(true);
  
  public user$ = this.userSubject.asObservable();
  public authLoading$ = this.authLoadingSubject.asObservable();

  constructor(
    private afAuth: AngularFireAuth,
    private db: AngularFireDatabase
  ) {
    // Monitor auth state changes
    this.afAuth.authState.pipe(
      switchMap(user => {
        if (user) {
          // User is logged in, fetch their profile
          return this.db.object<UserProfile>(`users/${user.uid}`).valueChanges();
        } else {
          // User is logged out
          this.authLoadingSubject.next(false); // Auth check completed
          return of(null);
        }
      })
    ).subscribe(userProfile => {
      this.userSubject.next(userProfile);
      this.authLoadingSubject.next(false); // Auth check completed
    });
  }

  // Register new user
  async register(email: string, password: string, displayName: string, role: 'admin' | 'player' = 'player'): Promise<UserProfile> {
    try {
      const credential = await this.afAuth.createUserWithEmailAndPassword(email, password);
      if (!credential.user) {
        throw new Error('Failed to create user');
      }

      // Update the user's display name
      await credential.user.updateProfile({ displayName });

      // Send email verification with custom settings
      const actionCodeSettings = {
        url: window.location.origin + '/email-verification',
        handleCodeInApp: true
      };
      
      await credential.user.sendEmailVerification(actionCodeSettings);

      // Create user profile in database
      const userProfile: UserProfile = {
        uid: credential.user.uid,
        email: email,
        displayName: displayName,
        role: role,
        createdAt: new Date(),
        emailVerified: credential.user.emailVerified
      };

      // Save to database
      await this.db.object(`users/${credential.user.uid}`).set(userProfile);

      return userProfile;
    } catch (error: any) {
      console.error('Registration error:', error);
      
      // Provide user-friendly error messages
      if (error.code === 'auth/configuration-not-found') {
        throw new Error('Firebase Authentication non è configurato. Abilita Authentication nella Console Firebase.');
      } else if (error.code === 'auth/email-already-in-use') {
        throw new Error('Questa email è già registrata.');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Inserisci un indirizzo email valido.');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('La password deve essere di almeno 6 caratteri.');
      } else {
        throw new Error(error.message || 'Registrazione fallita. Riprova.');
      }
    }
  }

  // Sign in user
  async signIn(email: string, password: string): Promise<UserProfile | null> {
    try {
      const credential = await this.afAuth.signInWithEmailAndPassword(email, password);
      if (!credential.user) {
        throw new Error('Failed to sign in');
      }

      // Get user profile from database
      const userProfile = await this.db.object<UserProfile>(`users/${credential.user.uid}`).valueChanges().pipe(take(1)).toPromise();
      return userProfile || null;
    } catch (error: any) {
      console.error('Sign in error:', error);
      
      // Provide user-friendly error messages
      if (error.code === 'auth/configuration-not-found') {
        throw new Error('Firebase Authentication non è configurato. Abilita Authentication nella Console Firebase.');
      } else if (error.code === 'auth/user-not-found') {
        throw new Error('Nessun account trovato con questa email.');
      } else if (error.code === 'auth/wrong-password') {
        throw new Error('Password incorretta. Riprova.');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Inserisci un indirizzo email valido.');
      } else if (error.code === 'auth/user-disabled') {
        throw new Error('Questo account è stato disabilitato.');
      } else {
        throw new Error(error.message || 'Login fallito. Riprova.');
      }
    }
  }

  // Sign out user
  async signOut(): Promise<void> {
    try {
      await this.afAuth.signOut();
      this.userSubject.next(null);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  // Get current user
  getCurrentUser(): UserProfile | null {
    return this.userSubject.value;
  }

  // Check if user is admin
  isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'admin' || false;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  }

  // Get user role
  getUserRole(): 'admin' | 'player' | null {
    const user = this.getCurrentUser();
    return user?.role || null;
  }

  // Update user role (admin only)
  async updateUserRole(uid: string, newRole: 'admin' | 'player'): Promise<void> {
    if (!this.isAdmin()) {
      throw new Error('Solo gli admin possono aggiornare i ruoli utente');
    }

    try {
      await this.db.object(`users/${uid}`).update({ role: newRole });
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  }

  // Get all users (admin only)
  getAllUsers(): Observable<UserProfile[]> {
    if (!this.isAdmin()) {
      return of([]);
    }

    return this.db.list<UserProfile>('users').valueChanges();
  }

  // Reset password
  async resetPassword(email: string): Promise<void> {
    try {
      await this.afAuth.sendPasswordResetEmail(email);
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  }

  // Delete user account
  async deleteAccount(): Promise<void> {
    try {
      const user = await this.afAuth.currentUser;
      if (!user) {
        throw new Error('Nessun utente autenticato');
      }

      const uid = user.uid;

      // Prima elimina il profilo utente dal database
      await this.db.object(`users/${uid}`).remove();

      // Poi elimina l'account Firebase Auth
      await user.delete();

      // Reset dello stato locale
      this.userSubject.next(null);
      
      console.log('Account eliminato con successo');
    } catch (error: any) {
      console.error('Errore durante l\'eliminazione dell\'account:', error);
      
      // Gestione errori specifici
      if (error.code === 'auth/requires-recent-login') {
        throw new Error('REAUTH_REQUIRED');
      } else {
        throw new Error(error.message || 'Errore durante l\'eliminazione dell\'account');
      }
    }
  }

  // Send email verification
  async sendEmailVerification(): Promise<void> {
    try {
      const user = await this.afAuth.currentUser;
      if (!user) {
        throw new Error('Nessun utente autenticato');
      }

      if (user.emailVerified) {
        throw new Error('Email già verificata');
      }

      // Configurazione per l'email di verifica
      const actionCodeSettings = {
        url: window.location.origin + '/email-verification', // URL di callback
        handleCodeInApp: true
      };

      await user.sendEmailVerification(actionCodeSettings);
    } catch (error: any) {
      console.error('Errore durante l\'invio della verifica email:', error);
      
      if (error.code === 'auth/too-many-requests') {
        throw new Error('Troppe richieste. Riprova più tardi.');
      } else if (error.code === 'auth/user-not-found') {
        throw new Error('Utente non trovato. Effettua nuovamente il login.');
      } else if (error.code === 'auth/network-request-failed') {
        throw new Error('Errore di connessione. Controlla la tua connessione internet.');
      } else {
        throw new Error(error.message || 'Errore durante l\'invio dell\'email di verifica');
      }
    }
  }

  // Check if current user's email is verified
  async checkEmailVerified(): Promise<boolean> {
    try {
      const user = await this.afAuth.currentUser;
      if (!user) {
        return false;
      }

      // Reload user to get latest verification status
      await user.reload();
      
      // Update the user profile in database with current verification status
      const currentProfile = this.getCurrentUser();
      if (currentProfile && currentProfile.emailVerified !== user.emailVerified) {
        await this.db.object(`users/${user.uid}`).update({ 
          emailVerified: user.emailVerified 
        });
        
        // Update local state
        const updatedProfile = { ...currentProfile, emailVerified: user.emailVerified };
        this.userSubject.next(updatedProfile);
      }

      return user.emailVerified;
    } catch (error) {
      console.error('Errore durante il controllo della verifica email:', error);
      return false;
    }
  }

  // Get email verification status
  isEmailVerified(): boolean {
    const user = this.getCurrentUser();
    return user?.emailVerified || false;
  }

  // Apply action code (for email verification links)
  async applyActionCode(actionCode: string): Promise<void> {
    try {
      await this.afAuth.applyActionCode(actionCode);
      
      // Reload current user to update verification status
      const user = await this.afAuth.currentUser;
      if (user) {
        await user.reload();
        await this.checkEmailVerified();
      }
    } catch (error: any) {
      console.error('Errore durante l\'applicazione del codice di azione:', error);
      
      if (error.code === 'auth/invalid-action-code') {
        throw new Error('Codice di verifica non valido o scaduto');
      } else if (error.code === 'auth/expired-action-code') {
        throw new Error('Il codice di verifica è scaduto');
      } else {
        throw new Error(error.message || 'Errore durante la verifica');
      }
    }
  }

  // Verify action code info (to check what the code is for)
  async checkActionCode(actionCode: string): Promise<any> {
    try {
      return await this.afAuth.checkActionCode(actionCode);
    } catch (error: any) {
      console.error('Errore durante il controllo del codice di azione:', error);
      throw error;
    }
  }
}
