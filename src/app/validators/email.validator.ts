import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export class EmailValidator {
  
  /**
   * Validatore email più rigoroso che controlla:
   * - Formato email valido
   * - Domini comuni
   * - Caratteri non consentiti
   * - Lunghezza massima
   */
  static strictEmail(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null; // Se vuoto, lascia che required gestisca
      }

      const email: string = control.value.toLowerCase().trim();
      
      // Regex più rigorosa per email
      const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
      
      if (!emailRegex.test(email)) {
        return { invalidEmail: { message: 'Formato email non valido' } };
      }

      // Controlla lunghezza massima
      if (email.length > 254) {
        return { invalidEmail: { message: 'Email troppo lunga (max 254 caratteri)' } };
      }

      // Controlla che non inizi o finisca con punto
      if (email.startsWith('.') || email.endsWith('.')) {
        return { invalidEmail: { message: 'L\'email non può iniziare o finire con un punto' } };
      }

      // Controlla punti consecutivi
      if (email.includes('..')) {
        return { invalidEmail: { message: 'L\'email non può contenere punti consecutivi' } };
      }

      // Parte locale (prima della @)
      const localPart = email.split('@')[0];
      if (localPart.length > 64) {
        return { invalidEmail: { message: 'La parte prima della @ è troppo lunga (max 64 caratteri)' } };
      }

      // Controlla domini sospetti o non validi
      const domain = email.split('@')[1];
      if (!domain || domain.length < 3) {
        return { invalidEmail: { message: 'Dominio email non valido' } };
      }

      // Lista di domini temporanei/sospetti da bloccare (opzionale)
      const blockedDomains = [
        '10minutemail.com',
        'tempmail.org',
        'guerrillamail.com',
        'mailinator.com',
        'trashmail.com'
      ];

      if (blockedDomains.includes(domain)) {
        return { invalidEmail: { message: 'Email temporanee non sono consentite' } };
      }

      // Controlla che il dominio abbia almeno un punto
      if (!domain.includes('.')) {
        return { invalidEmail: { message: 'Dominio email non valido' } };
      }

      // Controlla che l'estensione del dominio sia valida (almeno 2 caratteri)
      const domainParts = domain.split('.');
      const tld = domainParts[domainParts.length - 1];
      if (tld.length < 2) {
        return { invalidEmail: { message: 'Estensione dominio non valida' } };
      }

      return null; // Email valida
    };
  }

  /**
   * Validatore asincrono per controllare se l'email esiste già (opzionale)
   * Da implementare se si vuole controllare nel database
   */
  static emailExists() {
    // Placeholder per validazione asincrona
    // Potrebbe fare una chiamata al backend per verificare se l'email esiste già
    return null;
  }

  /**
   * Fornisce suggerimenti per email comuni con errori di battitura
   */
  static getEmailSuggestion(email: string): string | null {
    if (!email || !email.includes('@')) return null;

    const domain = email.split('@')[1]?.toLowerCase();
    
    const commonDomainSuggestions: { [key: string]: string } = {
      'gmial.com': 'gmail.com',
      'gmai.com': 'gmail.com',
      'gmail.co': 'gmail.com',
      'gmail.coom': 'gmail.com',
      'hotmial.com': 'hotmail.com',
      'hotmai.com': 'hotmail.com',
      'hotmail.co': 'hotmail.com',
      'yahooo.com': 'yahoo.com',
      'yahoo.co': 'yahoo.com',
      'yahoo.coom': 'yahoo.com',
      'outlok.com': 'outlook.com',
      'outlook.co': 'outlook.com'
    };

    if (domain && commonDomainSuggestions[domain]) {
      const localPart = email.split('@')[0];
      return `${localPart}@${commonDomainSuggestions[domain]}`;
    }

    return null;
  }
}
