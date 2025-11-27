.PHONY: help docker-build docker-up docker-down docker-logs docker-ps docker-clean docker-db-migrate docker-db-seed docker-test docker-shell-backend docker-shell-frontend docker-shell-postgres docker-shell-redis

help:
	@echo "Resume Optimizer Docker Commands"
	@echo "=================================="
	@echo ""
	@echo "Setup:"
	@echo "  make docker-build          Build Docker images"
	@echo "  make docker-up             Start all services"
	@echo "  make docker-down           Stop all services"
	@echo "  make docker-clean          Remove all containers and volumes"
	@echo ""
	@echo "Database:"
	@echo "  make docker-db-migrate     Run database migrations"
	@echo "  make docker-db-seed        Seed initial data"
	@echo ""
	@echo "Monitoring:"
	@echo "  make docker-ps             Show running containers"
	@echo "  make docker-logs           View logs from all services"
	@echo "  make docker-logs-backend   View backend logs"
	@echo "  make docker-logs-frontend  View frontend logs"
	@echo ""
	@echo "Shell Access:"
	@echo "  make docker-shell-backend  Access backend container shell"
	@echo "  make docker-shell-frontend Access frontend container shell"
	@echo "  make docker-shell-postgres Access PostgreSQL container shell"
	@echo "  make docker-shell-redis    Access Redis container shell"
	@echo ""
	@echo "Testing:"
	@echo "  make docker-test           Run tests in backend"
	@echo ""

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
	docker-compose exec postgres psql -U resume_user -d resume_optimizer

docker-shell-redis:
	docker-compose exec redis redis-cli

docker-health-check:
	@echo "Checking service health..."
	@echo "Backend: $$(docker-compose exec backend wget --quiet --tries=1 --spider http://localhost:3000/health && echo 'OK' || echo 'FAILED')"
	@echo "Frontend: $$(docker-compose exec frontend wget --quiet --tries=1 --spider http://localhost/health && echo 'OK' || echo 'FAILED')"
	@echo "PostgreSQL: $$(docker-compose exec postgres pg_isready -U resume_user -d resume_optimizer && echo 'OK' || echo 'FAILED')"
	@echo "Redis: $$(docker-compose exec redis redis-cli ping && echo 'OK' || echo 'FAILED')"

docker-backup-db:
	@echo "Backing up database..."
	docker-compose exec postgres pg_dump -U resume_user resume_optimizer > backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "Backup complete"

docker-restore-db:
	@echo "Restoring database from backup..."
	@read -p "Enter backup file path: " backup_file; \
	docker-compose exec -T postgres psql -U resume_user resume_optimizer < $$backup_file
	@echo "Restore complete"

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
