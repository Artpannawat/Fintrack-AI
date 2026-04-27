import Decimal from 'decimal.js';

export class MoneyUtility {
  /**
   * Adds multiple amounts precisely.
   */
  static add(...amounts: (number | string | Decimal)[]): Decimal {
    return amounts.reduce((acc: Decimal, val) => acc.plus(new Decimal(val)), new Decimal(0));
  }

  /**
   * Subtracts an amount from the total.
   */
  static subtract(total: number | string | Decimal, amount: number | string | Decimal): Decimal {
    return new Decimal(total).minus(new Decimal(amount));
  }

  /**
   * Multiplies an amount (e.g., for percentage calculations).
   */
  static multiply(amount: number | string | Decimal, multiplier: number | string | Decimal): Decimal {
    return new Decimal(amount).times(new Decimal(multiplier));
  }

  /**
   * Formats a decimal amount to a standard currency string (e.g., 1,234.56).
   */
  static format(amount: number | string | Decimal, currencyCode: string = 'THB'): string {
    const value = new Decimal(amount).toNumber();
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(value);
  }
}
