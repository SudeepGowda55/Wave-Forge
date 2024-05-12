FROM node:latest
WORKDIR /app
COPY . .
RUN npm install --production
CMD ["node", "server.js"]