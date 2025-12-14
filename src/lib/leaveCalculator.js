// 연차 타입별 설정
export const LEAVE_TYPE_CONFIG = {
  FULL: {
    label: '연차 (종일)',
    timeRange: '09:00 - 18:00',
    amount: 1.0,
    allowMultipleDays: true,
  },
  AM_HALF: {
    label: '오전 반차',
    timeRange: '09:00 - 13:30',
    amount: 0.5,
    allowMultipleDays: false,
  },
  PM_HALF: {
    label: '오후 반차',
    timeRange: '13:30 - 18:00',
    amount: 0.5,
    allowMultipleDays: false,
  },
  QUARTER_DAY: {
    label: '반반차',
    amount: 0.25,
    allowMultipleDays: false,
    requiresTime: true, // 시간 선택 필수
  },
};

// 반반차 시작 시간 옵션 (30분 단위)
// 점심시간 12:00-13:00 제외
export const QUARTER_DAY_TIME_OPTIONS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '13:30', '14:00', '14:30', '15:00', '15:30', '16:00'
];

/**
 * 시작 시간에 2시간을 더해 종료 시간 계산
 * @param {string} startTime - 시작 시간 (HH:MM 형식)
 * @returns {string} 종료 시간 (HH:MM 형식)
 */
export function calculateEndTime(startTime) {
  const [hours, minutes] = startTime.split(':').map(Number);
  const endHours = hours + 2;
  const endMinutes = minutes;

  // 18:00 초과 방지
  if (endHours > 18 || (endHours === 18 && endMinutes > 0)) {
    return '18:00';
  }

  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
}

/**
 * 연차 사용량 계산
 * @param {string} leaveType - 연차 타입
 * @param {Date} startDate - 시작 날짜
 * @param {Date} endDate - 종료 날짜
 * @returns {number} 연차 사용량
 */
export function calculateLeaveAmount(leaveType, startDate, endDate) {
  const config = LEAVE_TYPE_CONFIG[leaveType];
  if (!config) throw new Error('Invalid leave type');

  if (config.allowMultipleDays) {
    const daysDiff = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    return daysDiff * config.amount;
  }

  return config.amount;
}

/**
 * 시간 겹침 검증 (반반차용)
 * @param {string} existingStart - 기존 시작 시간 (HH:MM)
 * @param {string} existingEnd - 기존 종료 시간 (HH:MM)
 * @param {string} newStart - 새로운 시작 시간 (HH:MM)
 * @param {string} newEnd - 새로운 종료 시간 (HH:MM)
 * @returns {boolean} 겹치면 true
 */
export function checkTimeOverlap(existingStart, existingEnd, newStart, newEnd) {
  // 시작 시간이 기존 범위 안에 있거나
  // 종료 시간이 기존 범위 안에 있거나
  // 새로운 범위가 기존 범위를 완전히 포함하는 경우
  return (
    (newStart >= existingStart && newStart < existingEnd) ||
    (newEnd > existingStart && newEnd <= existingEnd) ||
    (newStart <= existingStart && newEnd >= existingEnd)
  );
}
