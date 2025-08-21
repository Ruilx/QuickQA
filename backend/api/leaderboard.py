#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
排行榜相关API
"""

from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
import sqlite3

def get_db():
    """获取数据库连接"""
    conn = sqlite3.connect('../database/quiz_app.db')
    conn.row_factory = sqlite3.Row
    return conn

def register_leaderboard_routes(app):
    """注册排行榜相关路由"""
    
    @app.route('/api/leaderboard/speed', methods=['GET'])
    @jwt_required()
    def get_speed_leaderboard():
        """获取速答模式排行榜"""
        try:
            limit = min(int(request.args.get('limit', 50)), 100)  # 最多100条
            
            with get_db() as conn:
                # 取每个用户的最佳成绩：正确数最多，其次用时最少，最后时间最近
                cursor = conn.execute("""
                    SELECT 
                        ROW_NUMBER() OVER (ORDER BY t.correct_answers DESC, t.time_spent ASC, t.created_at DESC) as rank,
                        t.username, t.user_id, t.correct_answers, t.total_questions, t.time_spent, t.accuracy, t.created_at
                    FROM (
                        SELECT 
                            u.username,
                            u.id as user_id,
                            qr.correct_answers,
                            qr.total_questions,
                            qr.time_spent,
                            ROUND(qr.correct_answers * 100.0 / qr.total_questions, 2) as accuracy,
                            qr.created_at,
                            ROW_NUMBER() OVER (
                                PARTITION BY u.id
                                ORDER BY qr.correct_answers DESC, qr.time_spent ASC, qr.created_at DESC
                            ) as rn
                        FROM quiz_records qr
                        JOIN users u ON qr.user_id = u.id
                        WHERE qr.mode = 'speed' AND qr.completed = TRUE
                    ) t
                    WHERE t.rn = 1
                    ORDER BY t.correct_answers DESC, t.time_spent ASC, t.created_at DESC
                    LIMIT ?
                """, (limit,))
                
                leaderboard = []
                for row in cursor.fetchall():
                    leaderboard.append({
                        'rank': row['rank'],
                        'username': row['username'],
                        'user_id': row['user_id'],
                        'correct_answers': row['correct_answers'],
                        'total_questions': row['total_questions'],
                        'accuracy': row['accuracy'],
                        'time_spent': row['time_spent'],
                        'created_at': row['created_at']
                    })
                
                return jsonify({
                    'leaderboard': leaderboard,
                    'mode': 'speed',
                    'total': len(leaderboard)
                }), 200
                
        except Exception as e:
            return jsonify({'error': f'服务器错误: {str(e)}'}), 500
    
    @app.route('/api/leaderboard/study', methods=['GET'])
    @jwt_required()
    def get_study_leaderboard():
        """获取学习模式排行榜"""
        try:
            limit = min(int(request.args.get('limit', 50)), 100)  # 最多100条
            
            with get_db() as conn:
                cursor = conn.execute("""
                    SELECT 
                        ROW_NUMBER() OVER (ORDER BY t.total_questions DESC, t.time_spent DESC, t.created_at DESC) as rank,
                        t.username, t.user_id, t.total_questions, t.time_spent, t.created_at
                    FROM (
                        SELECT 
                            u.username,
                            u.id as user_id,
                            qr.total_questions,
                            qr.time_spent,
                            qr.created_at,
                            ROW_NUMBER() OVER (
                                PARTITION BY u.id
                                ORDER BY qr.total_questions DESC, qr.time_spent DESC, qr.created_at DESC
                            ) as rn
                        FROM quiz_records qr
                        JOIN users u ON qr.user_id = u.id
                        WHERE qr.mode = 'study' AND qr.completed = TRUE
                    ) t
                    WHERE t.rn = 1
                    ORDER BY t.total_questions DESC, t.time_spent DESC, t.created_at DESC
                    LIMIT ?
                """, (limit,))
                
                leaderboard = []
                for row in cursor.fetchall():
                    leaderboard.append({
                        'rank': row['rank'],
                        'username': row['username'],
                        'user_id': row['user_id'],
                        'total_questions': row['total_questions'],
                        'time_spent': row['time_spent'],
                        'created_at': row['created_at']
                    })
                
                return jsonify({
                    'leaderboard': leaderboard,
                    'mode': 'study',
                    'total': len(leaderboard)
                }), 200
                
        except Exception as e:
            return jsonify({'error': f'服务器错误: {str(e)}'}), 500
    
    @app.route('/api/leaderboard/personal', methods=['GET'])
    @jwt_required()
    def get_personal_best():
        """获取个人最佳成绩"""
        try:
            user_id = get_jwt_identity()
            
            with get_db() as conn:
                # 获取速答模式最佳成绩
                cursor = conn.execute("""
                    SELECT correct_answers, total_questions, time_spent, accuracy, 
                           created_at, rank
                    FROM speed_leaderboard
                    WHERE user_id = ?
                    ORDER BY rank
                    LIMIT 1
                """, (user_id,))
                
                speed_best = cursor.fetchone()
                
                # 获取学习模式最佳成绩
                cursor = conn.execute("""
                    SELECT total_questions, time_spent, created_at, rank
                    FROM study_leaderboard
                    WHERE user_id = ?
                    ORDER BY rank
                    LIMIT 1
                """, (user_id,))
                
                study_best = cursor.fetchone()
                
                # 获取总体统计
                cursor = conn.execute("""
                    SELECT overall_accuracy, total_sessions, speed_sessions, 
                           study_sessions, last_activity
                    FROM user_stats
                    WHERE id = ?
                """, (user_id,))
                
                stats = cursor.fetchone()
                
                result = {
                    'speed_best': None,
                    'study_best': None,
                    'overall_stats': None
                }
                
                if speed_best:
                    result['speed_best'] = {
                        'rank': speed_best['rank'],
                        'correct_answers': speed_best['correct_answers'],
                        'total_questions': speed_best['total_questions'],
                        'accuracy': speed_best['accuracy'],
                        'time_spent': speed_best['time_spent'],
                        'created_at': speed_best['created_at']
                    }
                
                if study_best:
                    result['study_best'] = {
                        'rank': study_best['rank'],
                        'total_questions': study_best['total_questions'],
                        'time_spent': study_best['time_spent'],
                        'created_at': study_best['created_at']
                    }
                
                if stats:
                    result['overall_stats'] = {
                        'overall_accuracy': stats['overall_accuracy'] or 0,
                        'total_sessions': stats['total_sessions'] or 0,
                        'speed_sessions': stats['speed_sessions'] or 0,
                        'study_sessions': stats['study_sessions'] or 0,
                        'last_activity': stats['last_activity']
                    }
                
                return jsonify(result), 200
                
        except Exception as e:
            return jsonify({'error': f'服务器错误: {str(e)}'}), 500
    
    @app.route('/api/leaderboard/stats', methods=['GET'])
    @jwt_required()
    def get_leaderboard_stats():
        """获取排行榜统计信息"""
        try:
            with get_db() as conn:
                # 速答模式统计
                cursor = conn.execute("""
                    SELECT 
                        COUNT(*) as total_records,
                        AVG(correct_answers) as avg_correct,
                        AVG(accuracy) as avg_accuracy,
                        AVG(time_spent) as avg_time,
                        MAX(correct_answers) as max_correct,
                        MIN(time_spent) as min_time
                    FROM speed_leaderboard
                """)
                
                speed_stats = cursor.fetchone()
                
                # 学习模式统计
                cursor = conn.execute("""
                    SELECT 
                        COUNT(*) as total_records,
                        AVG(total_questions) as avg_questions,
                        AVG(time_spent) as avg_time,
                        MAX(total_questions) as max_questions,
                        MAX(time_spent) as max_time
                    FROM study_leaderboard
                """)
                
                study_stats = cursor.fetchone()
                
                # 用户活跃度统计
                cursor = conn.execute("""
                    SELECT 
                        COUNT(*) as total_users,
                        COUNT(CASE WHEN last_activity >= date('now', '-7 days') THEN 1 END) as weekly_active,
                        COUNT(CASE WHEN last_activity >= date('now', '-30 days') THEN 1 END) as monthly_active
                    FROM user_stats
                    WHERE total_sessions > 0
                """)
                
                user_stats = cursor.fetchone()
                
                return jsonify({
                    'speed_mode': {
                        'total_records': speed_stats['total_records'],
                        'avg_correct_answers': round(speed_stats['avg_correct'] or 0, 1),
                        'avg_accuracy': round(speed_stats['avg_accuracy'] or 0, 1),
                        'avg_time_spent': round(speed_stats['avg_time'] or 0, 1),
                        'max_correct_answers': speed_stats['max_correct'] or 0,
                        'min_time_spent': speed_stats['min_time'] or 0
                    },
                    'study_mode': {
                        'total_records': study_stats['total_records'],
                        'avg_questions': round(study_stats['avg_questions'] or 0, 1),
                        'avg_time_spent': round(study_stats['avg_time'] or 0, 1),
                        'max_questions': study_stats['max_questions'] or 0,
                        'max_time_spent': study_stats['max_time'] or 0
                    },
                    'users': {
                        'total_active_users': user_stats['total_users'],
                        'weekly_active_users': user_stats['weekly_active'],
                        'monthly_active_users': user_stats['monthly_active']
                    }
                }), 200
                
        except Exception as e:
            return jsonify({'error': f'服务器错误: {str(e)}'}), 500