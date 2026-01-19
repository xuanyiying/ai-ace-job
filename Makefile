.PHONY: help dev prod deploy-dev deploy-prod backup restore docker-build docker-up docker-down docker-logs docker-ps docker-clean docker-db-migrate docker-db-seed docker-test docker-shell-backend docker-shell-frontend docker-shell-postgres docker-shell-redis

help:
	@echo "IntervAI - 部署和管理命令"
	@echo "=================================="
	@echo ""
	@echo "快速部署 (推荐):"
	@echo "  make dev                   开发环境一键部署"
	@echo "  make prod                  生产环境一键部署"
	@echo "  make deploy-dev            开发环境部署（完整）"
	@echo "  make deploy-prod           生产环境部署（带备份）"
	@echo ""
	@echo "数据库管理:"
	@echo "  make backup                备份数据库"
	@echo "  make restore FILE=<file>   恢复数据库"
	@echo "  make docker-db-migrate     运行数据库迁移"
	@echo "  make docker-db-seed        填充初始数据"
	@echo ""
	@echo "Docker 基础操作:"
	@echo "  make docker-build          构建 Docker 镜像"
	@echo "  make docker-up             启动所有服务"
	@echo "  make docker-down           停止所有服务"
	@echo "  make docker-clean          删除所有容器和数据卷"
	@echo ""
	@echo "监控和日志:"
	@echo "  make docker-ps             显示运行中的容器"
	@echo "  make docker-logs           查看所有服务日志"
	@echo "  make docker-logs-backend   查看后端日志"
	@echo "  make docker-logs-frontend  查看前端日志"
	@echo ""
	@echo "容器访问:"
	@echo "  make docker-shell-backend  进入后端容器"
	@echo "  make docker-shell-frontend 进入前端容器"
	@echo "  make docker-shell-postgres 进入 PostgreSQL 容器"
	@echo "  make docker-shell-redis    进入 Redis 容器"
	@echo ""
	@echo "测试:"
	@echo "  make docker-test           运行后端测试"
	@echo ""

# 快速部署命令
dev:
	@echo "开发环境一键部署..."
	./deployment/scripts/deploy.sh --env dev

prod:
	@echo "生产环境一键部署..."
	./deployment/scripts/deploy.sh --env prod --backup

deploy-dev:
	@echo "开发环境完整部署..."
	./deployment/scripts/deploy.sh --env dev

deploy-prod:
	@echo "生产环境完整部署（带备份）..."
	./deployment/scripts/deploy.sh --env prod --backup

# 数据库管理
backup:
	@echo "备份数据库..."
	./deployment/scripts/backup-database.sh

restore:
	@echo "恢复数据库..."
	@if [ -z "$(FILE)" ]; then \
		echo "错误: 请指定备份文件"; \
		echo "用法: make restore FILE=interview_ai_20231201_120000.sql.gz"; \
		exit 1; \
	fi
	./deployment/scripts/restore-database.sh $(FILE)

docker-build:
	@echo "Building Docker images..."
	docker-compose build

docker-up:
	@echo "Starting all services..."
	docker-compose up -d
	@echo "Services started. Waiting for health checks..."
	@sleep 5
	@docker-compose ps

docker-down:
	@echo "Stopping all services..."
	docker-compose down

docker-clean:
	@echo "Removing all containers and volumes..."
	docker-compose down -v
	@echo "Cleanup complete"

docker-ps:
	@docker-compose ps

docker-logs:
	docker-compose logs -f

docker-logs-backend:
	docker-compose logs -f backend

docker-logs-frontend:
	docker-compose logs -f frontend

docker-logs-postgres:
	docker-compose logs -f postgres

docker-logs-redis:
	docker-compose logs -f redis

docker-db-migrate:
	@echo "Running database migrations..."
	docker-compose exec backend npx prisma migrate deploy

docker-db-seed:
	@echo "Seeding database..."
	docker-compose exec backend npx prisma db seed

docker-test:
	@echo "Running tests..."
	docker-compose exec backend npm run test

docker-shell-backend:
	docker-compose exec backend sh

docker-shell-frontend:
	docker-compose exec frontend sh

docker-shell-postgres:
	docker-compose exec postgres psql -U interview_ai_user -d interview_ai

docker-shell-redis:
	docker-compose exec redis redis-cli

docker-health-check:
	@echo "Checking service health..."
	@echo "Backend: $$(docker-compose exec backend wget --quiet --tries=1 --spider http://localhost:3000/health && echo 'OK' || echo 'FAILED')"
	@echo "Frontend: $$(docker-compose exec frontend wget --quiet --tries=1 --spider http://localhost/health && echo 'OK' || echo 'FAILED')"
	@echo "PostgreSQL: $$(docker-compose exec postgres pg_isready -U interview_ai_user -d interview_ai && echo 'OK' || echo 'FAILED')"
	@echo "Redis: $$(docker-compose exec redis redis-cli ping && echo 'OK' || echo 'FAILED')"

docker-backup-db:
	@echo "使用新的备份脚本..."
	./deployment/scripts/backup-database.sh

db:
	@echo "使用新的恢复脚本..."
	@echo "可用备份: "
	@ls -lh backups/postgres/ 2>/dev/null || echo "未找到"
	@read -p "输入备份文件名: " backup_file; \
	./deployment/scripts/resile

docker-rebuild:
	@echo "Rebuilding and restarting services..."
	docker-compose down
	docker-compose build --no-cache
	docker-compose up -d
	@echo "Services rebuilt and started"

docker-prune:
	@echo "Pruning unused Docker resources..."
	docker system prune -a --volumes -f
	@echo "Prune complete"
