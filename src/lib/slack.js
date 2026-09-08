import { WebClient } from '@slack/web-api';

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

export async function setSlackStatus(slackUserId, statusText) {
  try {
    await slack.users.profile.set({
      user: slackUserId,
      profile: {
        status_text: statusText,
        status_emoji: ':palm_tree:',
        status_expiration: 0, // 만료 시간 없음 (수동 또는 cron으로 제거)
      },
    });
    
    console.log(`Set Slack status for user ${slackUserId}: ${statusText}`);
  } catch (error) {
    console.error('Slack set status error:', error);
    throw error;
  }
}

export async function clearSlackStatus(slackUserId) {
  try {
    await slack.users.profile.set({
      user: slackUserId,
      profile: {
        status_text: '',
        status_emoji: '',
      },
    });
    
    console.log(`Cleared Slack status for user ${slackUserId}`);
  } catch (error) {
    console.error('Slack clear status error:', error);
    throw error;
  }
}

// 연차 알림 채널
const LEAVE_CHANNEL = '#9-일정-외근_휴가_출장';

// 연차 타입별 라벨
const LEAVE_TYPE_LABELS = {
  FULL: '연차 (종일)',
  AM_HALF: '오전 반차',
  PM_HALF: '오후 반차',
  QUARTER_DAY: '반반차',
};

// 기간 문자열 생성 (요일 포함, 반반차는 시간 표시)
function formatLeavePeriod({ leaveType, startDate, endDate, startTime, endTime }) {
  // 날짜에 요일 추가 (예: 2026-09-08(화))
  const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
  const formatWithWeekday = (dateStr) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    return `${dateStr}(${WEEKDAYS[day]})`;
  };

  // 하루면 단일 날짜, 여러 날이면 범위
  const dateRange =
    startDate === endDate
      ? formatWithWeekday(startDate)
      : `${formatWithWeekday(startDate)} ~ ${formatWithWeekday(endDate)}`;

  // 반반차는 시간 정보 추가
  if (leaveType === 'QUARTER_DAY' && startTime && endTime) {
    return `${dateRange} (${startTime} - ${endTime})`;
  }
  return dateRange;
}

// 연차/반차/반반차 신청 시 채널에 알림 발송
export async function sendLeaveNotification({
  userName,
  leaveType,
  startDate,
  endDate,
  startTime,
  endTime,
}) {
  try {
    const typeLabel = LEAVE_TYPE_LABELS[leaveType] || leaveType;
    const period = formatLeavePeriod({
      leaveType,
      startDate,
      endDate,
      startTime,
      endTime,
    });

    const text = `:palm_tree: *${userName}* 님이 *${typeLabel}* 를 신청했습니다.\n📅 ${period}`;

    await slack.chat.postMessage({
      channel: LEAVE_CHANNEL,
      text,
    });

    console.log(`Sent leave notification for ${userName} to ${LEAVE_CHANNEL}`);
  } catch (error) {
    console.error('Slack leave notification error:', error);
    // 알림 실패는 무시 (연차 신청은 정상 처리)
  }
}

// 연차/반차/반반차 취소 시 채널에 알림 발송
export async function sendLeaveCancellationNotification({
  userName,
  leaveType,
  startDate,
  endDate,
  startTime,
  endTime,
}) {
  try {
    const typeLabel = LEAVE_TYPE_LABELS[leaveType] || leaveType;
    const period = formatLeavePeriod({
      leaveType,
      startDate,
      endDate,
      startTime,
      endTime,
    });

    const text = `:x: *${userName}* 님이 *${typeLabel}* 를 취소했습니다.\n📅 ${period}`;

    await slack.chat.postMessage({
      channel: LEAVE_CHANNEL,
      text,
    });

    console.log(`Sent leave cancellation for ${userName} to ${LEAVE_CHANNEL}`);
  } catch (error) {
    console.error('Slack leave cancellation error:', error);
    // 알림 실패는 무시 (연차 취소는 정상 처리)
  }
}

// Slack 사용자 ID 찾기 (이메일로 검색)
export async function findSlackUserByEmail(email) {
  try {
    const result = await slack.users.lookupByEmail({ email });
    return result.user.id;
  } catch (error) {
    console.error('Slack user lookup error:', error);
    return null;
  }
}
