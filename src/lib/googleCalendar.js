import { google } from "googleapis";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

// Refresh Token 설정
oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

const calendar = google.calendar({ version: "v3", auth: oauth2Client });

const leaveTypeLabels = {
  FULL: "휴가",
  AM_HALF: "오전 반차",
  PM_HALF: "오후 반차",
};

export async function addGoogleCalendarEvent({
  userName,
  startDate,
  endDate,
  leaveType,
}) {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // 로컬 타임존 기준으로 날짜 문자열 생성 (UTC 변환 방지)
    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const startDateStr = formatDate(start);
    const endDateStr = formatDate(end);

    let event;

    if (leaveType === "FULL") {
      // 종일 이벤트 (시간 없이 날짜 범위)
      const nextDay = new Date(end);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayStr = formatDate(nextDay);

      event = {
        summary: `${userName} - ${leaveTypeLabels[leaveType]}`,
        description: `${userName}님의 ${leaveTypeLabels[leaveType]} (${startDateStr} ~ ${endDateStr})`,
        start: {
          date: startDateStr,
        },
        end: {
          date: nextDayStr,
        },
        colorId: "4", // Cherry Blossom (연한 핑크)
      };
    } else {
      // 반차 이벤트 (시간 지정, 시작일만 사용)
      let startTime, endTime;

      if (leaveType === "AM_HALF") {
        // 오전 반차
        startTime = `${startDateStr}T09:00:00+09:00`;
        endTime = `${startDateStr}T13:30:00+09:00`;
      } else {
        // 오후 반차
        startTime = `${startDateStr}T13:30:00+09:00`;
        endTime = `${startDateStr}T18:00:00+09:00`;
      }

      event = {
        summary: `${userName} - ${leaveTypeLabels[leaveType]}`,
        description: `${userName}님의 ${leaveTypeLabels[leaveType]}`,
        start: {
          dateTime: startTime,
          timeZone: "Asia/Seoul",
        },
        end: {
          dateTime: endTime,
          timeZone: "Asia/Seoul",
        },
        colorId: "4",
      };
    }

    const response = await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      requestBody: event,
    });

    return response.data.id;
  } catch (error) {
    console.error("Google Calendar API error:", error);
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
    console.error("Google Calendar delete error:", error);
    throw error;
  }
}

export async function updateGoogleCalendarEvent(
  eventId,
  { userName, startDate, endDate, leaveType }
) {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // 로컬 타임존 기준으로 날짜 문자열 생성 (UTC 변환 방지)
    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const startDateStr = formatDate(start);
    const endDateStr = formatDate(end);

    let event;

    if (leaveType === "FULL") {
      // 종일 이벤트 (시간 없이 날짜 범위)
      const nextDay = new Date(end);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayStr = formatDate(nextDay);

      event = {
        summary: `${userName} - ${leaveTypeLabels[leaveType]}`,
        description: `${userName}님의 ${leaveTypeLabels[leaveType]} (${startDateStr} ~ ${endDateStr})`,
        start: {
          date: startDateStr,
        },
        end: {
          date: nextDayStr,
        },
      };
    } else {
      // 반차 이벤트 (시간 지정, 시작일만 사용)
      let startTime, endTime;

      if (leaveType === "AM_HALF") {
        startTime = `${startDateStr}T09:00:00+09:00`;
        endTime = `${startDateStr}T13:30:00+09:00`;
      } else {
        startTime = `${startDateStr}T13:30:00+09:00`;
        endTime = `${startDateStr}T18:00:00+09:00`;
      }

      event = {
        summary: `${userName} - ${leaveTypeLabels[leaveType]}`,
        description: `${userName}님의 ${leaveTypeLabels[leaveType]}`,
        start: {
          dateTime: startTime,
          timeZone: "Asia/Seoul",
        },
        end: {
          dateTime: endTime,
          timeZone: "Asia/Seoul",
        },
      };
    }

    await calendar.events.update({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      eventId: eventId,
      requestBody: event,
    });
  } catch (error) {
    console.error("Google Calendar update error:", error);
    throw error;
  }
}
