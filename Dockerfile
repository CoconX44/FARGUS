FROM node:20-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    python3-pip \
    ca-certificates \
    build-essential \
    libopus-dev \
    && pip3 install yt-dlp --break-system-packages \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

# Copy yt-dlp into the path yt-dlp-wrap expects
RUN mkdir -p node_modules/yt-dlp-wrap/bin \
    && cp $(which yt-dlp) node_modules/yt-dlp-wrap/bin/yt-dlp \
    && chmod +x node_modules/yt-dlp-wrap/bin/yt-dlp \
    && echo "yt-dlp version: $(yt-dlp --version)"

# Force yt-dlp to use TV/iOS YouTube client — not blocked from cloud IPs
RUN mkdir -p /root/.config/yt-dlp \
    && echo '--extractor-args youtube:player_client=tv_embedded,ios,web' \
       > /root/.config/yt-dlp/config

COPY . .

CMD ["node", "src/index.js"]
