#!/bin/bash

echo "🔄 重启服务..."

# 查找并停止后端进程
echo "⏹️  停止后端服务..."
pkill -f "node.*backend/dist/main" || echo "后端未运行"

# 等待进程完全停止
sleep 2

# 重新启动后端
echo "🚀 启动后端服务..."
cd packages/backend
pnpm dev &
BACKEND_PID=$!

# 等待后端启动
echo "⏳ 等待后端启动..."
sleep 5

# 检查后端是否成功启动
if ps -p $BACKEND_PID > /dev/null; then
   echo "✅ 后端服务已启动 (PID: $BACKEND_PID)"
else
   echo "❌ 后端服务启动失败"
   exit 1
fi

echo ""
echo "📝 测试 WebSocket 连接："
echo "   node test-websocket.js"
echo ""
echo "🌐 前端开发服务器："
echo "   cd packages/frontend && pnpm dev"
