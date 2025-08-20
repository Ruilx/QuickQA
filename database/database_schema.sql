-- 题目数据库架构设计
-- 支持多种题型和科目的拓展性数据库

-- 科目表
CREATE TABLE IF NOT EXISTS subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,           -- 科目名称：语文、数学、英语等
    description TEXT,                    -- 科目描述
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 题型表
CREATE TABLE IF NOT EXISTS question_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,           -- 题型名称：选择题、填空题、判断题等
    description TEXT,                    -- 题型描述
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 题目表（核心表）
CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_id INTEGER NOT NULL,         -- 关联科目ID
    question_type_id INTEGER NOT NULL,   -- 关联题型ID
    title TEXT NOT NULL,                 -- 题目标题（如：《江南》 汉乐府）
    content TEXT NOT NULL,               -- 题目内容（题干）
    correct_answer TEXT NOT NULL,        -- 正确答案
    explanation TEXT NOT NULL,           -- 详解
    difficulty_level INTEGER DEFAULT 1,  -- 难度等级：1-5
    tags TEXT,                          -- 标签（JSON格式，如：["古诗词", "唐代", "李白"]）
    source TEXT,                        -- 题目来源
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id),
    FOREIGN KEY (question_type_id) REFERENCES question_types(id)
);

-- 选项表（支持多选题）
CREATE TABLE IF NOT EXISTS options (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INTEGER NOT NULL,        -- 关联题目ID
    option_text TEXT NOT NULL,           -- 选项内容
    is_correct BOOLEAN DEFAULT FALSE,   -- 是否为正确答案
    option_order INTEGER DEFAULT 0,      -- 选项顺序（用于保持原始顺序）
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (question_id) REFERENCES questions(id)
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_questions_subject ON questions(subject_id);
CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(question_type_id);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_options_question ON options(question_id);

-- 插入基础数据
INSERT OR IGNORE INTO subjects (name, description) VALUES 
('语文', '语文学科，包括古诗词、成语、阅读理解等'),
('数学', '数学学科，包括计算、几何、代数等'),
('英语', '英语学科，包括语法、词汇、阅读理解等');

INSERT OR IGNORE INTO question_types (name, description) VALUES 
('选择题', '从多个选项中选择正确答案'),
('填空题', '在空白处填入正确答案'),
('判断题', '判断题目陈述的正误'),
('多选题', '从多个选项中选择多个正确答案');

-- 创建触发器，自动更新updated_at字段
CREATE TRIGGER IF NOT EXISTS update_questions_timestamp 
    AFTER UPDATE ON questions
    FOR EACH ROW
BEGIN
    UPDATE questions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END; 