FROM node:20-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

# Download standalone yt-dlp binary (no Python needed)
RUN mkdir -p node_modules/yt-dlp-wrap/bin \
    && curl -fL https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
       -o node_modules/yt-dlp-wrap/bin/yt-dlp \
    && chmod +x node_modules/yt-dlp-wrap/bin/yt-dlp \
    && node_modules/yt-dlp-wrap/bin/yt-dlp --version

# Force yt-dlp to use TV/iOS client — these aren't blocked from cloud IPs
RUN mkdir -p /root/.config/yt-dlp \
    && echo '--extractor-args youtube:player_client=tv_embedded,ios,web' \
       > /root/.config/yt-dlp/config

COPY . .

CMD ["node", "src/index.js"]
