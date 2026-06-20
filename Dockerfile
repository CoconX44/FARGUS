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

# yt-dlp config:
#   ios client works from cloud IPs AND exposes audio-only format 140 (m4a)
#   which satisfies the 'bestaudio' selector that @distube/yt-dlp hardcodes.
#   tv_embedded has no audio-only streams so bestaudio always fails with it.
RUN mkdir -p /root/.config/yt-dlp && cat > /root/.config/yt-dlp/config <<'EOF'
--extractor-args youtube:player_client=ios,tv_embedded
--no-playlist
--no-check-certificate
--prefer-free-formats
EOF

# @distube/yt-dlp v2 hardcodes --no-call-home which is deprecated in yt-dlp 2025+.
# Patch it out so the warning doesn't appear in Discord error messages.
RUN find /app/node_modules/@distube/yt-dlp -name "*.js" \
      -exec grep -lq "no-call-home" {} \; \
      -exec sed -i 's/"--no-call-home"[, ]*//g; s/, *"--no-call-home"//g' {} \; 2>/dev/null || true

# Verify yt-dlp can actually reach YouTube from this build environment
RUN echo "=== yt-dlp YouTube connectivity test ===" \
    && yt-dlp --get-title "https://www.youtube.com/watch?v=dQw4w9WgXcQ" 2>&1 || echo "WARNING: yt-dlp could not reach YouTube during build"

COPY . .

CMD ["node", "src/index.js"]
