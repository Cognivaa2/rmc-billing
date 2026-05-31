export const fmtMoney = (v) =>
  v == null
    ? '—'
    : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(v);

export const fmtMoneyShort = (v) => {
  if (v == null) return '—';
  const num = Number(v);
  if (isNaN(num)) return '—';

  const sign = num < 0 ? '-' : '';
  const absNum = Math.abs(num);

  let formatted = '';
  if (absNum >= 10000000) {
    formatted = parseFloat((absNum / 10000000).toFixed(2)) + 'Cr';
  } else if (absNum >= 100000) {
    formatted = parseFloat((absNum / 100000).toFixed(2)) + 'L';
  } else if (absNum >= 1000) {
    formatted = parseFloat((absNum / 1000).toFixed(2)) + 'K';
  } else {
    formatted = parseFloat(absNum.toFixed(2));
  }

  return `${sign}₹${formatted}`;
};

export const fmtQty = (v) => (v == null ? '—' : `${Number(v).toLocaleString('en-IN')} m³`);

export const fmtDateTime = (d) => (d ? new Date(d).toLocaleString() : '—');
export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : '—');

export const statusBadge = (status) => {
  switch (status) {
    case 'PENDING':
      return 'badge-yellow';
    case 'APPROVED':
      return 'badge-blue';
    case 'DISPATCHED':
      return 'badge-blue';
    case 'SALE_AUTHORIZED':
      return 'badge-green';
    case 'INVOICED':
      return 'badge-green';
    case 'open':
      return 'badge-blue';
    case 'closed':
      return 'badge-gray';
    case 'verified':
      return 'badge-green';
    case 'submitted':
      return 'badge-blue';
    case 'rejected':
      return 'badge-red';
    case 'blocked':
      return 'badge-red';
    case 'hold':
      return 'badge-yellow';
    case 'good':
      return 'badge-green';
    default:
      return 'badge-gray';
  }
};
