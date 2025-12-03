-- 사용자 테이블
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  profile_image TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  slack_user_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
  leave_date DATE NOT NULL,
  leave_type VARCHAR(20) NOT NULL CHECK (leave_type IN ('FULL', 'AM_HALF', 'PM_HALF')),
  status VARCHAR(20) NOT NULL DEFAULT 'APPROVED' CHECK (status IN ('APPROVED', 'CANCELLED')),
  google_calendar_event_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  cancelled_at TIMESTAMP
);

-- 월차 지급 이력 테이블
CREATE TABLE monthly_leave_grants (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  grant_month VARCHAR(7) NOT NULL, -- YYYY-MM
  amount DECIMAL(5,1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, grant_month)
);

-- 인덱스 추가
CREATE INDEX idx_leave_requests_user_date ON leave_requests(user_id, leave_date);
CREATE INDEX idx_leave_requests_date ON leave_requests(leave_date);
CREATE INDEX idx_monthly_grants_month ON monthly_leave_grants(grant_month);
