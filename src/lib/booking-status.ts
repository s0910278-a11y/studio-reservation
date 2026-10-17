// Email delivery failure does not release an accepted reservation.
export function isActiveBookingStatus(status: unknown): boolean {
  return typeof status === 'string' &&
    (status === 'ACTIVE' || status.startsWith('ACTIVE (メール送信失敗:'));
}

export function normalizeBookingStatus(status: unknown): unknown {
  return isActiveBookingStatus(status) ? 'ACTIVE' : status;
}
