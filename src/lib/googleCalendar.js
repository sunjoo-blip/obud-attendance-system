import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

// TODO: OAuth 토큰 관리 필요 (실제 구현 시)
// 현재는 서비스 계정 방식으로 진행하는 것이 더 적합

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

const leaveTypeLabels = {
  FULL: '휴가',
  AM_HALF: '오전 반차',
  PM_HALF: '오후 반차',
};

export async function addGoogleCalendarEvent({ userName, leaveDate, leaveType }) {
  try {
    const date = new Date(leaveDate);
    const dateStr = date.toISOString().split('T')[0];

    let startTime, endTime;
    
    if (leaveType === 'FULL') {
      // 종일 이벤트
      startTime = `${dateStr}T09:00:00+09:00`;
      endTime = `${dateStr}T18:00:00+09:00`;
    } else if (leaveType === 'AM_HALF') {
      // 오전 반차
      startTime = `${dateStr}T09:00:00+09:00`;
      endTime = `${dateStr}T13:30:00+09:00`;
    } else {
      // 오후 반차
      startTime = `${dateStr}T13:30:00+09:00`;
      endTime = `${dateStr}T18:00:00+09:00`;
    }

    const event = {
      summary: `${userName} - ${leaveTypeLabels[leaveType]}`,
      description: `${userName}님의 ${leaveTypeLabels[leaveType]}`,
      start: {
        dateTime: startTime,
        timeZone: 'Asia/Seoul',
      },
      end: {
        dateTime: endTime,
        timeZone: 'Asia/Seoul',
      },
      colorId: leaveType === 'FULL' ? '11' : '5', // 빨간색 : 노란색
    };

    const response = await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      requestBody: event,
    });

    return response.data.id;
  } catch (error) {
    console.error('Google Calendar API error:', error);
    throw error;
  }
}

export async function deleteGoogleCalendarEvent(eventId) {
  try {
    await calendar.events.delete({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      eventId: eventId,
    });
  } catch (error) {
    console.error('Google Calendar delete error:', error);
    throw error;
  }
}

export async function updateGoogleCalendarEvent(eventId, { userName, leaveDate, leaveType }) {
  try {
    const date = new Date(leaveDate);
    const dateStr = date.toISOString().split('T')[0];

    let startTime, endTime;
    
    if (leaveType === 'FULL') {
      startTime = `${dateStr}T09:00:00+09:00`;
      endTime = `${dateStr}T18:00:00+09:00`;
    } else if (leaveType === 'AM_HALF') {
      startTime = `${dateStr}T09:00:00+09:00`;
      endTime = `${dateStr}T13:30:00+09:00`;
    } else {
      startTime = `${dateStr}T13:30:00+09:00`;
      endTime = `${dateStr}T18:00:00+09:00`;
    }

    const event = {
      summary: `${userName} - ${leaveTypeLabels[leaveType]}`,
      description: `${userName}님의 ${leaveTypeLabels[leaveType]}`,
      start: {
        dateTime: startTime,
        timeZone: 'Asia/Seoul',
      },
      end: {
        dateTime: endTime,
        timeZone: 'Asia/Seoul',
      },
    };

    await calendar.events.update({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      eventId: eventId,
      requestBody: event,
    });
  } catch (error) {
    console.error('Google Calendar update error:', error);
    throw error;
  }
}
