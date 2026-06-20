FROM node:20-slim

ENV DEBIAN_FRONTEND=noninteractive
ENV PIP_BREAK_SYSTEM_PACKAGES=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

RUN pip3 install yt-dlp

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

RUN mkdir -p node_modules/yt-dlp-wrap/bin \
    && ln -sf "$(which yt-dlp)" node_modules/yt-dlp-wrap/bin/yt-dlp \
    && chmod +x node_modules/yt-dlp-wrap/bin/yt-dlp \
    && mkdir -p /root/.config/yt-dlp \
    && echo '--extractor-args youtube:player_client=tv_embedded,ios,web' > /root/.config/yt-dlp/config

COPY . .

CMD ["node", "src/index.js"]
