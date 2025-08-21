#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
答题相关API
"""

from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
import sqlite3
import datetime
import json

def get_db():
    """获取数据库连接"""
    conn = sqlite3.connect('../database/quiz_app.db')
    conn.row_factory = sqlite3.Row
    return conn

def register_quiz_routes(app):
    """注册答题相关路由"""
    
    @app.route('/api/quiz/start', methods=['POST'])
    @jwt_required()
    def start_quiz():
        """开始答题"""
        try:
            user_id = get_jwt_identity()
            data = request.get_json()
            mode = data.get('mode')  # 'speed' 或 'study'
            
            if mode not in ['speed', 'study']:
                return jsonify({'error': '无效的答题模式'}), 400
            
            with get_db() as conn:
                # 创建答题记录
                cursor = conn.execute("""
                    INSERT INTO quiz_records (user_id, mode, start_time)
                    VALUES (?, ?, ?)
                """, (user_id, mode, datetime.datetime.now()))
                
                quiz_record_id = cursor.lastrowid
                conn.commit()
                
                return jsonify({
                    'quiz_record_id': quiz_record_id,
                    'mode': mode,
                    'start_time': datetime.datetime.now().isoformat()
                }), 201
                
        except Exception as e:
            return jsonify({'error': f'服务器错误: {str(e)}'}), 500
    
    @app.route('/api/quiz/submit-answer', methods=['POST'])
    @jwt_required()
    def submit_answer():
        """提交答案"""
        try:
            user_id = get_jwt_identity()
            data = request.get_json()
            
            quiz_record_id = data.get('quiz_record_id')
            question_id = data.get('question_id')
            selected_option_id = data.get('selected_option_id')
            time_taken = data.get('time_taken', 0)  # 毫秒
            attempt_count = data.get('attempt_count', 1)
            
            if not all([quiz_record_id, question_id, selected_option_id]):
                return jsonify({'error': '缺少必要参数'}), 400
            
            with get_db() as conn:
                # 验证答题记录所有权
                cursor = conn.execute(
                    "SELECT user_id FROM quiz_records WHERE id = ?",
                    (quiz_record_id,)
                )
                record = cursor.fetchone()
                
                if not record or record['user_id'] != user_id:
                    return jsonify({'error': '无效的答题记录'}), 403
                
                # 检查选项是否正确
                cursor = conn.execute(
                    "SELECT is_correct FROM options WHERE id = ? AND question_id = ?",
                    (selected_option_id, question_id)
                )
                option = cursor.fetchone()
                
                if not option:
                    return jsonify({'error': '无效的选项'}), 400
                
                is_correct = bool(option['is_correct'])
                # 记录答题（同一题目在同一次答题记录中只保留一行，累计尝试次数与用时）
                existing = conn.execute(
                    "SELECT id, attempt_count, time_taken FROM question_answers WHERE quiz_record_id = ? AND question_id = ?",
                    (quiz_record_id, question_id)
                ).fetchone()

                if existing:
                    new_attempts = (existing['attempt_count'] or 0) + 1
                    new_time = (existing['time_taken'] or 0) + (time_taken or 0)
                    conn.execute(
                        """
                        UPDATE question_answers
                        SET selected_option_id = ?, is_correct = ?, attempt_count = ?, time_taken = ?
                        WHERE id = ?
                        """,
                        (selected_option_id, is_correct, new_attempts, new_time, existing['id'])
                    )
                else:
                    conn.execute(
                        """
                        INSERT INTO question_answers 
                        (quiz_record_id, question_id, selected_option_id, is_correct, attempt_count, time_taken)
                        VALUES (?, ?, ?, ?, ?, ?)
                        """,
                        (quiz_record_id, question_id, selected_option_id, is_correct, max(1, int(attempt_count or 1)), time_taken)
                    )

                conn.commit()
                
                return jsonify({
                    'is_correct': is_correct,
                    'message': '答案已提交'
                }), 200
                
        except Exception as e:
            return jsonify({'error': f'服务器错误: {str(e)}'}), 500
    
    @app.route('/api/quiz/finish', methods=['POST'])
    @jwt_required()
    def finish_quiz():
        """结束答题"""
        try:
            user_id = get_jwt_identity()
            data = request.get_json()
            quiz_record_id = data.get('quiz_record_id')
            
            if not quiz_record_id:
                return jsonify({'error': '缺少答题记录ID'}), 400
            
            with get_db() as conn:
                # 验证答题记录所有权
                cursor = conn.execute(
                    "SELECT user_id, start_time, mode FROM quiz_records WHERE id = ?",
                    (quiz_record_id,)
                )
                record = cursor.fetchone()
                
                if not record or record['user_id'] != user_id:
                    return jsonify({'error': '无效的答题记录'}), 403
                
                # 计算统计信息
                cursor = conn.execute("""
                    SELECT 
                        COUNT(DISTINCT question_id) as total_questions,
                        SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) as correct_answers
                    FROM question_answers 
                    WHERE quiz_record_id = ?
                """, (quiz_record_id,))
                
                stats = cursor.fetchone()
                
                # 计算用时（秒）
                # 兼容 SQLite 默认格式（空格/"T" 分隔）
                start_time = datetime.datetime.fromisoformat(str(record['start_time']).replace(' ', 'T'))
                end_time = datetime.datetime.now()
                time_spent = int((end_time - start_time).total_seconds())
                
                # 更新答题记录
                conn.execute("""
                    UPDATE quiz_records 
                    SET end_time = ?, total_questions = ?, correct_answers = ?, 
                        time_spent = ?, completed = TRUE
                    WHERE id = ?
                """, (end_time, stats['total_questions'], stats['correct_answers'], 
                      time_spent, quiz_record_id))
                
                conn.commit()
                
                # 计算准确率
                accuracy = 0
                if stats['total_questions'] > 0:
                    accuracy = round(stats['correct_answers'] * 100.0 / stats['total_questions'], 2)
                
                return jsonify({
                    'total_questions': stats['total_questions'],
                    'correct_answers': stats['correct_answers'],
                    'accuracy': accuracy,
                    'time_spent': time_spent,
                    'mode': record['mode'],
                    'end_time': end_time.isoformat()
                }), 200
                
        except Exception as e:
            return jsonify({'error': f'服务器错误: {str(e)}'}), 500
    
    @app.route('/api/quiz/history', methods=['GET'])
    @jwt_required()
    def get_quiz_history():
        """获取答题历史"""
        try:
            user_id = get_jwt_identity()
            mode = request.args.get('mode')  # 可选的模式筛选
            limit = min(int(request.args.get('limit', 20)), 100)  # 最多100条
            
            with get_db() as conn:
                query = """
                    SELECT id, mode, start_time, end_time, total_questions, 
                           correct_answers, time_spent, completed, created_at
                    FROM quiz_records 
                    WHERE user_id = ?
                """
                params = [user_id]
                
                if mode and mode in ['speed', 'study']:
                    query += " AND mode = ?"
                    params.append(mode)
                
                query += " ORDER BY created_at DESC LIMIT ?"
                params.append(limit)
                
                cursor = conn.execute(query, params)
                records = []
                
                for row in cursor.fetchall():
                    accuracy = 0
                    if row['total_questions'] and row['total_questions'] > 0:
                        accuracy = round(row['correct_answers'] * 100.0 / row['total_questions'], 2)
                    
                    records.append({
                        'id': row['id'],
                        'mode': row['mode'],
                        'start_time': row['start_time'],
                        'end_time': row['end_time'],
                        'total_questions': row['total_questions'],
                        'correct_answers': row['correct_answers'],
                        'accuracy': accuracy,
                        'time_spent': row['time_spent'],
                        'completed': bool(row['completed']),
                        'created_at': row['created_at']
                    })
                
                return jsonify({
                    'records': records,
                    'total': len(records)
                }), 200
                
        except Exception as e:
            return jsonify({'error': f'服务器错误: {str(e)}'}), 500
    
    @app.route('/api/quiz/<int:quiz_record_id>/details', methods=['GET'])
    @jwt_required()
    def get_quiz_details():
        """获取答题详情"""
        try:
            user_id = get_jwt_identity()
            quiz_record_id = request.view_args['quiz_record_id']
            
            with get_db() as conn:
                # 验证答题记录所有权
                cursor = conn.execute(
                    "SELECT user_id FROM quiz_records WHERE id = ?",
                    (quiz_record_id,)
                )
                record = cursor.fetchone()
                
                if not record or record['user_id'] != user_id:
                    return jsonify({'error': '无权访问此答题记录'}), 403
                
                # 获取答题详情
                cursor = conn.execute("""
                    SELECT qa.*, q.title, q.content, q.explanation, q.correct_answer,
                           o.option_text as selected_text, co.option_text as correct_text
                    FROM question_answers qa
                    JOIN questions q ON qa.question_id = q.id
                    LEFT JOIN options o ON qa.selected_option_id = o.id
                    LEFT JOIN options co ON q.id = co.question_id AND co.is_correct = 1
                    WHERE qa.quiz_record_id = ?
                    ORDER BY qa.answered_at
                """, (quiz_record_id,))
                
                details = []
                for row in cursor.fetchall():
                    details.append({
                        'question_id': row['question_id'],
                        'question_title': row['title'],
                        'question_content': row['content'],
                        'selected_text': row['selected_text'],
                        'correct_text': row['correct_text'],
                        'is_correct': bool(row['is_correct']),
                        'attempt_count': row['attempt_count'],
                        'time_taken': row['time_taken'],
                        'explanation': row['explanation'],
                        'answered_at': row['answered_at']
                    })
                
                return jsonify({
                    'quiz_record_id': quiz_record_id,
                    'details': details
                }), 200
                
        except Exception as e:
            return jsonify({'error': f'服务器错误: {str(e)}'}), 500