#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
快问快答答题系统 - 简化启动脚本
"""

import os
import sys

# 添加项目根目录到Python路径
project_root = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, project_root)

# 设置工作目录为项目根目录
os.chdir(project_root)

# 检查数据库
database_path = 'database/quiz_app.db'
if not os.path.exists(database_path):
    print("正在初始化数据库...")
    os.system(f"{sys.executable} database/init_database.py")

# 导入并运行应用
try:
    from backend.app import app
    
    print("=" * 60)
    print("🎉 快问快答古诗词答题系统")
    print("📍 访问地址: http://localhost:8000")
    print("🔧 后端API: http://localhost:8000/api")
    print("📊 数据库: database/quiz_app.db") 
    print("=" * 60)
    print("系统启动中...")
    print("按 Ctrl+C 停止服务器")
    print()
    
    # 启动应用
    app.run(debug=True, host='0.0.0.0', port=8000)
    
except KeyboardInterrupt:
    print("\n服务器已停止")
except Exception as e:
    print(f"启动失败: {e}")
    sys.exit(1)