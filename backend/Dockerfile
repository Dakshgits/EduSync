FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force
COPY src ./src
# SQL migrations are mounted at /database by docker-compose
ENV MIGRATIONS_DIR=/database/migrations
EXPOSE 5000
USER node
CMD ["node", "src/server.js"]
