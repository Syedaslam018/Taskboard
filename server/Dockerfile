# Multi-stage production build - the final image ships only compiled JS and
# production dependencies, not TypeScript source, dev tooling, or test files.

FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

# Install only production dependencies in the final image - dev
# dependencies (ts-node, jest, eslint, etc.) never ship.
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

# Run as a non-root user rather than the container default root, so a
# compromised Node process doesn't have root inside the container.
RUN addgroup -S nodejs && adduser -S expressjs -G nodejs
USER expressjs

EXPOSE 5000
CMD ["node", "dist/server.js"]
