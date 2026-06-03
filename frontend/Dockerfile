# =============================================================================
# Dockerfile - Frontend React (Vite dev server)
# Mục đích: Chạy Vite dev server trong Docker cho môi trường development.
# =============================================================================

FROM node:20-alpine

WORKDIR /app

# Copy package files trước để tận dụng Docker layer cache
COPY package*.json ./

RUN npm install

# Copy mã nguồn (bị override bởi volume mount khi docker-compose up)
COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev"]
