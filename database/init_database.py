#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
数据库初始化脚本
创建完整的数据库架构，包括用户系统和排行榜功能
"""

import sqlite3
import os
from pathlib import Path

def init_database(db_path='database/quiz_app.db'):
    """初始化数据库"""
    print("开始初始化数据库...")
    
    # 确保数据库目录存在
    db_dir = os.path.dirname(db_path)
    if db_dir and not os.path.exists(db_dir):
        os.makedirs(db_dir)
    
    # 连接数据库
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # 1. 执行基础架构
        print("创建基础表结构...")
        with open('database_schema.sql', 'r', encoding='utf-8') as f:
            base_schema = f.read()
            cursor.executescript(base_schema)
        
        # 2. 执行扩展架构
        print("创建扩展表结构...")
        with open('extended_schema.sql', 'r', encoding='utf-8') as f:
            extended_schema = f.read()
            cursor.executescript(extended_schema)
        
        # 3. 检查是否已有题目数据
        cursor.execute("SELECT COUNT(*) FROM questions")
        question_count = cursor.fetchone()[0]
        
        if question_count == 0:
            print("导入题目数据...")
            # 导入题目数据
            from import_questions import QuestionImporter
            
            # 临时关闭连接
            conn.close()
            
            # 使用导入器导入数据
            importer = QuestionImporter(db_path)
            importer.import_questions('小学古诗词专项练习.txt', reset=True)
            
            # 重新连接
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
        else:
            print(f"数据库中已有 {question_count} 道题目")
        
        # 4. 创建测试用户（可选）
        print("创建测试用户...")
        create_test_users(cursor)
        
        # 提交更改
        conn.commit()
        
        # 5. 验证数据库
        print("验证数据库结构...")
        verify_database(cursor)
        
        print("✅ 数据库初始化完成！")
        
    except Exception as e:
        print(f"❌ 数据库初始化失败: {e}")
        conn.rollback()
        raise
    
    finally:
        conn.close()

def create_test_users(cursor):
    """创建测试用户"""
    import hashlib
    
    # 创建一个测试用户
    test_users = [
        ('admin', 'admin@test.com', 'admin123'),
        ('test_user', 'test@test.com', 'test123'),
    ]
    
    for username, email, password in test_users:
        # 简单的密码哈希（实际应用中应使用更安全的方法）
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        
        try:
            cursor.execute("""
                INSERT OR IGNORE INTO users (username, email, password_hash)
                VALUES (?, ?, ?)
            """, (username, email, password_hash))
            print(f"创建测试用户: {username}")
        except sqlite3.IntegrityError:
            print(f"用户 {username} 已存在")

def verify_database(cursor):
    """验证数据库结构"""
    # 检查所有必要的表是否存在
    required_tables = [
        'subjects', 'question_types', 'questions', 'options',
        'users', 'user_sessions', 'quiz_records', 'question_answers'
    ]
    
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    existing_tables = [row[0] for row in cursor.fetchall()]
    
    missing_tables = set(required_tables) - set(existing_tables)
    if missing_tables:
        raise Exception(f"缺少表: {missing_tables}")
    
    # 检查题目数量
    cursor.execute("SELECT COUNT(*) FROM questions")
    question_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM options")
    option_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM users")
    user_count = cursor.fetchone()[0]
    
    print(f"数据库验证结果:")
    print(f"  - 题目数量: {question_count}")
    print(f"  - 选项数量: {option_count}")
    print(f"  - 用户数量: {user_count}")
    print(f"  - 表数量: {len(existing_tables)}")

def reset_database(db_path='database/quiz_app.db'):
    """重置数据库（删除并重新创建）"""
    if os.path.exists(db_path):
        print(f"删除现有数据库: {db_path}")
        os.remove(db_path)
    
    init_database(db_path)

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == '--reset':
        reset_database()
    else:
        init_database()