FROM node:22-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY tsconfig.json ./
COPY src/ ./src/

ENTRYPOINT ["npx", "tsx", "src/stdio.ts"]
