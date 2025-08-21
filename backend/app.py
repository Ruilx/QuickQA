#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
快问快答答题系统 - Flask后端主应用
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity, get_jwt
import sqlite3
import hashlib
import datetime
import secrets
import os
from functools import wraps

# 创建Flask应用
app = Flask(__name__, static_folder=None, static_url_path=None)

# 配置
app.config['SECRET_KEY'] = 'your-secret-key-change-this'  # 在生产环境中使用随机生成的密钥
app.config['JWT_SECRET_KEY'] = 'jwt-secret-string-change-this'  # 在生产环境中使用随机生成的密钥
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = datetime.timedelta(hours=24)

# 初始化扩展
CORS(app)  # 允许跨域请求
jwt = JWTManager(app)

# 数据库路径
DATABASE_PATH = '../database/quiz_app.db' if not os.path.exists('database/quiz_app.db') else 'database/quiz_app.db'

def get_db():
    """获取数据库连接"""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row  # 使查询结果可以像字典一样访问
    return conn

def hash_password(password):
    """密码哈希"""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password, hashed):
    """验证密码"""
    return hashlib.sha256(password.encode()).hexdigest() == hashed

# JWT相关处理
@jwt.token_in_blocklist_loader
def check_if_token_revoked(jwt_header, jwt_payload):
    """检查JWT令牌是否被撤销"""
    jti = jwt_payload['jti']
    
    with get_db() as conn:
        cursor = conn.execute(
            "SELECT is_active FROM user_sessions WHERE token_jti = ?",
            (jti,)
        )
        result = cursor.fetchone()
        
        if result is None:
            return True  # 令牌不存在，视为已撤销
        
        return not result['is_active']

# 错误处理
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

def _dist_root():
    """返回前端构建产物目录(frontend/dist)"""
    candidates = [
        os.path.join('..', 'frontend', 'dist'),
        os.path.join('frontend', 'dist'),
    ]
    for p in candidates:
        if os.path.exists(p):
            return p
    return None

# 静态文件服务（旧 /static 兼容，可留存）
@app.route('/static/<path:filename>')
def serve_static(filename):
    static_path = '../static' if os.path.exists('../static') else 'static'
    file_path = os.path.join(static_path, filename)
    if os.path.exists(file_path):
        return send_from_directory(static_path, filename)
    return jsonify({'error': 'Static file not found'}), 404

@app.route('/')
def index():
    """主页：优先返回 Vue 构建产物，其次才尝试旧前端（已准备删除）"""
    dist = _dist_root()
    if dist and os.path.exists(os.path.join(dist, 'index.html')):
        return send_from_directory(dist, 'index.html')
    # 兼容：若仍存在旧的 frontend 目录
    fallback_path = '../frontend' if os.path.exists('../frontend') else 'frontend'
    if os.path.exists(os.path.join(fallback_path, 'index.html')):
        return send_from_directory(fallback_path, 'index.html')
    return jsonify({'error': 'Frontend not built. 请运行前端构建(frontend)'}), 404

@app.route('/assets/<path:filename>')
def serve_assets(filename):
    """服务 Vue 构建产物中的静态资源 /assets/*"""
    dist = _dist_root()
    if not dist:
        return jsonify({'error': 'Frontend dist not found'}), 404
    assets_root = os.path.join(dist, 'assets')
    file_path = os.path.join(assets_root, filename)
    if os.path.exists(file_path):
        return send_from_directory(assets_root, filename)
    return jsonify({'error': 'Asset not found'}), 404

@app.route('/<path:filename>')
def static_files(filename):
    """兜底：服务前端构建文件"""
    dist = _dist_root()
    if dist and os.path.exists(os.path.join(dist, filename)):
        return send_from_directory(dist, filename)
    return jsonify({'error': 'File not found'}), 404

# =============================================================================
# 用户认证API
# =============================================================================

@app.route('/api/register', methods=['POST'])
def register():
    """用户注册"""
    try:
        data = request.get_json()
        username = data.get('username', '').strip()
        email = data.get('email', '').strip()
        password = data.get('password', '')
        
        # 验证输入
        if not username or not password:
            return jsonify({'error': '用户名和密码不能为空'}), 400
        
        if len(username) < 3:
            return jsonify({'error': '用户名至少需要3个字符'}), 400
        
        if len(password) < 6:
            return jsonify({'error': '密码至少需要6个字符'}), 400
        
        # 哈希密码
        password_hash = hash_password(password)
        
        with get_db() as conn:
            try:
                cursor = conn.execute(
                    "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
                    (username, email, password_hash)
                )
                user_id = cursor.lastrowid
                conn.commit()
                
                return jsonify({
                    'message': '注册成功',
                    'user_id': user_id,
                    'username': username
                }), 201
                
            except sqlite3.IntegrityError as e:
                if 'username' in str(e):
                    return jsonify({'error': '用户名已存在'}), 409
                elif 'email' in str(e):
                    return jsonify({'error': '邮箱已被注册'}), 409
                else:
                    return jsonify({'error': '注册失败'}), 400
                    
    except Exception as e:
        return jsonify({'error': f'服务器错误: {str(e)}'}), 500

@app.route('/api/login', methods=['POST'])
def login():
    """用户登录"""
    try:
        data = request.get_json()
        username = data.get('username', '').strip()
        password = data.get('password', '')
        
        if not username or not password:
            return jsonify({'error': '用户名和密码不能为空'}), 400
        
        with get_db() as conn:
            cursor = conn.execute(
                "SELECT id, username, password_hash FROM users WHERE username = ?",
                (username,)
            )
            user = cursor.fetchone()
            
            if not user or not verify_password(password, user['password_hash']):
                return jsonify({'error': '用户名或密码错误'}), 401
            
            # 创建JWT令牌
            access_token = create_access_token(identity=user['id'])
            
            # 获取JWT信息
            from flask_jwt_extended import decode_token
            decoded_token = decode_token(access_token)
            jti = decoded_token['jti']
            expires_at = datetime.datetime.fromtimestamp(decoded_token['exp'])
            
            # 保存会话信息
            conn.execute(
                "INSERT INTO user_sessions (user_id, token_jti, expires_at) VALUES (?, ?, ?)",
                (user['id'], jti, expires_at)
            )
            
            # 更新最后登录时间
            conn.execute(
                "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?",
                (user['id'],)
            )
            
            conn.commit()
            
            return jsonify({
                'message': '登录成功',
                'access_token': access_token,
                'user_id': user['id'],
                'username': user['username']
            }), 200
            
    except Exception as e:
        return jsonify({'error': f'服务器错误: {str(e)}'}), 500

@app.route('/api/logout', methods=['POST'])
@jwt_required()
def logout():
    """用户登出"""
    try:
        jti = get_jwt()['jti']
        
        with get_db() as conn:
            conn.execute(
                "UPDATE user_sessions SET is_active = FALSE WHERE token_jti = ?",
                (jti,)
            )
            conn.commit()
            
        return jsonify({'message': '登出成功'}), 200
        
    except Exception as e:
        return jsonify({'error': f'服务器错误: {str(e)}'}), 500

@app.route('/api/profile', methods=['GET'])
@jwt_required()
def get_profile():
    """获取用户资料"""
    try:
        user_id = get_jwt_identity()
        
        with get_db() as conn:
            cursor = conn.execute("""
                SELECT u.*, 
                       COALESCE(us.overall_accuracy, 0) as overall_accuracy, 
                       COALESCE(us.total_sessions, 0) as total_sessions, 
                       us.last_activity,
                       COALESCE(us.speed_sessions, 0) as speed_sessions, 
                       COALESCE(us.study_sessions, 0) as study_sessions
                FROM users u
                LEFT JOIN user_stats us ON u.id = us.id
                WHERE u.id = ?
            """, (user_id,))
            
            user = cursor.fetchone()
            
            if not user:
                return jsonify({'error': '用户不存在'}), 404
            
            return jsonify({
                'id': user['id'],
                'username': user['username'],
                'email': user['email'],
                'created_at': user['created_at'],
                'last_login': user['last_login'],
                'total_questions_answered': user['total_questions_answered'],
                'total_correct_answers': user['total_correct_answers'],
                'overall_accuracy': user['overall_accuracy'],
                'total_sessions': user['total_sessions'],
                'speed_sessions': user['speed_sessions'],
                'study_sessions': user['study_sessions'],
                'last_activity': user['last_activity']
            }), 200
            
    except Exception as e:
        return jsonify({'error': f'服务器错误: {str(e)}'}), 500

# =============================================================================
# 题目API
# =============================================================================

@app.route('/api/questions/random', methods=['GET'])
@jwt_required()
def get_random_questions():
    """获取随机题目"""
    try:
        subject_name = request.args.get('subject', '语文')
        limit = int(request.args.get('limit', 0))  # 0表示获取所有题目
        exclude_ids = request.args.get('exclude_ids', '')
        
        # 解析排除的题目ID
        excluded_question_ids = []
        if exclude_ids:
            try:
                excluded_question_ids = [int(x.strip()) for x in exclude_ids.split(',') if x.strip()]
            except ValueError:
                pass
        
        with get_db() as conn:
            # 构建查询
            query = """
                SELECT q.id, q.title, q.content, q.correct_answer, q.explanation,
                       q.difficulty_level, q.tags, q.source,
                       s.name as subject_name, qt.name as question_type_name
                FROM questions q
                JOIN subjects s ON q.subject_id = s.id
                JOIN question_types qt ON q.question_type_id = qt.id
                WHERE s.name = ?
            """
            params = [subject_name]
            
            if excluded_question_ids:
                placeholders = ','.join(['?'] * len(excluded_question_ids))
                query += f" AND q.id NOT IN ({placeholders})"
                params.extend(excluded_question_ids)
            
            query += " ORDER BY RANDOM()"
            if limit > 0:
                query += " LIMIT ?"
                params.append(limit)
            
            cursor = conn.execute(query, params)
            questions = []
            
            for row in cursor.fetchall():
                # 获取题目的选项
                options_cursor = conn.execute("""
                    SELECT id, option_text, is_correct, option_order 
                    FROM options 
                    WHERE question_id = ? 
                    ORDER BY RANDOM()
                """, (row['id'],))
                
                options = []
                correct_option = None
                
                for opt_row in options_cursor.fetchall():
                    option = {
                        'id': opt_row['id'],
                        'text': opt_row['option_text'],
                        'is_correct': bool(opt_row['is_correct'])
                    }
                    options.append(option)
                    
                    if option['is_correct']:
                        correct_option = option
                
                import json
                question = {
                    'id': row['id'],
                    'title': row['title'],
                    'content': row['content'],
                    'correct_answer': row['correct_answer'],
                    'explanation': row['explanation'],
                    'difficulty_level': row['difficulty_level'],
                    'tags': json.loads(row['tags']) if row['tags'] else [],
                    'source': row['source'],
                    'subject_name': row['subject_name'],
                    'question_type_name': row['question_type_name'],
                    'options': options,
                    'correct_option': correct_option
                }
                
                questions.append(question)
            
            return jsonify({
                'questions': questions,
                'total': len(questions)
            }), 200
            
    except Exception as e:
        return jsonify({'error': f'服务器错误: {str(e)}'}), 500

# 注册API模块
from api.quiz import register_quiz_routes
from api.leaderboard import register_leaderboard_routes

# 注册路由
register_quiz_routes(app)
register_leaderboard_routes(app)

if __name__ == '__main__':
    # 检查数据库是否存在
    if not os.path.exists(DATABASE_PATH):
        print("数据库不存在，请先运行 database/init_database.py 初始化数据库")
        exit(1)
    
    # 启动应用
    print("启动快问快答答题系统...")
    print(f"数据库路径: {DATABASE_PATH}")
    print(f"访问地址: http://localhost:8000")
    app.run(debug=True, host='0.0.0.0', port=8000)