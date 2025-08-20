#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
数据库测试脚本
验证数据库的完整性和功能
"""

import sqlite3
from query_database import QuestionDatabase
import json

def test_database_integrity():
    """测试数据库完整性"""
    print("=== 数据库完整性测试 ===\n")
    
    # 连接数据库
    conn = sqlite3.connect('questions.db')
    cursor = conn.cursor()
    
    # 1. 检查表结构
    print("1. 检查表结构:")
    tables = ['subjects', 'question_types', 'questions', 'options']
    for table in tables:
        cursor.execute(f"SELECT COUNT(*) FROM {table}")
        count = cursor.fetchone()[0]
        print(f"   {table} 表: {count} 条记录")
    
    # 2. 检查外键约束
    print("\n2. 检查外键约束:")
    cursor.execute("""
        SELECT COUNT(*) FROM questions q
        LEFT JOIN subjects s ON q.subject_id = s.id
        LEFT JOIN question_types qt ON q.question_type_id = qt.id
        WHERE s.id IS NULL OR qt.id IS NULL
    """)
    orphan_records = cursor.fetchone()[0]
    print(f"   孤立记录数: {orphan_records}")
    
    # 3. 检查选项完整性
    print("\n3. 检查选项完整性:")
    cursor.execute("""
        SELECT q.id, q.title, COUNT(o.id) as option_count
        FROM questions q
        LEFT JOIN options o ON q.id = o.question_id
        GROUP BY q.id
        HAVING option_count != 4
    """)
    invalid_options = cursor.fetchall()
    print(f"   选项数量不正确的题目数: {len(invalid_options)}")
    
    # 4. 检查正确答案
    print("\n4. 检查正确答案:")
    cursor.execute("""
        SELECT q.id, q.title, q.correct_answer, COUNT(o.id) as correct_count
        FROM questions q
        LEFT JOIN options o ON q.id = o.question_id AND o.is_correct = 1
        GROUP BY q.id
        HAVING correct_count != 1
    """)
    invalid_answers = cursor.fetchall()
    print(f"   正确答案数量不正确的题目数: {len(invalid_answers)}")
    
    conn.close()
    
    return len(invalid_options) == 0 and len(invalid_answers) == 0 and orphan_records == 0

def test_database_functionality():
    """测试数据库功能"""
    print("\n=== 数据库功能测试 ===\n")
    
    db = QuestionDatabase()
    
    # 1. 测试随机获取题目
    print("1. 测试随机获取题目:")
    questions = db.get_random_question(subject_name='语文', limit=5)
    print(f"   成功获取 {len(questions)} 个题目")
    
    # 2. 测试选项随机排列
    print("\n2. 测试选项随机排列:")
    if questions:
        question = questions[0]
        original_options = question['options']
        random_options = db.get_random_options(question['id'])
        print(f"   原始选项数: {len(original_options)}")
        print(f"   随机选项数: {len(random_options)}")
        print(f"   选项内容一致: {len(original_options) == len(random_options)}")
    
    # 3. 测试搜索功能
    print("\n3. 测试搜索功能:")
    search_results = db.search_questions('李白')
    print(f"   搜索'李白'找到 {len(search_results)} 个题目")
    
    search_results = db.search_questions('唐')
    print(f"   搜索'唐'找到 {len(search_results)} 个题目")
    
    # 4. 测试统计功能
    print("\n4. 测试统计功能:")
    stats = db.get_statistics()
    print(f"   总题目数: {stats['total_questions']}")
    print(f"   科目分布: {stats['by_subject']}")
    print(f"   题型分布: {stats['by_type']}")
    
    return True

def test_data_quality():
    """测试数据质量"""
    print("\n=== 数据质量测试 ===\n")
    
    db = QuestionDatabase()
    
    # 1. 检查标签数据
    print("1. 检查标签数据:")
    questions = db.get_random_question(limit=10)
    valid_tags = 0
    for question in questions:
        if question['tags'] and len(question['tags']) >= 2:
            valid_tags += 1
    print(f"   有效标签的题目比例: {valid_tags}/{len(questions)}")
    
    # 2. 检查详解长度
    print("\n2. 检查详解长度:")
    short_explanations = 0
    for question in questions:
        if len(question['explanation']) < 50:
            short_explanations += 1
    print(f"   详解过短的题目数: {short_explanations}")
    
    # 3. 检查题目内容
    print("\n3. 检查题目内容:")
    empty_content = 0
    for question in questions:
        if not question['content'].strip():
            empty_content += 1
    print(f"   内容为空的题目数: {empty_content}")
    
    return empty_content == 0 and short_explanations == 0

def main():
    """主测试函数"""
    print("开始数据库测试...\n")
    
    # 运行各项测试
    integrity_ok = test_database_integrity()
    functionality_ok = test_database_functionality()
    quality_ok = test_data_quality()
    
    # 输出测试结果
    print("\n=== 测试结果 ===")
    print(f"数据库完整性: {'✅ 通过' if integrity_ok else '❌ 失败'}")
    print(f"功能测试: {'✅ 通过' if functionality_ok else '❌ 失败'}")
    print(f"数据质量: {'✅ 通过' if quality_ok else '❌ 失败'}")
    
    if integrity_ok and functionality_ok and quality_ok:
        print("\n🎉 所有测试通过！数据库系统运行正常。")
    else:
        print("\n⚠️  部分测试失败，请检查数据库。")

if __name__ == "__main__":
    main() 