FROM node:20-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

RUN mkdir -p /root/.config/yt-dlp \
    && echo '--extractor-args youtube:player_client=tv_embedded,ios,web' \
       > /root/.config/yt-dlp/config

COPY . .

CMD ["node", "src/index.js"]
