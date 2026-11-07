# ---------- Build stage ----------
FROM node:24-alpine AS builder

# Toolchain for native modules (bcrypt) in case no prebuilt binary matches.
RUN #apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build

# Keep only production dependencies for the runtime image.
RUN npm prune --omit=dev && npm cache clean --force

# ---------- Runtime stage ----------
FROM node:24-alpine AS runner

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

COPY --from=builder --chown=node:node /app/package.json ./
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/dist ./dist

USER node

EXPOSE 3000

# Run pending migrations, then start the API.
CMD ["sh", "-c", "node node_modules/typeorm/cli.js migration:run -d dist/config/database.config.js && node dist/main.js"]
