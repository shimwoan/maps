-- 알림 테이블 생성
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'application_received', 'application_accepted', 'request_completed'
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  request_id UUID REFERENCES requests(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_is_read ON notifications(user_id, is_read);

-- RLS 비활성화 (개발용)
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
