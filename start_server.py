#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
快问快答答题系统启动脚本
"""

import os
import sys
import subprocess
import signal
import time

def check_database():
    """检查数据库是否存在"""
    db_path = 'database/quiz_app.db'
    if not os.path.exists(db_path):
        print("数据库不存在，正在初始化...")
        try:
            subprocess.run([sys.executable, 'database/init_database.py'], check=True)
            print("数据库初始化完成！")
        except subprocess.CalledProcessError as e:
            print(f"数据库初始化失败: {e}")
            return False
    else:
        print("数据库已存在")
    return True

def start_server():
    """启动服务器"""
    if not check_database():
        return False
    
    print("启动Flask服务器...")
    
    # 设置环境变量
    env = os.environ.copy()
    env['FLASK_ENV'] = 'development'
    env['FLASK_DEBUG'] = '1'
    
    try:
        # 启动服务器
        process = subprocess.Popen(
            [sys.executable, 'backend/app.py'],
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            universal_newlines=True
        )
        
        # 等待服务器启动
        time.sleep(2)
        
        print("=" * 60)
        print("🎉 快问快答答题系统已启动！")
        print("📍 访问地址: http://localhost:8000")
        print("🔧 后端API: http://localhost:8000/api")
        print("📊 数据库: database/quiz_app.db")
        print("=" * 60)
        print("按 Ctrl+C 停止服务器")
        
        # 实时输出日志
        try:
            for line in process.stdout:
                print(line.rstrip())
        except KeyboardInterrupt:
            print("\n正在停止服务器...")
            process.terminate()
            process.wait()
            print("服务器已停止")
            
    except Exception as e:
        print(f"启动服务器失败: {e}")
        return False
    
    return True

if __name__ == "__main__":
    print("快问快答答题系统")
    print("=" * 30)
    
    if start_server():
        print("感谢使用！")
    else:
        print("启动失败，请检查错误信息")
        sys.exit(1)