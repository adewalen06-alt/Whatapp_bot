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

# Copy package.json and install dependencies
COPY package.json ./

# Install - canvas/sharp are optional so failures won't break the build
RUN npm install --omit=dev || true
RUN npm install --omit=dev --ignore-optional 2>/dev/null; \
    npm install canvas --build-from-source 2>/dev/null || true; \
    npm install sharp 2>/dev/null || true

# Copy all source files
COPY . .

# Create required runtime directories
RUN mkdir -p sessions tmp temp public

EXPOSE 10000
ENV PORT=10000

CMD ["node", "server.js"]
