-- 扩展数据库架构 - 添加用户系统和排行榜功能

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    total_questions_answered INTEGER DEFAULT 0,
    total_correct_answers INTEGER DEFAULT 0
);

-- 用户会话表（用于JWT令牌管理）
CREATE TABLE IF NOT EXISTS user_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token_jti TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 答题记录表
CREATE TABLE IF NOT EXISTS quiz_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    mode TEXT NOT NULL CHECK (mode IN ('speed', 'study')),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    total_questions INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,
    time_spent INTEGER, -- 秒数
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 单题答题记录表
CREATE TABLE IF NOT EXISTS question_answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quiz_record_id INTEGER NOT NULL,
    question_id INTEGER NOT NULL,
    selected_option_id INTEGER,
    is_correct BOOLEAN NOT NULL,
    attempt_count INTEGER DEFAULT 1, -- 学习模式中的尝试次数
    time_taken INTEGER, -- 回答该题用时（毫秒）
    answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quiz_record_id) REFERENCES quiz_records(id),
    FOREIGN KEY (question_id) REFERENCES questions(id),
    FOREIGN KEY (selected_option_id) REFERENCES options(id)
);

-- 速答排行榜视图
CREATE VIEW IF NOT EXISTS speed_leaderboard AS
SELECT 
    u.username,
    u.id as user_id,
    qr.correct_answers,
    qr.total_questions,
    qr.time_spent,
    ROUND(qr.correct_answers * 100.0 / qr.total_questions, 2) as accuracy,
    qr.created_at,
    ROW_NUMBER() OVER (ORDER BY qr.correct_answers DESC, qr.time_spent ASC) as rank
FROM quiz_records qr
JOIN users u ON qr.user_id = u.id
WHERE qr.mode = 'speed' AND qr.completed = TRUE
ORDER BY qr.correct_answers DESC, qr.time_spent ASC;

-- 学习模式排行榜视图
CREATE VIEW IF NOT EXISTS study_leaderboard AS
SELECT 
    u.username,
    u.id as user_id,
    qr.total_questions,
    qr.time_spent,
    qr.created_at,
    ROW_NUMBER() OVER (ORDER BY qr.total_questions DESC, qr.time_spent DESC) as rank
FROM quiz_records qr
JOIN users u ON qr.user_id = u.id
WHERE qr.mode = 'study' AND qr.completed = TRUE
ORDER BY qr.total_questions DESC, qr.time_spent DESC;

-- 用户统计视图
CREATE VIEW IF NOT EXISTS user_stats AS
SELECT 
    u.id,
    u.username,
    u.total_questions_answered,
    u.total_correct_answers,
    ROUND(u.total_correct_answers * 100.0 / NULLIF(u.total_questions_answered, 0), 2) as overall_accuracy,
    COUNT(DISTINCT qr.id) as total_sessions,
    MAX(qr.created_at) as last_activity,
    (SELECT COUNT(*) FROM quiz_records WHERE user_id = u.id AND mode = 'speed') as speed_sessions,
    (SELECT COUNT(*) FROM quiz_records WHERE user_id = u.id AND mode = 'study') as study_sessions
FROM users u
LEFT JOIN quiz_records qr ON u.id = qr.user_id
GROUP BY u.id;

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token_jti ON user_sessions(token_jti);
CREATE INDEX IF NOT EXISTS idx_quiz_records_user_id ON quiz_records(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_records_mode ON quiz_records(mode);
CREATE INDEX IF NOT EXISTS idx_quiz_records_created_at ON quiz_records(created_at);
CREATE INDEX IF NOT EXISTS idx_question_answers_quiz_record_id ON question_answers(quiz_record_id);
CREATE INDEX IF NOT EXISTS idx_question_answers_question_id ON question_answers(question_id);

-- 创建触发器，自动更新用户统计
CREATE TRIGGER IF NOT EXISTS update_user_stats_after_answer
    AFTER INSERT ON question_answers
    FOR EACH ROW
BEGIN
    UPDATE users SET 
        total_questions_answered = total_questions_answered + 1,
        total_correct_answers = total_correct_answers + CASE WHEN NEW.is_correct THEN 1 ELSE 0 END
    WHERE id = (SELECT user_id FROM quiz_records WHERE id = NEW.quiz_record_id);
END;

-- 创建触发器，清理过期的用户会话
CREATE TRIGGER IF NOT EXISTS cleanup_expired_sessions
    AFTER INSERT ON user_sessions
    FOR EACH ROW
BEGIN
    UPDATE user_sessions SET is_active = FALSE 
    WHERE expires_at < datetime('now') AND is_active = TRUE;
END;