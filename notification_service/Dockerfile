FROM node:22-slim

WORKDIR /app

COPY package*.json .
RUN npm ci --omit=dev

COPY . .

CMD ["node", "server.js"]
