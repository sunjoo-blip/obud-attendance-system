# 근태관리 시스템 설정 가이드

이 문서는 근태관리 시스템을 처음부터 설정하는 방법을 단계별로 안내합니다.

## 📝 목차

1. [Supabase 데이터베이스 설정](#1-supabase-데이터베이스-설정)
2. [Google OAuth 설정](#2-google-oauth-설정)
3. [Google Calendar API 설정](#3-google-calendar-api-설정)
4. [Slack App 설정](#4-slack-app-설정)
5. [환경변수 설정](#5-환경변수-설정)
6. [로컬 테스트](#6-로컬-테스트)
7. [Cloudtype 배포](#7-cloudtype-배포)
8. [Cron 작업 설정](#8-cron-작업-설정)

---

## 1. Supabase 데이터베이스 설정

### 1.1 Supabase 프로젝트 생성

1. https://supabase.com 접속 후 회원가입/로그인
2. "New Project" 클릭
3. 프로젝트 정보 입력:
   - Name: `attendance-system`
   - Database Password: 안전한 비밀번호 입력
   - Region: `Northeast Asia (Seoul)` 선택
4. "Create new project" 클릭 (약 2분 소요)

### 1.2 데이터베이스 스키마 생성

1. 왼쪽 메뉴에서 "SQL Editor" 클릭
2. "New query" 클릭
3. `database/schema.sql` 파일 내용 복사 후 붙여넣기
4. "Run" 버튼 클릭하여 실행

### 1.3 Connection String 복사

1. "Project Settings" (⚙️) 클릭
2. "Database" 메뉴 선택
3. "Connection string" 섹션에서 "URI" 복사
4. 비밀번호 부분(`[YOUR-PASSWORD]`)을 실제 비밀번호로 교체

```
예시: postgresql://postgres:your-password@db.xxx.supabase.co:5432/postgres
```

---

## 2. Google OAuth 설정

### 2.1 Google Cloud 프로젝트 생성

1. https://console.cloud.google.com 접속
2. 상단 프로젝트 선택 드롭다운 클릭
3. "새 프로젝트" 클릭
4. 프로젝트 이름 입력: `attendance-system`
5. "만들기" 클릭

### 2.2 OAuth 동의 화면 설정

1. 왼쪽 메뉴 "API 및 서비스" > "OAuth 동의 화면"
2. User Type: "내부" 선택 (G Suite 사용 시) 또는 "외부"
3. "만들기" 클릭
4. 앱 정보 입력:
   - 앱 이름: `근태관리 시스템`
   - 사용자 지원 이메일: 회사 이메일
   - 개발자 연락처 정보: 회사 이메일
5. "저장 후 계속" 클릭
6. 범위 설정: 기본값 유지, "저장 후 계속"
7. 요약 확인 후 "대시보드로 돌아가기"

### 2.3 OAuth 클라이언트 ID 생성

1. "API 및 서비스" > "사용자 인증 정보"
2. "사용자 인증 정보 만들기" > "OAuth 클라이언트 ID"
3. 애플리케이션 유형: "웹 애플리케이션"
4. 이름: `attendance-web-client`
5. 승인된 리디렉션 URI 추가:
   ```
   http://localhost:3000/api/auth/callback/google
   ```
   (배포 후 추가로 프로덕션 URL도 추가)
6. "만들기" 클릭
7. **클라이언트 ID**와 **클라이언트 보안 비밀번호** 복사 및 저장

---

## 3. Google Calendar API 설정

### 3.1 Calendar API 활성화

1. Google Cloud Console에서 동일 프로젝트 선택
2. "API 및 서비스" > "라이브러리"
3. "Google Calendar API" 검색
4. "Google Calendar API" 클릭
5. "사용 설정" 클릭

### 3.2 회사 공용 캘린더 생성 및 ID 확인

1. Google Calendar (calendar.google.com) 접속
2. 왼쪽 "다른 캘린더" 옆 "+" 클릭
3. "새 캘린더 만들기" 선택
4. 캘린더 이름: `회사 연차 캘린더`
5. "캘린더 만들기" 클릭
6. 생성된 캘린더 설정 (⚙️) > "캘린더 통합"
7. **캘린더 ID** 복사 (예: `xxx@group.calendar.google.com`)

### 3.3 캘린더 공유 설정

1. 캘린더 설정 > "특정 사용자와 공유"
2. 전체 직원에게 공유 (또는 도메인 전체 공유)
3. 권한: "일정 세부정보 보기" 선택

---

## 4. Slack App 설정

### 4.1 Slack App 생성

1. https://api.slack.com/apps 접속
2. "Create New App" 클릭
3. "From scratch" 선택
4. App Name: `근태관리 봇`
5. Workspace 선택 후 "Create App"

### 4.2 Bot Token Scopes 추가

1. 왼쪽 "OAuth & Permissions" 메뉴
2. "Scopes" 섹션의 "Bot Token Scopes"에 다음 추가:
   - `users.profile:write`
   - `users.profile:read`
   - `users:read`
   - `users:read.email`

### 4.3 Workspace에 설치

1. 상단 "Install to Workspace" 버튼 클릭
2. 권한 허용
3. **Bot User OAuth Token** 복사 (xoxb-로 시작)

### 4.4 Team ID 확인

1. Slack 워크스페이스에서 "설정 및 관리" > "워크스페이스 설정"
2. URL에서 Team ID 확인 또는
3. Slack API 페이지 "Basic Information"에서 확인

---

## 5. 환경변수 설정

프로젝트 루트에 `.env.local` 파일 생성:

```env
# Database (Supabase)
DATABASE_URL=postgresql://postgres:your-password@db.xxx.supabase.co:5432/postgres

# Google OAuth
GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxx

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-random-32-character-secret-key

# Admin Emails (쉼표로 구분)
ADMIN_EMAILS=ceo@company.com,admin@company.com

# Google Calendar
GOOGLE_CALENDAR_ID=xxx@group.calendar.google.com

# Slack
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_TEAM_ID=T01234567

# Cron Secret
CRON_SECRET=your-cron-secret-key-for-security
```

### NEXTAUTH_SECRET 생성하기

터미널에서 다음 명령어 실행:

```bash
openssl rand -base64 32
```

---

## 6. 로컬 테스트

### 6.1 패키지 설치

```bash
npm install
```

### 6.2 개발 서버 실행

```bash
npm run dev
```

### 6.3 테스트

1. 브라우저에서 http://localhost:3000 접속
2. Google 계정으로 로그인
3. 연차 신청 테스트
4. 관리자 계정으로 로그인하여 관리 기능 테스트

---

## 7. Cloudtype 배포

### 7.1 GitHub에 코드 푸시

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/attendance-system.git
git push -u origin main
```

### 7.2 Cloudtype에서 배포

1. https://cloudtype.io 접속 후 로그인
2. "새 프로젝트" 클릭
3. GitHub 저장소 연결
4. 프로젝트 설정:
   - Branch: `main`
   - Build Command: `npm run build`
   - Start Command: `npm start`
5. 환경변수 추가 (`.env.local` 내용 복사)
6. `NEXTAUTH_URL`을 배포 URL로 변경
7. "배포" 클릭

### 7.3 Google OAuth 리디렉션 URI 추가

1. Google Cloud Console > OAuth 클라이언트 ID 편집
2. 승인된 리디렉션 URI에 추가:
   ```
   https://your-app.cloudtype.app/api/auth/callback/google
   ```

---

## 8. Cron 작업 설정

### 8.1 Cloudtype Cron 설정 (추천)

Cloudtype 대시보드에서:

1. **매월 1일 00:00 - 월차 자동 지급**
   - URL: `https://your-app.cloudtype.app/api/cron/monthly-grant`
   - Schedule: `0 0 1 * *`
   - Headers: `Authorization: Bearer your-cron-secret-key`

2. **매일 00:00 - Slack 상태 설정**
   - URL: `https://your-app.cloudtype.app/api/cron/slack-status?action=set`
   - Schedule: `0 0 * * *`
   - Headers: `Authorization: Bearer your-cron-secret-key`

3. **매일 18:00 - Slack 상태 원복**
   - URL: `https://your-app.cloudtype.app/api/cron/slack-status?action=clear`
   - Schedule: `0 18 * * *`
   - Headers: `Authorization: Bearer your-cron-secret-key`

### 8.2 외부 Cron 서비스 사용 (대안)

**cron-job.org 사용:**

1. https://cron-job.org 회원가입
2. "Create Cronjob" 클릭
3. 위 URL들을 각각 등록
4. Headers에 Authorization 추가

---

## 🎉 완료!

모든 설정이 완료되었습니다. 이제 팀원들에게 시스템 URL을 공유하세요!

## 📞 문제 발생 시

각 단계에서 문제가 발생하면:

1. 콘솔 로그 확인
2. 환경변수 다시 확인
3. API 권한 및 활성화 상태 확인
4. GitHub Issues에 문의

---

## 📚 추가 기능 아이디어

- 연차 사용 통계 대시보드
- 이메일 알림
- 연차 승인 프로세스
- 공휴일 자동 등록
- 병가/경조사 관리
