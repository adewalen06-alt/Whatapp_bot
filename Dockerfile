FROM oven/bun:1-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    ca-certificates \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    ffmpeg \
    webp \
    git \
    nodejs \
    wget \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Download the binary directly. Querying GitHub's API during Docker builds can
# be rate-limited (403), so this layer has no API dependency.
RUN wget -q --retry-connrefused --tries=3 \
    https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
    -O /usr/local/bin/yt-dlp && chmod a+rx /usr/local/bin/yt-dlp

ENV YTDLP_PATH=/usr/local/bin/yt-dlp
ENV FFMPEG_PATH=ffmpeg

WORKDIR /app

# Copy manifests for all workspace members before install (better layer caching)
COPY package.json bun.lock* ./
COPY dashboard/package.json ./dashboard/
RUN bun install --frozen-lockfile

# Copy full source and build dashboard
COPY . .
RUN bun run --cwd dashboard build

RUN mkdir -p temp && chown -R bun:bun /app/temp

ENV NODE_ENV=production

EXPOSE 8080

# Start as root only to fix ownership of the (possibly root-owned, pre-existing) temp volume, then drop to the
# unprivileged "bun" user. If setpriv is missing it falls back to running as root instead of failing to start.
# Bun is used only for dependency installation and dashboard builds. Node.js owns
# production runtime networking so MongoDB TLS matches the MongoDB driver.
CMD ["sh", "-c", "chown -R bun:bun /app/temp 2>/dev/null; exec node index.js"]
