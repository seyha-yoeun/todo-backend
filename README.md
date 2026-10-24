# Todo Backend

REST API for the [TaskFlow](../todo-react-ts-task) React todo app, built with
[NestJS](https://nestjs.com), [TypeORM](https://typeorm.io), and PostgreSQL.
Interactive API docs are served with [Swagger](https://swagger.io).

## Features

- Todo CRUD (`id`, `title`, `status`, `starred`, `createdAt`, `updatedAt`)
- Signup and login with bcrypt password hashing and JWT access tokens
- Filter by status, case-insensitive title search, `starred`-first sorting
- Dashboard stats endpoint (total / to do / in progress / done / starred)
- Bulk status update and bulk delete
- Request validation via `class-validator` (global `ValidationPipe`)
- Swagger UI + OpenAPI JSON
- TypeORM migrations with a shared data source for the CLI

## Requirements

- Node.js 20+
- PostgreSQL 13+ (Docker is the easiest route)

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Start PostgreSQL (creates the todo_db database)
docker compose up -d

# 3. Configure environment (defaults already match compose.yaml)
cp .env.example .env

# 4. Run migrations
npm run migration:run

# 5. Start the API (watch mode)
npm run start:dev
```

- API base URL: `http://localhost:3000`
- Swagger UI: `http://localhost:3000/docs`
- OpenAPI JSON: `http://localhost:3000/docs/json`

## pgAdmin (database GUI)

`docker compose up -d` also starts pgAdmin at **http://localhost:5050**:

|           | Value               |
| --------- | ------------------- |
| Email     | `admin@example.com` |
| Password  | `admin`             |
| PG server | `TaskFlow Postgres` |

The Postgres server is pre-registered (see `docker/pgadmin/servers.json`), so
after logging in just expand **Servers → TaskFlow Postgres → Databases →
todo_db → Schemas → public → Tables → todos**. It asks for the database
password on first connect: `postgres`.

Data is kept in named volumes (`todo-postgres-data`, `todo-pgadmin-data`), so
`docker compose down` / `up`, restarts, and rebuilds all preserve both the
database contents and your pgAdmin settings.

```bash
docker compose up -d            # start Postgres + pgAdmin
docker compose stop             # stop both, keep the data
docker compose down             # remove containers, keep the volumes
docker compose down -v          # remove containers AND wipe the volumes
```

## Environment variables

| Variable                 | Default     | Description                          |
| ------------------------ | ----------- | ------------------------------------ |
| `PORT`                   | `3000`      | HTTP port                            |
| `JWT_SECRET`             | —           | Secret used to sign access tokens (required) |
| `JWT_EXPIRES_IN`         | `15m`       | Access token lifetime                |
| `JWT_REFRESH_SECRET`     | —           | Secret used to sign refresh tokens (required) |
| `JWT_REFRESH_EXPIRES_IN` | `30d`       | Refresh token lifetime               |
| `DB_HOST`                | `localhost` | PostgreSQL host                      |
| `DB_PORT`     | `5432`      | PostgreSQL port      |
| `DB_USER`     | `postgres`  | PostgreSQL user      |
| `DB_PASSWORD` | `postgres`  | PostgreSQL password  |
| `DB_NAME`     | `todo_db`   | PostgreSQL database  |

## API

All routes are prefixed with `/api/v1`.

| Method   | Route                     | Description                          |
| -------- | ------------------------- | ------------------------------------ |
| `POST`   | `/api/v1/auth/signup`     | Create an account, return token pair |
| `POST`   | `/api/v1/auth/login`      | Log in, return a token pair          |
| `POST`   | `/api/v1/auth/refresh`    | Rotate a refresh token               |
| `POST`   | `/api/v1/todo`            | Create a todo                        |
| `GET`    | `/api/v1/todo?status=&q=` | List todos (filter + search + sort)  |
| `GET`    | `/api/v1/todo/stats`      | Dashboard counts                     |
| `GET`    | `/api/v1/todo/:id`        | Get one todo                         |
| `PATCH`  | `/api/v1/todo/:id`        | Update `title`, `status`, `starred`  |
| `PATCH`  | `/api/v1/todo/bulk/status`| Set the status of many todos         |
| `DELETE` | `/api/v1/todo/bulk`       | Delete many todos (ids in body)      |
| `DELETE` | `/api/v1/todo/:id`        | Delete one todo                      |
| `GET`    | `/api/v1/profile`         | Get the profile (defaults if unset)  |
| `PUT`    | `/api/v1/profile`         | Create or update the profile         |

`createdAt` / `updatedAt` are epoch milliseconds, matching the frontend types.
`starred` is server-driven: send the desired value, not a toggle.

The profile is a singleton row (auth is separate). `GET` returns the frontend
defaults (`{ name: 'Guest', email: '', avatarColor: 'indigo' }`) until the first
save. `PUT` accepts any subset of `name` (≤40), `email` (optional, empty string
clears it), and `avatarColor` (one of the seven `AVATAR_COLORS` ids), and creates
the row on first save. Sending an empty body is rejected with 400.

### Auth

`POST /api/v1/auth/signup` accepts `firstName`, `lastName`, `email`, and
`password` (8–72 characters). It stores the email in lower case, hashes the
password with bcrypt, and returns `{ accessToken, refreshToken, user }`. A
duplicate email is rejected with 409. `POST /api/v1/auth/login` accepts `email`
and `password` and returns the same shape; invalid credentials are rejected with
401.

`POST /api/v1/auth/refresh` accepts `{ "refreshToken": "..." }`, verifies the
token, and rotates the pair. The previous refresh token stops working
immediately. Both tokens are signed JWTs: access tokens use `JWT_SECRET` and
refresh tokens use `JWT_REFRESH_SECRET`. The access token payload contains
`sub` (user id), `email`, and `type: "access"`.

The latest token pair is stored on the user row as SHA-256 hashes
(`access_token_hash`, `refresh_token_hash`), so a database leak does not expose
usable bearer tokens. Raw tokens are only returned to the client. Send the
access token as `Authorization: Bearer <accessToken>` once protected routes are
added.

### Examples

```bash
# Sign up
curl -X POST http://localhost:3000/api/v1/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"firstName":"Seyha","lastName":"Yoeun","email":"you@example.com","password":"password123"}'

# Log in
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","password":"password123"}'

# Refresh the token pair
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H 'Content-Type: application/json' \
  -d '{"refreshToken":"<refresh-token>"}'

# Create
curl -X POST http://localhost:3000/api/v1/todo \
  -H 'Content-Type: application/json' \
  -d '{"title":"Buy groceries","status":"To Do"}'

# List In Progress todos containing "report"
curl 'http://localhost:3000/api/v1/todo?status=In%20Progress&q=report'

# Star / unstar
curl -X PATCH http://localhost:3000/api/v1/todo/<id> \
  -H 'Content-Type: application/json' \
  -d '{"starred":true}'

# Bulk status change
curl -X PATCH http://localhost:3000/api/v1/todo/bulk/status \
  -H 'Content-Type: application/json' \
  -d '{"ids":["<id-1>","<id-2>"],"status":"Done"}'

# Bulk delete
curl -X DELETE http://localhost:3000/api/v1/todo/bulk \
  -H 'Content-Type: application/json' \
  -d '{"ids":["<id-1>","<id-2>"]}'

# Get the profile
curl http://localhost:3000/api/v1/profile

# Save the profile (creates it on first call)
curl -X PUT http://localhost:3000/api/v1/profile \
  -H 'Content-Type: application/json' \
  -d '{"name":"Seyha Yoeun","email":"you@example.com","avatarColor":"teal"}'
```

## Database & migrations

The connection is defined once in `src/config/database.config.ts` and shared by
the Nest runtime and the TypeORM CLI. `synchronize` is off — schema changes go
through migrations in `src/migrations/`.

```bash
npm run migration:generate -- src/migrations/MyChange   # generate from entity changes
npm run migration:run                                   # apply pending migrations
npm run migration:revert                                # roll back the last one
npm run migration:show                                  # list applied/pending
```

## Tests

```bash
npm test          # unit tests
npm run test:e2e  # e2e tests against a todo_db_test database
```

The e2e suite runs against `todo_db_test` (set in `test/setup-env.ts`). Create
and migrate it once:

```bash
docker exec todo-postgres psql -U postgres -c "CREATE DATABASE todo_db_test;"
DB_NAME=todo_db_test npm run migration:run
```

## Project structure

```
src/
├── common/validators/          # reusable class-validator decorators
├── config/database.config.ts   # shared TypeORM data source (Nest + CLI)
├── migrations/                 # generated migrations
├── auth/
│   ├── dto/                    # signup/login/refresh payloads + auth response
│   ├── entities/user.entity.ts # users table + hashed token pair
│   ├── auth.controller.ts      # POST /auth/signup, /login, /refresh
│   ├── auth.service.ts         # bcrypt hashing, JWT issuing/rotation
│   └── auth.module.ts
├── profile/
│   ├── dto/                    # create/update payloads + response
│   ├── entities/profile.entity.ts # profiles table (singleton row)
│   ├── profile.controller.ts   # GET + PUT /profile
│   ├── profile.service.ts      # get-or-default / upsert logic
│   └── profile.module.ts
├── todo/
│   ├── dto/                    # create/update/query/bulk payloads + responses
│   ├── entities/todo.entity.ts # todos table mapping
│   ├── todo.controller.ts      # routes + Swagger decorators
│   ├── todo.service.ts         # query/filter/stats/bulk logic
│   └── todo.module.ts
├── app.module.ts               # ConfigModule + TypeOrmModule wiring
└── main.ts                     # CORS, ValidationPipe, Swagger setup
```
