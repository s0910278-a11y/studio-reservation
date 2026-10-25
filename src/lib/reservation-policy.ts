export const RESERVATION_TERMS_VERSION = '2026-10-25.2';
export const RESERVATION_REVIEW_POLICY = { windowDays: 90, lateHours: 24, lateCount: 3, multiStudioDays: 2 } as const;

export type ReviewBooking = {
  bookingId: string; memberNo: string; studioId: string; date: string;
  startTime: string; endTime: string; status: string;
  registeredAt?: string; canceledAt?: string; cancellationSource?: string;
};
export type ReservationReview = {
  reasons: string[]; lateCancelCount: number; noShowCount: number; multiStudioReleaseDays: number;
  evidence: { bookingId: string; date: string; studio: string; time: string; canceledAt: string }[];
};

export function japanTimestamp(value: unknown): number {
  if (typeof value !== 'string' || !value.trim()) return NaN;
  const normalized = value.trim().replace(/\//g, '-').replace(' ', 'T');
  const zoned = /(?:Z|[+-]\d{2}:?\d{2})$/.test(normalized) ? normalized : normalized + '+09:00';
  return Date.parse(zoned);
}

// Review candidates, never an automatic ban. Missing historical timestamps are
// not guessed; staff cancellations do not count as customer late cancellations.
export function reviewReservationBehavior(memberNo: unknown, bookings: ReviewBooking[], now = Date.now()): ReservationReview {
  const key = String(memberNo || '').trim().toUpperCase();
  const result: ReservationReview = { reasons: [], lateCancelCount: 0, noShowCount: 0, multiStudioReleaseDays: 0, evidence: [] };
  if (!key || key === 'ADMIN' || key === 'GUEST') return result;
  const owned = bookings.filter(b => String(b.memberNo || '').trim().toUpperCase() === key);
  const since = now - RESERVATION_REVIEW_POLICY.windowDays * 86400000;
  const startOf = (b: ReviewBooking) => japanTimestamp(`${b.date.slice(0, 10)}T${b.startTime}:00`);
  const endOf = (b: ReviewBooking) => japanTimestamp(`${b.date.slice(0, 10)}T${b.endTime}:00`);
  const late = owned.filter(b => {
    const canceledAt = japanTimestamp(b.canceledAt);
    const untilStart = startOf(b) - canceledAt;
    return b.status.startsWith('CANCELED') && !b.status.includes('来店なし')
      && (b.cancellationSource || '').startsWith('お客様')
      && canceledAt >= since && canceledAt <= now
      && untilStart >= 0 && untilStart <= RESERVATION_REVIEW_POLICY.lateHours * 3600000;
  });
  result.lateCancelCount = late.length;
  result.noShowCount = owned.filter(b => b.status === 'CANCELED (来店なし)' && startOf(b) >= since && startOf(b) <= now).length;
  const releaseDays = new Set<string>();
  for (const booking of late) {
    const createdAt = japanTimestamp(booking.registeredAt);
    const canceledAt = japanTimestamp(booking.canceledAt);
    if (!Number.isFinite(createdAt) || createdAt > canceledAt) continue;
    const overlappingHold = owned.some(other => {
      if (other.bookingId === booking.bookingId || other.studioId === booking.studioId) return false;
      if (!['Studio A', 'Studio B'].includes(other.studioId) || !['Studio A', 'Studio B'].includes(booking.studioId)) return false;
      if (!(startOf(booking) < endOf(other) && endOf(booking) > startOf(other))) return false;
      const otherCreatedAt = japanTimestamp(other.registeredAt);
      if (!Number.isFinite(otherCreatedAt) || otherCreatedAt > canceledAt) return false;
      if (other.status.startsWith('CANCELED')) {
        const otherCanceledAt = japanTimestamp(other.canceledAt);
        return Number.isFinite(otherCanceledAt) && otherCanceledAt >= Math.max(createdAt, otherCreatedAt);
      }
      return other.status === 'ACTIVE' || other.status === 'COMPLETED';
    });
    if (overlappingHold) releaseDays.add(booking.date.slice(0, 10));
  }
  result.multiStudioReleaseDays = releaseDays.size;
  if (result.noShowCount > 0) result.reasons.push(`直近90日：来店なし ${result.noShowCount}件`);
  if (late.length >= RESERVATION_REVIEW_POLICY.lateCount) result.reasons.push(`直近90日：開始24時間以内のキャンセル ${late.length}件`);
  if (releaseDays.size >= RESERVATION_REVIEW_POLICY.multiStudioDays) result.reasons.push(`同時刻の複数スタジオ確保後に直前取消 ${releaseDays.size}日（要確認）`);
  result.evidence = late.sort((a, b) => japanTimestamp(b.canceledAt) - japanTimestamp(a.canceledAt)).slice(0, 5)
    .map(b => ({ bookingId: b.bookingId, date: b.date.slice(0, 10), studio: b.studioId, time: `${b.startTime}〜${b.endTime}`, canceledAt: b.canceledAt || '' }));
  return result;
}
