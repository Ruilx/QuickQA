# 快问快答 - 古诗词答题通关系统（精简版）

## 🎉 系统介绍

前后端分离：后端 Flask + SQLite + JWT；前端 Ant Design Vue + Vue3（Vite 构建）。保留必要模块与统一启动脚本，目录简洁。

## 🚀 一键启动

```bash
./启动系统.sh
```

脚本行为：

- 安装 Python 依赖；
- 初始化数据库（如需）；
- 构建前端（如未构建）；
- 启动后端（http://localhost:8000）。

## 📁 项目结构（已精简）

```
Quick QA/
├── backend/                 # 后端代码（Flask + JWT）
│   ├── app.py
│   └── api/
├── database/                # 数据库与脚本
│   ├── quiz_app.db         # SQLite 数据库
│   ├── database_schema.sql
│   ├── extended_schema.sql
│   ├── import_questions.py
│   └── init_database.py
├── frontend/            # 前端（Ant Design Vue + Vue3 + Vite）
│   ├── dist/               # 生产构建产物（后端直接服务）
│   ├── src/
│   └── vite.config.ts
├── requirements.txt
└── 启动系统.sh
```

## ✨ 功能概览

- 速答模式：3s 预倒计时 + 60s 作答，即时红/绿反馈，结果总览 + 详情；
- 学习模式：三次错误后自动高亮正确并显示详解；
- 登录/注册、鉴权、路由守卫；
- 首页诗词卡片与模式选择弹窗（AntD 样式）。

## 🔧 开发调试（可选）

后端：

```bash
cd backend && python3 app.py
```

前端（开发服务器 + 代理）：

```bash
cd frontend && npm i && npm run dev
```

前端访问 `http://localhost:5173`，API 通过 Vite 代理到 `http://localhost:8000`。

## 📝 其他说明

- 后端已优先从 `frontend/dist` 提供前端构建产物（`/`、`/assets/*`）。
- 旧版静态前端与脚本均已移除，避免混乱与重复。
- 排行榜：每个用户仅展示其最佳成绩（速答按“正确数优先、用时更短”排序；学习按“学习题数优先、用时更长”排序）。
