import re, sys

env_path = '/opt/awkn-life/awkn-life-backend/apps/api-server/.env'
new_url = 'DATABASE_URL="file:/opt/awkn-life/awkn-life-backend/apps/api-server/prisma/prod.db"'

with open(env_path) as f:
    content = f.read()

new_content = re.sub(r'DATABASE_URL=.*', new_url, content)

with open(env_path, 'w') as f:
    f.write(new_content)

print(f"Updated DATABASE_URL in {env_path}")
print(new_url)