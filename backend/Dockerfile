FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
RUN npm ci --omit=dev --workspace=backend --include-workspace-root

COPY backend ./backend
WORKDIR /app/backend

ENV PORT=5001
EXPOSE 5001

CMD ["npm", "run", "start"]
