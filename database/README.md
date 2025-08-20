# 题目数据库系统

这是一个具有拓展性的题目数据库系统，支持多种题型和科目。目前已经导入了小学古诗词专项练习的80道题目。

## 功能特点

### 🎯 核心功能
- **多科目支持**: 语文、数学、英语等
- **多题型支持**: 选择题、填空题、判断题、多选题
- **随机选项**: 支持选项随机排列，不拘泥于ABCD固定顺序
- **标签系统**: 支持按朝代、作者、主题等标签分类
- **难度分级**: 1-5级难度等级
- **搜索功能**: 支持关键词搜索题目

### 🔧 技术特点
- **SQLite数据库**: 轻量级、无需服务器
- **模块化设计**: 易于扩展新题型和科目
- **JSON标签**: 灵活的标签系统
- **外键约束**: 保证数据完整性

## 文件结构

```
├── database_schema.sql      # 数据库架构定义
├── import_questions.py      # 题目导入脚本
├── query_database.py        # 数据库查询工具
├── questions.db            # SQLite数据库文件（运行后生成）
├── 小学古诗词专项练习.txt    # 原始题目文件
└── README.md              # 说明文档
```

## 数据库架构

### 核心表结构

#### subjects (科目表)
- `id`: 主键
- `name`: 科目名称（语文、数学、英语等）
- `description`: 科目描述

#### question_types (题型表)
- `id`: 主键
- `name`: 题型名称（选择题、填空题等）
- `description`: 题型描述

#### questions (题目表)
- `id`: 主键
- `subject_id`: 关联科目ID
- `question_type_id`: 关联题型ID
- `title`: 题目标题（如：《江南》 汉乐府）
- `content`: 题目内容（题干）
- `correct_answer`: 正确答案
- `explanation`: 详解
- `difficulty_level`: 难度等级（1-5）
- `tags`: 标签（JSON格式）
- `source`: 题目来源

#### options (选项表)
- `id`: 主键
- `question_id`: 关联题目ID
- `option_text`: 选项内容
- `is_correct`: 是否为正确答案
- `option_order`: 选项顺序

## 使用方法

### 1. 初始化数据库

```bash
python import_questions.py
```

这将：
- 创建数据库架构
- 导入古诗词题目
- 显示导入进度

### 2. 查询数据库

```bash
python query_database.py
```

这将显示：
- 数据库统计信息
- 随机题目示例
- 搜索功能演示

### 3. 在代码中使用

```python
from query_database import QuestionDatabase

# 创建数据库连接
db = QuestionDatabase()

# 随机获取一个语文题目
questions = db.get_random_question(subject_name='语文', limit=1)
if questions:
    question = questions[0]
    print(f"题目: {question['content']}")
    
    # 获取随机排列的选项
    random_options = db.get_random_options(question['id'])
    for i, option in enumerate(random_options, 1):
        print(f"{i}. {option['text']}")

# 搜索包含特定关键词的题目
results = db.search_questions('李白', subject_name='语文')
```

## API 参考

### QuestionDatabase 类

#### 主要方法

**get_random_question(subject_name=None, question_type=None, difficulty_level=None, limit=1)**
- 随机获取题目
- 支持按科目、题型、难度筛选
- 返回题目列表

**get_random_options(question_id)**
- 获取随机排列的选项
- 返回选项列表

**get_question_by_id(question_id)**
- 根据ID获取特定题目
- 返回题目字典或None

**search_questions(keyword, subject_name=None)**
- 搜索题目
- 支持关键词搜索
- 返回匹配的题目列表

**get_statistics()**
- 获取数据库统计信息
- 返回统计字典

## 扩展指南

### 添加新科目

```sql
INSERT INTO subjects (name, description) VALUES ('物理', '物理学科，包括力学、电学等');
```

### 添加新题型

```sql
INSERT INTO question_types (name, description) VALUES ('连线题', '将相关项目连线');
```

### 添加新题目

```python
# 获取科目和题型ID
subject_id = db.get_subject_id('语文')
question_type_id = db.get_question_type_id('选择题')

# 插入题目
question_id = db.insert_question({
    'subject_id': subject_id,
    'question_type_id': question_type_id,
    'title': '《新题目》 作者',
    'content': '题目内容',
    'correct_answer': '正确答案',
    'explanation': '详解',
    'tags': ['标签1', '标签2'],
    'options': [
        {'text': '选项A', 'is_correct': False},
        {'text': '选项B', 'is_correct': True},
        # ...
    ]
})
```

## 数据示例

### 题目结构
```json
{
    "id": 1,
    "title": "《江南》 汉乐府",
    "content": "江南可采莲，莲叶何（ ）。 鱼戏莲叶间。",
    "correct_answer": "B",
    "explanation": "这道题选择 B. 田田。...",
    "difficulty_level": 1,
    "tags": ["古诗词", "汉代", "佚名"],
    "options": [
        {"text": "翩翩", "is_correct": false},
        {"text": "田田", "is_correct": true},
        {"text": "尖尖", "is_correct": false},
        {"text": "圆圆", "is_correct": false}
    ]
}
```

## 注意事项

1. **编码**: 所有文件使用UTF-8编码
2. **依赖**: 需要Python 3.6+和sqlite3模块
3. **备份**: 建议定期备份questions.db文件
4. **性能**: 对于大量数据，建议添加更多索引

## 未来计划

- [ ] 添加Web界面
- [ ] 支持图片题目
- [ ] 添加用户答题记录
- [ ] 支持题目导入导出
- [ ] 添加题目难度自动评估
- [ ] 支持多语言

## 贡献

欢迎提交Issue和Pull Request来改进这个项目！ 