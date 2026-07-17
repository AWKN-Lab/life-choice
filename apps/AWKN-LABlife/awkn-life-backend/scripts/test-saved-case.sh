#!/usr/bin/env bash
#
# SavedCase CRUD API 端到端 smoke test
#
# 用法：
#   bash scripts/test-saved-case.sh <JWT_TOKEN> [BASE_URL]
#
# 默认 BASE_URL=http://localhost:3000/api
# 退出码：0 = 全部通过，1 = 有失败步骤

set -uo pipefail  # 不加 -e：让失败的 step 不直接退出，方便看完整失败列表

JWT="${1:-}"
BASE_URL="${2:-http://localhost:3000/api}"

if [[ -z "$JWT" ]]; then
  echo "❌ 用法: $0 <JWT_TOKEN> [BASE_URL]"
  echo "   JWT 来自 POST /api/v1/auth/login"
  exit 1
fi

# ---------- 工具函数 ----------
PASS=0
FAIL=0
declare -a FAILURES

step() {
  local name="$1"
  shift
  if "$@"; then
    echo "✅ $name"
    PASS=$((PASS + 1))
  else
    echo "❌ $name"
    FAIL=$((FAIL + 1))
    FAILURES+=("$name")
  fi
}

# ---------- 准备 ----------
echo "==> 准备测试数据（unique suffix: $$-$RANDOM）"
SUFFIX="$$-$RANDOM"
CASE_NAME="测试命例-$SUFFIX"
CATEGORY="八字"
TAGS='["测试","smoke"]'

# ---------- Step 1: CREATE ----------
CREATE_RESP=$(curl -s -X POST "$BASE_URL/cases" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"$CASE_NAME\",\"category\":\"$CATEGORY\",\"tags\":$TAGS,\"notes\":\"测试 notes\",\"visibility\":\"private\"}")

CREATE_OK() {
  echo "$CREATE_RESP" | grep -q "\"name\":\"$CASE_NAME\""
}
step "1. POST /cases 创建命例" CREATE_OK

CASE_ID=$(echo "$CREATE_RESP" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p' | head -1)
echo "   → 命例 ID: $CASE_ID"

# ---------- Step 2: LIST (scope=all 默认) ----------
LIST_ALL_RESP=$(curl -s "$BASE_URL/cases" \
  -H "Authorization: Bearer $JWT")
LIST_ALL_OK() {
  echo "$LIST_ALL_RESP" | grep -q "\"name\":\"$CASE_NAME\""
}
step "2. GET /cases 默认 scope=all 包含新建" LIST_ALL_OK

# ---------- Step 3: LIST (scope=private) ----------
LIST_PRIV_RESP=$(curl -s "$BASE_URL/cases?scope=private" \
  -H "Authorization: Bearer $JWT")
LIST_PRIV_OK() {
  echo "$LIST_PRIV_RESP" | grep -q "\"name\":\"$CASE_NAME\""
}
step "3. GET /cases?scope=private 包含自己私有命例" LIST_PRIV_OK

# ---------- Step 4: LIST (scope=public)  不应返回 private ----------
LIST_PUB_RESP=$(curl -s "$BASE_URL/cases?scope=public" \
  -H "Authorization: Bearer $JWT")
LIST_PUB_OK() {
  # public 列表里不应包含刚刚创建的 private 命例
  ! echo "$LIST_PUB_RESP" | grep -q "\"name\":\"$CASE_NAME\""
}
step "4. GET /cases?scope=public 不返回 private 命例" LIST_PUB_OK

# ---------- Step 5: LIST (category 精确匹配) ----------
LIST_CAT_RESP=$(curl -s "$BASE_URL/cases?category=$CATEGORY" \
  -H "Authorization: Bearer $JWT")
LIST_CAT_OK() {
  echo "$LIST_CAT_RESP" | grep -q "\"name\":\"$CASE_NAME\""
}
step "5. GET /cases?category=八字 精确匹配命中" LIST_CAT_OK

# ---------- Step 6: GET ONE ----------
GET_ONE_RESP=$(curl -s "$BASE_URL/cases/$CASE_ID" \
  -H "Authorization: Bearer $JWT")
GET_ONE_OK() {
  echo "$GET_ONE_RESP" | grep -q "\"name\":\"$CASE_NAME\""
}
step "6. GET /cases/:id 详情返回" GET_ONE_OK

# ---------- Step 7: UPDATE ----------
UPDATE_NAME="$CASE_NAME-更新"
UPDATE_RESP=$(curl -s -X PATCH "$BASE_URL/cases/$CASE_ID" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d "{\"notes\":\"更新后的 notes\",\"visibility\":\"public\"}")
UPDATE_OK() {
  echo "$UPDATE_RESP" | grep -q "\"visibility\":\"public\""
}
step "7. PATCH /cases/:id 部分更新" UPDATE_OK

# ---------- Step 8: DELETE ----------
DELETE_RESP=$(curl -s -X DELETE "$BASE_URL/cases/$CASE_ID" \
  -H "Authorization: Bearer $JWT")
DELETE_OK() {
  echo "$DELETE_RESP" | grep -q "\"deleted\":true"
}
step "8. DELETE /cases/:id 软删除成功" DELETE_OK

# ---------- Step 9: GET ONE (404 校验) ----------
GET_404_HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/cases/$CASE_ID" \
  -H "Authorization: Bearer $JWT")
GET_404_OK() {
  [[ "$GET_404_HTTP" == "404" ]]
}
step "9. GET /cases/:id 已删除返回 404" GET_404_OK

# ---------- 汇总 ----------
echo
echo "================================"
echo "✅ 通过: $PASS / 9"
echo "❌ 失败: $FAIL / 9"
if [[ $FAIL -gt 0 ]]; then
  echo "失败项："
  for f in "${FAILURES[@]}"; do
    echo "  - $f"
  done
  exit 1
fi
echo "🎉 全部通过"