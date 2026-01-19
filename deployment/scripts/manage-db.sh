#!/bin/bash
# ==============================================================================
# 数据库管理脚本 - IntervAI
# ==============================================================================

# 加载工具库
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/utils.sh"

# 配置
BACKUP_DIR="${BACKUP_DIR:-./backups/postgres}"
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-7}

# 帮助信息
show_help() {
    echo "用法: $0 <command> [options]"
    echo ""
    echo "命令:"
    echo "  backup              备份数据库"
    echo "  restore <file>      从备份文件恢复数据库"
    echo "  list                列出所有备份"
    echo "  migrate             执行数据库迁移"
    echo ""
    echo "示例:"
    echo "  $0 backup"
    echo "  $0 restore interview_ai_20240101.sql.gz"
}

# 确定环境配置
detect_env_config() {
    if [ -f ".env.production" ]; then
        ENV_FILE=".env.production"
        COMPOSE_FILE="deployment/docker-compose.prod.yml"
    elif [ -f ".env" ]; then
        ENV_FILE=".env"
        COMPOSE_FILE="docker-compose.yml"
    else
        log_error "未找到环境配置文件 (.env 或 .env.production)"
        exit 1
    fi

    load_env "$ENV_FILE"
}

# 检查 Docker 状态
check_docker_status() {
    if ! docker compose -f $COMPOSE_FILE ps --services --filter "status=running" | grep -q "postgres"; then
        log_error "PostgreSQL 服务未运行，无法执行操作"
        exit 1
    fi
}

# 备份数据库
backup_db() {
    detect_env_config
    check_docker_status

    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_file="interview_ai_${timestamp}.sql.gz"
    local backup_path="${BACKUP_DIR}/${backup_file}"

    log_info "开始 PostgreSQL 备份..."
    mkdir -p ${BACKUP_DIR}

    # 执行备份
    docker compose -f $COMPOSE_FILE exec -T postgres pg_dump \
        -U ${POSTGRES_USER:-postgres} \
        -d ${POSTGRES_DB:-interview_ai} \
        --format=custom \
        --compress=9 \
        | gzip > "${backup_path}"

    if [ $? -eq 0 ]; then
        local size=$(du -h "${backup_path}" | cut -f1)
        log_info "✓ 备份成功: ${backup_file} (大小: ${size})"

        # 清理旧备份
        log_info "清理 ${RETENTION_DAYS} 天前的旧备份..."
        find ${BACKUP_DIR} -name "interview_ai_*.sql.gz" -type f -mtime +${RETENTION_DAYS} -delete
    else
        log_error "备份失败"
        exit 1
    fi
}

# 恢复数据库
restore_db() {
    local backup_file="$1"
    if [ -z "$backup_file" ]; then
        log_error "请指定备份文件"
        show_help
        exit 1
    fi

    detect_env_config

    local backup_path="${BACKUP_DIR}/${backup_file}"
    if [ ! -f "${backup_path}" ]; then
        # 尝试直接路径
        if [ -f "${backup_file}" ]; then
            backup_path="${backup_file}"
        else
            log_error "备份文件不存在: ${backup_path}"
            exit 1
        fi
    fi

    check_docker_status

    log_warn "⚠️  警告: 此操作将覆盖当前数据库!"
    log_warn "备份文件: ${backup_path}"
    log_warn "按 Ctrl+C 取消，或等待 5 秒继续..."
    sleep 5

    log_info "正在恢复数据库..."

    gunzip -c "${backup_path}" | docker compose -f $COMPOSE_FILE exec -T postgres pg_restore \
        -U ${POSTGRES_USER:-postgres} \
        -d ${POSTGRES_DB:-interview_ai} \
        --clean \
        --if-exists \
        --no-owner \
        --no-privileges

    if [ $? -eq 0 ]; then
        log_info "✓ 数据库恢复成功"
        log_info "重启后端服务..."
        docker compose -f $COMPOSE_FILE restart backend
    else
        log_error "恢复失败"
        exit 1
    fi
}

# 列出备份
list_backups() {
    if [ ! -d "${BACKUP_DIR}" ]; then
        log_warn "备份目录不存在: ${BACKUP_DIR}"
        return
    fi

    echo "现有备份:"
    ls -lh "${BACKUP_DIR}"/interview_ai_*.sql.gz 2>/dev/null
}

# 数据库迁移
migrate_db() {
    detect_env_config
    log_info "执行数据库迁移..."
    docker compose -f $COMPOSE_FILE run --rm backend npx prisma migrate deploy

    if [ $? -eq 0 ]; then
        log_info "✓ 数据库迁移成功"
    else
        log_error "数据库迁移失败"
        exit 1
    fi
}

# 主逻辑
case "$1" in
    backup)
        backup_db
        ;;
    restore)
        restore_db "$2"
        ;;
    list)
        list_backups
        ;;
    migrate)
        migrate_db
        ;;
    *)
        show_help
        exit 1
        ;;
esac
