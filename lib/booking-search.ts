export const immediateSearchLimitMs = 10 * 60 * 1000;

export function searchDeadlineSql(prefix = '') {
 return `COALESCE(${prefix}scheduled_at,${prefix}created_at+${immediateSearchLimitMs})`;
}

export function searchDeadline(booking: {scheduled_at?: number | null; created_at: number}) {
 return Number(booking.scheduled_at ?? (Number(booking.created_at) + immediateSearchLimitMs));
}
