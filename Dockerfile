FROM node:20-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
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

ENV NODE_ENV=production
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Copy package file
COPY package.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy project
COPY . .

# Create runtime folders
RUN mkdir -p sessions tmp temp public

# Create non-root user
RUN useradd -m botuser && chown -R botuser:botuser /app
USER botuser

# Render provides PORT automatically
ENV PORT=10000
EXPOSE 10000

CMD ["npm", "start"]
