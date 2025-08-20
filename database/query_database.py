#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
数据库查询工具
提供各种查询功能，支持随机获取题目和选项
"""

import sqlite3
import json
import random
from typing import List, Dict, Optional

class QuestionDatabase:
    def __init__(self, db_path='questions.db'):
        self.db_path = db_path
        self.conn = None
        self.cursor = None
        
    def connect_db(self):
        """连接数据库"""
        self.conn = sqlite3.connect(self.db_path)
        self.cursor = self.conn.cursor()
        
    def close_db(self):
        """关闭数据库连接"""
        if self.conn:
            self.conn.close()
            
    def get_random_question(self, subject_name: str = None, question_type: str = None, 
                           difficulty_level: int = None, limit: int = 1) -> List[Dict]:
        """随机获取题目"""
        self.connect_db()
        
        query = """
            SELECT q.id, q.title, q.content, q.correct_answer, q.explanation,
                   q.difficulty_level, q.tags, q.source,
                   s.name as subject_name, qt.name as question_type_name
            FROM questions q
            JOIN subjects s ON q.subject_id = s.id
            JOIN question_types qt ON q.question_type_id = qt.id
            WHERE 1=1
        """
        params = []
        
        if subject_name:
            query += " AND s.name = ?"
            params.append(subject_name)
            
        if question_type:
            query += " AND qt.name = ?"
            params.append(question_type)
            
        if difficulty_level:
            query += " AND q.difficulty_level = ?"
            params.append(difficulty_level)
            
        query += " ORDER BY RANDOM() LIMIT ?"
        params.append(limit)
        
        self.cursor.execute(query, params)
        questions = []
        
        for row in self.cursor.fetchall():
            question = {
                'id': row[0],
                'title': row[1],
                'content': row[2],
                'correct_answer': row[3],
                'explanation': row[4],
                'difficulty_level': row[5],
                'tags': json.loads(row[6]) if row[6] else [],
                'source': row[7],
                'subject_name': row[8],
                'question_type_name': row[9],
                'options': self.get_options_for_question(row[0])
            }
            questions.append(question)
            
        self.close_db()
        return questions
    
    def get_options_for_question(self, question_id: int) -> List[Dict]:
        """获取题目的选项"""
        self.connect_db()
        query = "SELECT option_text, is_correct, option_order FROM options WHERE question_id = ? ORDER BY option_order"
        self.cursor.execute(query, (question_id,))
        
        options = []
        for row in self.cursor.fetchall():
            options.append({
                'text': row[0],
                'is_correct': bool(row[1]),
                'order': row[2]
            })
        self.close_db()
        return options
    
    def get_random_options(self, question_id: int) -> List[Dict]:
        """获取随机排列的选项"""
        options = self.get_options_for_question(question_id)
        random.shuffle(options)
        return options
    
    def get_question_by_id(self, question_id: int) -> Optional[Dict]:
        """根据ID获取题目"""
        self.connect_db()
        
        query = """
            SELECT q.id, q.title, q.content, q.correct_answer, q.explanation,
                   q.difficulty_level, q.tags, q.source,
                   s.name as subject_name, qt.name as question_type_name
            FROM questions q
            JOIN subjects s ON q.subject_id = s.id
            JOIN question_types qt ON q.question_type_id = qt.id
            WHERE q.id = ?
        """
        
        self.cursor.execute(query, (question_id,))
        row = self.cursor.fetchone()
        
        if row:
            question = {
                'id': row[0],
                'title': row[1],
                'content': row[2],
                'correct_answer': row[3],
                'explanation': row[4],
                'difficulty_level': row[5],
                'tags': json.loads(row[6]) if row[6] else [],
                'source': row[7],
                'subject_name': row[8],
                'question_type_name': row[9],
                'options': self.get_options_for_question(row[0])
            }
            self.close_db()
            return question
        
        self.close_db()
        return None
    
    def search_questions(self, keyword: str, subject_name: str = None) -> List[Dict]:
        """搜索题目"""
        self.connect_db()
        
        query = """
            SELECT q.id, q.title, q.content, q.correct_answer, q.explanation,
                   q.difficulty_level, q.tags, q.source,
                   s.name as subject_name, qt.name as question_type_name
            FROM questions q
            JOIN subjects s ON q.subject_id = s.id
            JOIN question_types qt ON q.question_type_id = qt.id
            WHERE (q.title LIKE ? OR q.content LIKE ? OR q.tags LIKE ?)
        """
        params = [f'%{keyword}%', f'%{keyword}%', f'%{keyword}%']
        
        if subject_name:
            query += " AND s.name = ?"
            params.append(subject_name)
            
        self.cursor.execute(query, params)
        questions = []
        
        for row in self.cursor.fetchall():
            question = {
                'id': row[0],
                'title': row[1],
                'content': row[2],
                'correct_answer': row[3],
                'explanation': row[4],
                'difficulty_level': row[5],
                'tags': json.loads(row[6]) if row[6] else [],
                'source': row[7],
                'subject_name': row[8],
                'question_type_name': row[9],
                'options': self.get_options_for_question(row[0])
            }
            questions.append(question)
            
        self.close_db()
        return questions
    
    def get_statistics(self) -> Dict:
        """获取数据库统计信息"""
        self.connect_db()
        
        stats = {}
        
        # 总题目数
        self.cursor.execute("SELECT COUNT(*) FROM questions")
        stats['total_questions'] = self.cursor.fetchone()[0]
        
        # 按科目统计
        self.cursor.execute("""
            SELECT s.name, COUNT(*) 
            FROM questions q 
            JOIN subjects s ON q.subject_id = s.id 
            GROUP BY s.name
        """)
        stats['by_subject'] = dict(self.cursor.fetchall())
        
        # 按题型统计
        self.cursor.execute("""
            SELECT qt.name, COUNT(*) 
            FROM questions q 
            JOIN question_types qt ON q.question_type_id = qt.id 
            GROUP BY qt.name
        """)
        stats['by_type'] = dict(self.cursor.fetchall())
        
        # 按难度统计
        self.cursor.execute("""
            SELECT difficulty_level, COUNT(*) 
            FROM questions 
            GROUP BY difficulty_level
        """)
        stats['by_difficulty'] = dict(self.cursor.fetchall())
        
        self.close_db()
        return stats

def print_question(question: Dict, show_answer: bool = False, randomize_options: bool = True):
    """打印题目"""
    print(f"\n{'='*60}")
    print(f"题目ID: {question['id']}")
    print(f"标题: {question['title']}")
    print(f"科目: {question['subject_name']}")
    print(f"题型: {question['question_type_name']}")
    print(f"难度: {question['difficulty_level']}")
    print(f"标签: {', '.join(question['tags'])}")
    print(f"\n题干: {question['content']}")
    
    # 获取选项
    if randomize_options:
        options = question.get('random_options', question['options'])
    else:
        options = question['options']
    
    print(f"\n选项:")
    for i, option in enumerate(options, 1):
        print(f"{i}. {option['text']}")
    
    if show_answer:
        print(f"\n正确答案: {question['correct_answer']}")
        print(f"\n详解: {question['explanation']}")
    
    print(f"{'='*60}")

def main():
    """主函数 - 演示功能"""
    db = QuestionDatabase()
    
    print("=== 古诗词题目数据库查询工具 ===")
    
    # 获取统计信息
    stats = db.get_statistics()
    print(f"\n数据库统计:")
    print(f"总题目数: {stats['total_questions']}")
    print(f"按科目: {stats['by_subject']}")
    print(f"按题型: {stats['by_type']}")
    
    # 随机获取一个题目
    print(f"\n随机获取一个古诗词题目:")
    questions = db.get_random_question(subject_name='语文', limit=1)
    if questions:
        question = questions[0]
        # 添加随机选项
        question['random_options'] = db.get_random_options(question['id'])
        print_question(question, show_answer=True, randomize_options=True)
    
    # 搜索包含"李白"的题目
    print(f"\n搜索包含'李白'的题目:")
    search_results = db.search_questions('李白', subject_name='语文')
    if search_results:
        question = search_results[0]
        question['random_options'] = db.get_random_options(question['id'])
        print_question(question, show_answer=True, randomize_options=True)

if __name__ == "__main__":
    main() 