FROM node:20-slim

# Install system dependencies including canvas native libs and ffmpeg
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
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Skip puppeteer/chromium download
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV NODE_ENV=production

# Copy manifests first so dependency installs can be cached across source changes
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --omit=optional

# Copy all source files
COPY . .

# Create required runtime directories
RUN mkdir -p sessions tmp temp public data

EXPOSE 3000
ENV PORT=3000

CMD ["node", "index.js"]