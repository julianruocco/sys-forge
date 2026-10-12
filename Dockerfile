FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ENV NODE_ENV=production
RUN npm run build
EXPOSE 3847
VOLUME ["/app/data"]
CMD ["node", "--disable-warning=ExperimentalWarning", "./node_modules/next/dist/bin/next", "start", "-p", "3847", "-H", "0.0.0.0"]
