# 근태관리 시스템 (Attendance Management System)

스타트업을 위한 간단한 연차 관리 시스템입니다.

## 🌟 주요 기능

- ✅ Google 계정 소셜 로그인
- ✅ 매월 자동 월차 지급 (월차 개념)
- ✅ 달력 UI 기반 연차 신청 (종일/오전반차/오후반차)
- ✅ 당일까지 연차 취소 가능
- ✅ Google Calendar 자동 연동
- ✅ Slack 프로필 상태 자동 변경/원복
- ✅ 관리자 기능 (전체 연차 조회, 연차 배분, 수정/삭제)
- ✅ 모바일 반응형 웹

## 🛠 기술 스택

- **Frontend & Backend**: Next.js 14 (App Router)
- **인증**: NextAuth.js (Google OAuth)
- **데이터베이스**: PostgreSQL (Supabase)
- **스타일링**: TailwindCSS
- **달력**: React Big Calendar
- **배포**: Cloudtype

## 📋 사전 준비

### 1. Google Cloud Console 설정

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 새 프로젝트 생성
3. "API 및 서비스" > "사용자 인증 정보" 이동
4. "OAuth 2.0 클라이언트 ID" 생성
   - 애플리케이션 유형: 웹 애플리케이션
   - 승인된 리디렉션 URI: `http://localhost:3000/api/auth/callback/google`
   - 배포 후: `https://your-domain.com/api/auth/callback/google`
5. Client ID와 Client Secret 복사

### 2. Google Calendar API 활성화

1. Google Cloud Console에서 "API 및 서비스" > "라이브러리"
2. "Google Calendar API" 검색 후 활성화
3. 회사 공용 캘린더 ID 확인:
   - Google Calendar 설정 > 특정 캘린더 설정 > "캘린더 통합" > "캘린더 ID"

### 3. Slack App 생성

1. [Slack API](https://api.slack.com/apps) 접속
2. "Create New App" 클릭
3. "From scratch" 선택
4. App 이름 입력 및 Workspace 선택
5. "OAuth & Permissions" 메뉴:
   - Bot Token Scopes 추가:
     - `users.profile:write`
     - `users.profile:read`
     - `users:read`
     - `users:read.email`
6. "Install to Workspace" 클릭
7. Bot User OAuth Token 복사 (xoxb-로 시작)

### 4. Supabase (PostgreSQL) 설정

1. [Supabase](https://supabase.com/) 회원가입
2. 새 프로젝트 생성
3. "Project Settings" > "Database" 에서 Connection String 복사
4. SQL Editor에서 `database/schema.sql` 실행

## 🚀 설치 및 실행

### 1. 프로젝트 클론 및 의존성 설치

```bash
npm install
```

### 2. 환경변수 설정

`.env.local` 파일을 생성하고 아래 내용을 입력하세요:

```env
# Database (Supabase PostgreSQL)
DATABASE_URL=postgresql://user:password@host:port/database

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-random-secret-key-here

# Admin Emails (쉼표로 구분)
ADMIN_EMAILS=admin1@company.com,admin2@company.com

# Google Calendar API
GOOGLE_CALENDAR_ID=your-company-calendar-id@group.calendar.google.com

# Slack API
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
SLACK_TEAM_ID=your-slack-team-id

# Cron Secret (자동 작업용)
CRON_SECRET=your-cron-secret-key
```

### 3. 로컬 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 접속

## 📅 Cron 작업 설정

### Cloudtype에서 Cron 설정

1. **매월 1일 00:00 - 월차 자동 지급**
   ```
   0 0 1 * * https://your-domain.com/api/cron/monthly-grant
   Authorization: Bearer your-cron-secret-key
   ```

2. **매일 00:00 - Slack 상태 설정**
   ```
   0 0 * * * https://your-domain.com/api/cron/slack-status?action=set
   Authorization: Bearer your-cron-secret-key
   ```

3. **매일 18:00 - Slack 상태 원복**
   ```
   0 18 * * * https://your-domain.com/api/cron/slack-status?action=clear
   Authorization: Bearer your-cron-secret-key
   ```

### 외부 Cron 서비스 사용 (대안)

- [cron-job.org](https://cron-job.org)
- [EasyCron](https://www.easycron.com)

## 🎨 UI 스크린샷

### 로그인 페이지
- Google 소셜 로그인

### 메인 대시보드
- 달력 UI로 연차 현황 확인
- 연차 신청 및 취소
- 남은 연차 표시

### 관리자 페이지
- 전체 사용자 연차 현황
- 연차 배분 및 관리

## 📝 사용 가이드

### 일반 사용자

1. Google 계정으로 로그인
2. 대시보드에서 연차 신청 버튼 클릭
3. 날짜와 종류 선택 (종일/오전반차/오후반차)
4. 신청 완료 → Google Calendar 자동 등록
5. 당일까지 취소 가능

### 관리자

1. 관리자 페이지 접속
2. 전체 사용자 연차 현황 확인
3. 필요 시 연차 수동 지급
4. 연차 수정/삭제 가능

## 🔐 보안

- NextAuth.js를 통한 안전한 OAuth 인증
- 관리자 권한은 환경변수로 관리
- Cron API는 Secret Key로 보호
- Database는 SSL 연결 사용

## 📦 배포

### Cloudtype 배포

1. [Cloudtype](https://cloudtype.io/) 회원가입
2. GitHub 저장소 연결
3. 환경변수 설정
4. 배포 실행

### Vercel 배포 (대안)

```bash
npm install -g vercel
vercel
```

## 🐛 문제 해결

### Google Calendar 연동 오류
- Google Cloud Console에서 Calendar API 활성화 확인
- 서비스 계정 또는 OAuth 토큰 재발급

### Slack 연동 오류
- Bot Token Scopes 권한 확인
- Workspace에 App 재설치

### 데이터베이스 연결 오류
- Supabase Connection String 확인
- 방화벽 설정 확인

## 📄 라이선스

MIT License

## 👥 기여

Pull Request는 언제나 환영합니다!

## 📞 문의

이슈가 있으시면 GitHub Issues에 등록해주세요.
