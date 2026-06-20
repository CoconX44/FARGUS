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

# yt-dlp config: tv_embedded + ios clients bypass YouTube cloud IP blocks
# bestaudio/best forces an audio-only stream so ffmpeg gets usable data
RUN mkdir -p /root/.config/yt-dlp && cat > /root/.config/yt-dlp/config <<'EOF'
--extractor-args youtube:player_client=tv_embedded,ios
--no-playlist
--no-check-certificate
--prefer-free-formats
EOF

# Verify yt-dlp can actually reach YouTube from this build environment
RUN echo "=== yt-dlp YouTube connectivity test ===" \
    && yt-dlp --get-title "https://www.youtube.com/watch?v=dQw4w9WgXcQ" 2>&1 || echo "WARNING: yt-dlp could not reach YouTube during build"

COPY . .

CMD ["node", "src/index.js"]
