# Single-stage image: builds the React frontend, then runs the Express server
# which serves both the API and the built UI on one port.
FROM node:20-bookworm-slim

# better-sqlite3 ships prebuilt binaries for this platform, but keep the
# toolchain available so the image also builds on uncommon architectures.
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first so Docker can cache this layer.
COPY package.json package-lock.json* ./
COPY server/package.json ./server/
COPY web/package.json ./web/
RUN npm install --no-audit --no-fund

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

# The database and uploaded resumes live here; mount a volume to persist them.
VOLUME ["/app/server/data", "/app/server/uploads"]

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD node -e "fetch('http://localhost:4000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["npm", "run", "serve"]
