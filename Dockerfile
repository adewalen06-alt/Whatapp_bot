FROM node:20-slim

# System deps needed for canvas, sharp, ffmpeg
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    libpixman-1-dev \
    pkg-config \
    build-essential \
    python3 \
    wget \
    unzip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Disable Puppeteer/Chromium download
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_CACHE_DIR=/tmp/puppeteer_disabled
ENV NODE_ENV=production

# Copy dependency files first (better caching)
COPY package.json ./

# Install dependencies
RUN npm install --omit=dev --ignore-scripts=false

# Copy source code
COPY . .

# Create required runtime directories
RUN mkdir -p sessions tmp temp public

# HuggingFace Spaces runs as non-root user
RUN useradd -m -u 1000 botuser && chown -R botuser:botuser /app
USER botuser

# HuggingFace Spaces uses port 7860
EXPOSE 7860

ENV PORT=7860

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:7860/health || exit 1

CMD ["node", "server.js"]
