-- 사용자 테이블 (Google OAuth 사용)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  profile_image TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  slack_user_id VARCHAR(255), -- Slack 워크스페이스 사용자 ID (로그인 시 자동 설정)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  join_date date
);

-- 연차 잔액 테이블
CREATE TABLE leave_balance (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  total_leaves DECIMAL(5,1) DEFAULT 0,
  used_leaves DECIMAL(5,1) DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

-- 연차 신청 테이블
CREATE TABLE leave_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  leave_type VARCHAR(20) NOT NULL CHECK (leave_type IN ('FULL', 'AM_HALF', 'PM_HALF')),
  status VARCHAR(20) NOT NULL DEFAULT 'APPROVED' CHECK (status IN ('APPROVED', 'CANCELLED')),
  google_calendar_event_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  cancelled_at TIMESTAMP
);

-- 연차 지급 이력 테이블 (월차, 연차, 수동 지급 모두 기록)
CREATE TABLE monthly_leave_grants (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  grant_month VARCHAR(7) NOT NULL, -- YYYY-MM
  amount DECIMAL(5,1) DEFAULT 1,
  grant_type VARCHAR(20) NOT NULL DEFAULT 'MONTHLY' CHECK (grant_type IN ('MONTHLY', 'ANNUAL', 'MANUAL')),
  years_of_service INTEGER, -- 근속 년수 (ANNUAL 타입일 때만 기록)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 추가
CREATE INDEX idx_leave_requests_user_date ON leave_requests(user_id, start_date, end_date);
CREATE INDEX idx_leave_requests_date ON leave_requests(start_date, end_date);
CREATE INDEX idx_monthly_grants_month ON monthly_leave_grants(grant_month);
CREATE INDEX idx_monthly_grants_type ON monthly_leave_grants(grant_type);
CREATE INDEX idx_monthly_grants_user_type ON monthly_leave_grants(user_id, grant_type);
