import { onlyDigits, brDateToIso } from "./masks";

export function isValidCpf(value: string): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(cpf[i]) * (10 - i);
  let d1 = (sum * 10) % 11;
  if (d1 === 10) d1 = 0;
  if (d1 !== Number(cpf[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(cpf[i]) * (11 - i);
  let d2 = (sum * 10) % 11;
  if (d2 === 10) d2 = 0;
  return d2 === Number(cpf[10]);
}

export function isValidBrDateNotFuture(br: string): boolean {
  const iso = brDateToIso(br);
  if (!iso) return false;
  const d = new Date(`${iso}T00:00:00`);
  return d.getTime() <= Date.now();
}

// Luhn check (cartão de crédito). Permite 13–19 dígitos (Visa, Master, Amex etc.).
export function isValidCardNumber(value: string): boolean {
  const digits = onlyDigits(value);
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number(digits[i]);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

// MM/AA, mês 01-12, não-expirado.
export function isValidCardExpiry(value: string): boolean {
  const m = /^(\d{2})\/(\d{2})$/.exec(value);
  if (!m) return false;
  const mm = Number(m[1]);
  const yy = Number(m[2]);
  if (mm < 1 || mm > 12) return false;
  const now = new Date();
  const cardYear = 2000 + yy;
  const cardMonth = mm - 1;
  const cardDate = new Date(cardYear, cardMonth + 1, 0, 23, 59, 59);
  return cardDate.getTime() >= now.getTime();
}

export interface PasswordChecks {
  length: boolean;
  upper: boolean;
  lower: boolean;
  digit: boolean;
  special: boolean;
}

export function checkPassword(p: string): PasswordChecks {
  return {
    length: p.length >= 8,
    upper: /[A-Z]/.test(p),
    lower: /[a-z]/.test(p),
    digit: /\d/.test(p),
    special: /[^A-Za-z0-9]/.test(p),
  };
}

export function isStrongPassword(p: string): boolean {
  const c = checkPassword(p);
  return c.length && c.upper && c.lower && c.digit && c.special;
}
