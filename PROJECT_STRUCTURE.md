# 📁 프로젝트 구조

```
attendance-system/
├── database/
│   └── schema.sql              # PostgreSQL 데이터베이스 스키마
│
├── src/
│   ├── app/
│   │   ├── admin/
│   │   │   └── page.jsx        # 관리자 대시보드
│   │   ├── api/
│   │   │   ├── admin/          # 관리자 API
│   │   │   │   ├── grant-leave/route.js
│   │   │   │   ├── leaves/
│   │   │   │   │   ├── [id]/route.js
│   │   │   │   │   └── route.js
│   │   │   │   └── users/route.js
│   │   │   ├── auth/
│   │   │   │   └── [...nextauth]/route.js  # NextAuth 설정
│   │   │   ├── cron/           # Cron 작업 API
│   │   │   │   ├── monthly-grant/route.js
│   │   │   │   └── slack-status/route.js
│   │   │   └── leaves/         # 연차 API
│   │   │       ├── [id]/route.js
│   │   │       └── route.js
│   │   ├── dashboard/
│   │   │   └── page.jsx        # 메인 대시보드
│   │   ├── login/
│   │   │   └── page.jsx        # 로그인 페이지
│   │   ├── globals.css         # 글로벌 스타일
│   │   ├── layout.jsx          # 루트 레이아웃
│   │   └── page.jsx            # 홈 (리다이렉트)
│   │
│   ├── components/
│   │   ├── AuthProvider.jsx   # NextAuth 세션 프로바이더
│   │   ├── LeaveCalendar.jsx  # 달력 컴포넌트
│   │   ├── LeaveList.jsx      # 연차 리스트
│   │   └── LeaveRequestModal.jsx  # 연차 신청 모달
│   │
│   ├── lib/
│   │   ├── db.js              # PostgreSQL 연결
│   │   ├── googleCalendar.js  # Google Calendar API
│   │   └── slack.js           # Slack API
│   │
│   └── middleware.js          # 인증 미들웨어
│
├── .env.local.example         # 환경변수 템플릿
├── .gitignore
├── next.config.js             # Next.js 설정
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── README.md                  # 프로젝트 소개
└── SETUP_GUIDE.md            # 상세 설정 가이드
```

## 🎯 핵심 파일 설명

### Frontend
- **src/app/dashboard/page.jsx**: 사용자 메인 페이지
- **src/app/admin/page.jsx**: 관리자 페이지
- **src/components/**: 재사용 가능한 React 컴포넌트

### Backend (API Routes)
- **src/app/api/auth/**: NextAuth 인증
- **src/app/api/leaves/**: 연차 CRUD
- **src/app/api/admin/**: 관리자 기능
- **src/app/api/cron/**: 자동화 작업

### Libraries
- **src/lib/db.js**: 데이터베이스 연결 및 쿼리
- **src/lib/googleCalendar.js**: Google Calendar 이벤트 관리
- **src/lib/slack.js**: Slack 상태 업데이트

### Configuration
- **database/schema.sql**: DB 테이블 생성 스크립트
- **.env.local**: 환경변수 (로컬/배포)

## 🔄 데이터 흐름

### 연차 신청
1. 사용자가 대시보드에서 연차 신청
2. API (`/api/leaves`) 호출
3. DB에 연차 저장 + 잔액 차감
4. Google Calendar에 이벤트 생성
5. UI 업데이트

### 자동 월차 지급
1. Cron이 매월 1일 `/api/cron/monthly-grant` 호출
2. 모든 사용자에게 연차 +1
3. DB에 지급 이력 저장

### Slack 상태 관리
1. Cron이 매일 00:00 `/api/cron/slack-status?action=set` 호출
2. 오늘 연차인 사용자 조회
3. Slack API로 프로필 상태 변경
4. 18:00에 `action=clear`로 원복

## 🚀 빠른 시작

1. 패키지 설치: `npm install`
2. 환경변수 설정: `.env.local` 생성
3. DB 스키마 실행: `database/schema.sql`
4. 개발 서버 실행: `npm run dev`
5. http://localhost:3000 접속

상세한 설정은 `SETUP_GUIDE.md`를 참고하세요!
