# 1) Health (público, sin auth) → debe dar 200
curl.exe -i http://localhost:3000/api/panel/health

# 2) Users sin token → debe dar 401 (auth requerida, NO 404)
curl.exe -i http://localhost:3000/api/panel/users

# 3) Registro de usuario (público) → 201/200 con { user, token } o similar
curl.exe -i -X POST http://localhost:3000/api/panel/register `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"admin@test.com\",\"password\":\"Admin1234!\",\"name\":\"Admin\"}'

# 4) Login → 200 con token
curl.exe -i -X POST http://localhost:3000/api/panel/login `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"admin@test.com\",\"password\":\"Admin1234!\"}'
