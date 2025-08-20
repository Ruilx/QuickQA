#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
古诗词题目导入脚本
将小学古诗词专项练习.txt中的题目导入到SQLite数据库中
"""

import sqlite3
import re
import json
from datetime import datetime

class QuestionImporter:
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
            
    def init_database(self):
        """初始化数据库（如果表不存在才创建）"""
        # 检查是否已有基础表
        self.cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='subjects'")
        if not self.cursor.fetchone():
            with open('database_schema.sql', 'r', encoding='utf-8') as f:
                schema = f.read()
                self.cursor.executescript(schema)
            self.conn.commit()
        
    def parse_question_file(self, file_path):
        """解析题目文件"""
        questions = []
        
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # 使用正则表达式匹配每个题目
        # 匹配格式：**数字. 《标题》 朝代**
        pattern = r'\*\*(\d+)\.\s*《([^》]+)》\s*([^*]+)\*\*\s*\n(.*?)(?=\*\*\d+\.|$)'
        matches = re.findall(pattern, content, re.DOTALL)
        
        for match in matches:
            question_num = int(match[0])
            title = match[1].strip()
            dynasty = match[2].strip()
            question_content = match[3].strip()
            
            # 解析题目内容
            question_data = self.parse_question_content(question_content, title, dynasty)
            if question_data:
                question_data['question_num'] = question_num
                questions.append(question_data)
                
        return questions
    
    def parse_question_content(self, content, title, dynasty):
        """解析单个题目内容"""
        lines = content.split('\n')
        
        # 提取题干（第一行）
        question_text = lines[0].strip()
        
        # 提取选项
        options = []
        correct_answer = None
        explanation = None
        
        for line in lines[1:]:
            line = line.strip()
            if not line:
                continue
                
            # 匹配选项行 A. 翩翩 B. 田田 C. 尖尖 D. 圆圆
            if re.match(r'^[A-D]\.\s+.+\s+[B-D]\.\s+.+\s+[C-D]\.\s+.+\s+D\.\s+.+$', line):
                # 解析一行中的四个选项
                option_parts = re.findall(r'([A-D])\.\s+([^A-D]+?)(?=\s+[A-D]\.|$)', line)
                for letter, text in option_parts:
                    options.append({
                        'letter': letter,
                        'text': text.strip()
                    })
                continue
                
            # 匹配正确答案
            if line.startswith('**【正确答案】'):
                correct_answer = line.replace('**【正确答案】', '').strip().replace('**', '')
                continue
                
            # 匹配详解
            if line.startswith('**【详解】**'):
                explanation = line.replace('**【详解】**', '').strip()
                continue
                
        # 如果还没有找到详解，继续查找
        if not explanation:
            for line in lines:
                if '【详解】' in line and not line.startswith('**【详解】**'):
                    explanation = line.replace('【详解】', '').strip()
                    break
        
        if not options or not correct_answer or not explanation:
            print(f"解析失败: {title}")
            return None
            
        return {
            'title': f"《{title}》 {dynasty}",
            'content': question_text,
            'options': options,
            'correct_answer': correct_answer,
            'explanation': explanation
        }
    
    def insert_question(self, question_data):
        """插入题目到数据库"""
        try:
            # 获取科目和题型ID
            self.cursor.execute("SELECT id FROM subjects WHERE name = ?", ('语文',))
            subject_id = self.cursor.fetchone()[0]
            
            self.cursor.execute("SELECT id FROM question_types WHERE name = ?", ('选择题',))
            question_type_id = self.cursor.fetchone()[0]
            
            # 提取朝代信息用于标签
            dynasty_match = re.search(r'（([^）]+)）', question_data['title'])
            dynasty = dynasty_match.group(1) if dynasty_match else "未知"
            
            # 提取作者信息
            author_match = re.search(r'（[^）]+）([^》]+)', question_data['title'])
            author = author_match.group(1).strip() if author_match else "佚名"
            
            # 创建标签
            tags = ["古诗词", dynasty, author]
            
            # 插入题目
            self.cursor.execute("""
                INSERT INTO questions (subject_id, question_type_id, title, content, 
                                    correct_answer, explanation, tags, source)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                subject_id, question_type_id, question_data['title'], 
                question_data['content'], question_data['correct_answer'], 
                question_data['explanation'], json.dumps(tags, ensure_ascii=False),
                "小学古诗词专项练习"
            ))
            
            question_id = self.cursor.lastrowid
            
            # 插入选项
            for i, option in enumerate(question_data['options']):
                is_correct = option['letter'] == question_data['correct_answer']
                self.cursor.execute("""
                    INSERT INTO options (question_id, option_text, is_correct, option_order)
                    VALUES (?, ?, ?, ?)
                """, (question_id, option['text'], is_correct, i))
                
            return question_id
            
        except Exception as e:
            print(f"插入题目失败: {question_data['title']}, 错误: {e}")
            return None
    
    def import_questions(self, file_path):
        """导入题目"""
        print("开始导入题目...")
        
        # 连接数据库
        self.connect_db()
        
        # 初始化数据库
        self.init_database()
        
        # 解析题目文件
        questions = self.parse_question_file(file_path)
        print(f"解析到 {len(questions)} 个题目")
        
        # 插入题目
        success_count = 0
        for question in questions:
            question_id = self.insert_question(question)
            if question_id:
                success_count += 1
                print(f"成功导入题目 {question['question_num']}: {question['title']}")
        
        # 提交事务
        self.conn.commit()
        
        print(f"导入完成！成功导入 {success_count} 个题目")
        
        # 关闭数据库连接
        self.close_db()

def main():
    """主函数"""
    importer = QuestionImporter()
    importer.import_questions('小学古诗词专项练习.txt')

if __name__ == "__main__":
    main() 