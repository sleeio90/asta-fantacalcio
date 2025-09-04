import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export class PasswordValidator {
  
  static strongPassword(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      
      if (!value) {
        return null; // Don't validate empty values to allow optional controls
      }

      const hasMinLength = value.length >= 8;
      const hasUpperCase = /[A-Z]/.test(value);
      const hasLowerCase = /[a-z]/.test(value);
      const hasNumeric = /[0-9]/.test(value);
      const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value);

      const passwordValid = hasMinLength && hasUpperCase && hasLowerCase && hasNumeric && hasSpecialChar;

      return !passwordValid ? {
        strongPassword: {
          hasMinLength,
          hasUpperCase,
          hasLowerCase,
          hasNumeric,
          hasSpecialChar
        }
      } : null;
    };
  }

  static confirmPassword(passwordControlName: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const password = control.parent?.get(passwordControlName);
      const confirmPassword = control;

      if (!password || !confirmPassword) {
        return null;
      }

      return password.value !== confirmPassword.value ? { confirmPassword: true } : null;
    };
  }

  static getPasswordStrength(password: string): {
    score: number;
    label: string;
    color: string;
    requirements: {
      minLength: boolean;
      hasUpperCase: boolean;
      hasLowerCase: boolean;
      hasNumeric: boolean;
      hasSpecialChar: boolean;
    }
  } {
    if (!password) {
      return {
        score: 0,
        label: 'Inserisci una password',
        color: '#ccc',
        requirements: {
          minLength: false,
          hasUpperCase: false,
          hasLowerCase: false,
          hasNumeric: false,
          hasSpecialChar: false
        }
      };
    }

    const requirements = {
      minLength: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumeric: /[0-9]/.test(password),
      hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    };

    const score = Object.values(requirements).filter(Boolean).length;

    const strengthMap = {
      0: { label: 'Molto debole', color: '#f44336' },
      1: { label: 'Molto debole', color: '#f44336' },
      2: { label: 'Debole', color: '#ff9800' },
      3: { label: 'Discreta', color: '#ffeb3b' },
      4: { label: 'Forte', color: '#8bc34a' },
      5: { label: 'Molto forte', color: '#4caf50' }
    };

    return {
      score,
      label: strengthMap[score as keyof typeof strengthMap].label,
      color: strengthMap[score as keyof typeof strengthMap].color,
      requirements
    };
  }
}
