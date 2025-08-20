#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
数据库使用示例
展示如何使用题目数据库系统
"""

from query_database import QuestionDatabase, print_question
import random

def main():
    """主函数 - 展示数据库使用方法"""
    print("=== 题目数据库使用示例 ===\n")
    
    # 创建数据库连接
    db = QuestionDatabase()
    
    # 1. 获取数据库统计信息
    print("1. 数据库统计信息:")
    stats = db.get_statistics()
    print(f"   总题目数: {stats['total_questions']}")
    print(f"   按科目分布: {stats['by_subject']}")
    print(f"   按题型分布: {stats['by_type']}")
    print()
    
    # 2. 随机获取题目（不显示答案）
    print("2. 随机获取一个题目（不显示答案）:")
    questions = db.get_random_question(subject_name='语文', limit=1)
    if questions:
        question = questions[0]
        # 添加随机选项
        question['random_options'] = db.get_random_options(question['id'])
        print_question(question, show_answer=False, randomize_options=True)
    
    # 3. 获取题目并显示答案
    print("\n3. 获取题目并显示答案:")
    questions = db.get_random_question(subject_name='语文', limit=1)
    if questions:
        question = questions[0]
        question['random_options'] = db.get_random_options(question['id'])
        print_question(question, show_answer=True, randomize_options=True)
    
    # 4. 搜索特定作者的题目
    print("\n4. 搜索李白的题目:")
    search_results = db.search_questions('李白', subject_name='语文')
    if search_results:
        print(f"   找到 {len(search_results)} 个李白的题目:")
        for i, question in enumerate(search_results[:3], 1):  # 只显示前3个
            print(f"   {i}. {question['title']}")
    
    # 5. 搜索特定朝代的题目
    print("\n5. 搜索唐代的题目:")
    search_results = db.search_questions('唐', subject_name='语文')
    if search_results:
        print(f"   找到 {len(search_results)} 个唐代的题目")
        # 随机显示一个
        random_question = random.choice(search_results)
        random_question['random_options'] = db.get_random_options(random_question['id'])
        print_question(random_question, show_answer=True, randomize_options=True)
    
    # 6. 演示选项随机排列
    print("\n6. 演示选项随机排列（同一题目，不同顺序）:")
    questions = db.get_random_question(subject_name='语文', limit=1)
    if questions:
        question = questions[0]
        
        # 显示原始顺序
        print("   原始顺序:")
        for i, option in enumerate(question['options'], 1):
            print(f"   {i}. {option['text']}")
        
        # 显示随机顺序1
        random_options1 = db.get_random_options(question['id'])
        print("   随机顺序1:")
        for i, option in enumerate(random_options1, 1):
            print(f"   {i}. {option['text']}")
        
        # 显示随机顺序2
        random_options2 = db.get_random_options(question['id'])
        print("   随机顺序2:")
        for i, option in enumerate(random_options2, 1):
            print(f"   {i}. {option['text']}")
    
    print("\n=== 示例结束 ===")

if __name__ == "__main__":
    main() 