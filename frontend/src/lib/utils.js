import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO } from 'date-fns';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style:    'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

export function formatDate(dateStr, fmt = 'MMM dd, yyyy') {
  if (!dateStr) return '—';
  try {
    return format(typeof dateStr === 'string' ? parseISO(dateStr) : dateStr, fmt);
  } catch {
    return dateStr;
  }
}

export function formatNumber(num, decimals = 2) {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num || 0);
}

export const INVOICE_STATUS_STYLES = {
  Draft:    'badge-muted',
  Sent:     'badge-info',
  Paid:     'badge-success',
  Overdue:  'badge-danger',
  Void:     'badge-muted',
};

export const BILL_STATUS_STYLES = {
  Draft:    'badge-muted',
  Received: 'badge-info',
  Paid:     'badge-success',
  Overdue:  'badge-danger',
  Void:     'badge-muted',
};

export function getInitials(name = '') {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();
}
