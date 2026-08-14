# Multi-stage production build - compiles the React app to static assets and
# serves them via nginx, rather than running the Vite dev server in
# production (which is slower, not designed for production traffic, and
# ships the dev toolchain unnecessarily).

FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
