#!/bin/bash
# ==============================================================================
# SSL 证书配置脚本 - IntervAI
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/utils.sh"

# 配置
detect_env_config() {
    if [ -f ".env.production" ]; then
        load_env ".env.production"
        COMPOSE_FILE="deployment/docker-compose.prod.yml"
    else
        log_error "SSL 配置仅适用于生产环境，未找到 .env.production"
        exit 1
    fi
}

setup_ssl() {
    detect_env_config

    local domain=${DOMAIN:-yourdomain.com}
    local email=${LETSENCRYPT_EMAIL:-admin@yourdomain.com}
    local staging=${LETSENCRYPT_STAGING:-false}

    log_info "SSL 配置信息:"
    echo "  域名: ${domain}"
    echo "  邮箱: ${email}"
    echo "  测试模式: ${staging}"

    if [[ "${domain}" == "yourdomain.com" ]]; then
        log_error "请在 .env.production 中配置正确的 DOMAIN"
        exit 1
    fi

    # 创建目录
    mkdir -p config/ssl
    mkdir -p certbot/www
    mkdir -p certbot/conf

    # 1. 生成自签名证书（用于首次启动 Nginx）
    if [ ! -f "config/ssl/cert.pem" ]; then
        log_step "生成初始自签名证书..."
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout config/ssl/key.pem \
            -out config/ssl/cert.pem \
            -subj "/C=CN/ST=State/L=City/O=Organization/CN=${domain}"
    fi

    # 2. 启动 Nginx
    log_step "启动 Nginx..."
    docker compose -f $COMPOSE_FILE up -d nginx

    # 3. 申请 Let's Encrypt 证书
    log_step "申请 Let's Encrypt 证书..."

    local staging_arg=""
    if [ "${staging}" = "true" ]; then
        staging_arg="--staging"
    fi

    docker compose -f $COMPOSE_FILE run --rm certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email "${email}" \
        --agree-tos \
        --no-eff-email \
        --force-renewal \
        ${staging_arg} \
        -d "${domain}" \
        -d "www.${domain}"

    if [ $? -eq 0 ]; then
        log_info "✓ 证书申请成功"

        # 4. 更新 Nginx 配置并重载
        log_step "重载 Nginx..."
        docker compose -f $COMPOSE_FILE exec nginx nginx -s reload

        log_info "SSL 配置完成! 访问: https://${domain}"
    else
        log_error "证书申请失败，请检查日志"
        exit 1
    fi
}

setup_ssl
