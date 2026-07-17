#!/bin/bash
# ==========================================
# HTTPS 证书自动续期脚本
# - 调用 certbot renew 静默续期
# - 续期成功后 reload nginx
# - 失败时发送告警（webhook 占位）
# - 日志写入 /var/log/cert-renew.log
# 运行环境：Linux 服务器（阿里云 Ubuntu 22.04）
# ==========================================

set -euo pipefail

# ---------- 配置 ----------
LOG_FILE="/var/log/cert-renew.log"
ALERT_WEBHOOK="${ALERT_WEBHOOK:-}"   # 告警 webhook 地址（可选，通过环境变量注入）
ALERT_EMAIL="${ALERT_EMAIL:-}"       # 告警邮箱（可选）
HOSTNAME_FQDN="$(hostname -f 2>/dev/null || hostname)"
TIMESTAMP="$(date '+%Y-%m-%d %H:%M:%S')"

# ---------- 工具函数 ----------
log() {
  # 统一日志格式：[时间] [级别] 消息
  local level="$1"
  shift
  echo "[$TIMESTAMP] [$level] $*" | tee -a "$LOG_FILE"
}

send_alert() {
  # 失败告警：优先 webhook，其次邮件，最后仅日志
  local msg="$1"
  log "ERROR" "告警: $msg"

  if [ -n "$ALERT_WEBHOOK" ]; then
    # webhook 占位：实际部署时替换为飞书/钉钉/企业微信等
    # curl -sS -X POST "$ALERT_WEBHOOK" \
    #   -H "Content-Type: application/json" \
    #   -d "{\"text\":\"[证书续期告警] $msg (host=$HOSTNAME_FQDN)\"}" >/dev/null 2>&1 || true
    echo "[ALERT-WEBHOOK] $msg (host=$HOSTNAME_FQDN)" >> "$LOG_FILE"
  fi

  if [ -n "$ALERT_EMAIL" ]; then
    # 邮件告警占位：实际部署时配置 sendmail / msmtp / SES
    # echo "$msg" | mail -s "[证书续期告警] $HOSTNAME_FQDN" "$ALERT_EMAIL" || true
    echo "[ALERT-EMAIL] -> $ALERT_EMAIL: $msg" >> "$LOG_FILE"
  fi
}

reload_nginx() {
  # 优先 systemctl reload，失败回退 nginx -s reload
  if command -v systemctl >/dev/null 2>&1 && systemctl list-units --type=service | grep -q nginx; then
    systemctl reload nginx
    log "INFO" "nginx 已 reload (systemctl)"
  elif command -v nginx >/dev/null 2>&1; then
    nginx -s reload
    log "INFO" "nginx 已 reload (nginx -s reload)"
  else
    log "WARN" "未找到 nginx，跳过 reload"
    return 1
  fi
}

# ---------- 主流程 ----------
log "INFO" "==== 证书续期开始 (host=$HOSTNAME_FQDN) ===="

# 1. 检查 certbot 是否安装
if ! command -v certbot >/dev/null 2>&1; then
  send_alert "certbot 未安装，无法续期"
  log "ERROR" "certbot 未安装"
  exit 1
fi

# 2. 执行续期（静默模式）
log "INFO" "执行 certbot renew --quiet ..."
if certbot renew --quiet; then
  log "INFO" "certbot renew 成功"
else
  RET=$?
  send_alert "certbot renew 失败 (exit=$RET)"
  log "ERROR" "certbot renew 失败 (exit=$RET)"
  exit "$RET"
fi

# 3. 重载 nginx 使新证书生效
log "INFO" "重载 nginx ..."
if reload_nginx; then
  log "INFO" "nginx reload 成功"
else
  send_alert "nginx reload 失败，证书已续期但未生效"
  log "ERROR" "nginx reload 失败"
  exit 1
fi

# 4. 记录证书到期时间（便于排查）
if command -v openssl >/dev/null 2>&1; then
  CERT_PATH="/etc/letsencrypt/live/${HOSTNAME_FQDN}/cert.pem"
  if [ -f "$CERT_PATH" ]; then
    EXPIRY=$(openssl x509 -enddate -noout -in "$CERT_PATH" 2>/dev/null | cut -d= -f2 || echo "unknown")
    log "INFO" "证书到期时间: $EXPIRY ($CERT_PATH)"
  fi
fi

log "INFO" "==== 证书续期结束 (成功) ===="
exit 0