import { Injectable } from '@angular/core';
import { AngularFireDatabase } from '@angular/fire/compat/database';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface AppConfig {
  requireEmailVerification: boolean;
  maxParticipantsPerAuction: number;
  enableNotifications: boolean;
  // Aggiungi altre configurazioni qui in futuro
}

@Injectable({
  providedIn: 'root'
})
export class AppConfigService {
  private configSubject = new BehaviorSubject<AppConfig | null>(null);
  public config$ = this.configSubject.asObservable();

  private defaultConfig: AppConfig = {
    requireEmailVerification: environment.features.requireEmailVerification,
    maxParticipantsPerAuction: 20,
    enableNotifications: true
  };

  constructor(private db: AngularFireDatabase) {
    this.loadConfig();
  }

  private async loadConfig(): Promise<void> {
    try {
      // Carica la configurazione da Firebase, con fallback ai valori di default
      const configData = await this.db.object('/appConfig').valueChanges().pipe(take(1)).toPromise() as AppConfig;
      
      if (configData) {
        // Merge con i valori di default per assicurarsi che tutte le proprietà esistano
        const mergedConfig = { ...this.defaultConfig, ...configData };
        this.configSubject.next(mergedConfig);
      } else {
        // Se non c'è configurazione su Firebase, usa quella di default e salvala
        await this.saveConfig(this.defaultConfig);
        this.configSubject.next(this.defaultConfig);
      }
    } catch (error) {
      console.error('Errore durante il caricamento della configurazione:', error);
      // In caso di errore, usa la configurazione di default
      this.configSubject.next(this.defaultConfig);
    }
  }

  public getConfig(): AppConfig | null {
    return this.configSubject.value;
  }

  public async updateConfig(updates: Partial<AppConfig>): Promise<void> {
    const currentConfig = this.getConfig();
    if (!currentConfig) {
      throw new Error('Configurazione non caricata');
    }

    const newConfig = { ...currentConfig, ...updates };
    await this.saveConfig(newConfig);
    this.configSubject.next(newConfig);
  }

  private async saveConfig(config: AppConfig): Promise<void> {
    try {
      await this.db.object('/appConfig').set(config);
    } catch (error) {
      console.error('Errore durante il salvataggio della configurazione:', error);
      throw error;
    }
  }

  public isEmailVerificationRequired(): boolean {
    const config = this.getConfig();
    const result = config?.requireEmailVerification ?? this.defaultConfig.requireEmailVerification;
    console.log('AppConfigService - isEmailVerificationRequired:', result, 'Config:', config);
    return result;
  }

  public getMaxParticipants(): number {
    const config = this.getConfig();
    return config?.maxParticipantsPerAuction ?? this.defaultConfig.maxParticipantsPerAuction;
  }

  public areNotificationsEnabled(): boolean {
    const config = this.getConfig();
    return config?.enableNotifications ?? this.defaultConfig.enableNotifications;
  }

  // Metodo per resettare la configurazione ai valori di default
  public async resetToDefaults(): Promise<void> {
    await this.saveConfig(this.defaultConfig);
    this.configSubject.next(this.defaultConfig);
  }
}
