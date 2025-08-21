#!/bin/bash

echo "🚀 启动快问快答古诗词答题系统"
echo "=================================="

# 检查并安装依赖
echo "📦 检查Python依赖..."
pip3 install -r requirements.txt

# 检查数据库
if [ ! -f "database/quiz_app.db" ] || [ ! -s "database/quiz_app.db" ]; then
    echo "📊 初始化数据库..."
    python3 database/init_database.py
fi

# 构建前端（如未构建）
if [ ! -f "frontend/dist/index.html" ]; then
    echo "🎨 构建前端(ant-design-vue + vue3 + vite)..."
    pushd frontend >/dev/null
    if command -v npm >/dev/null 2>&1; then
        npm ci --silent || npm install --silent
        npm run build --silent
    else
        echo "未安装 npm，请先安装 Node.js 环境或手动构建前端"
    fi
    popd >/dev/null
fi

# 启动服务器
echo "🔧 启动Flask服务器..."
cd backend
python3 app.py

echo "✅ 服务器已启动！"
echo "📍 访问地址: http://localhost:8000"