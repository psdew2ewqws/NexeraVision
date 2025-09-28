# PrinterMaster Background Service - Production Docker Image
#
# Multi-stage build for production optimization with enterprise features:
# - Health check endpoints
# - USB device mounting for printer access
# - CUPS socket mounting for printing
# - Non-root user for security
# - Optimized layer caching
# - Security scanning ready

# Stage 1: Build Dependencies
FROM node:18-alpine AS dependencies

# Install build dependencies for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    gcc \
    musl-dev \
    libusb-dev \
    eudev-dev \
    linux-headers

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && \
    npm cache clean --force

# Stage 2: Development Build (optional)
FROM dependencies AS development

# Install all dependencies for development
RUN npm ci

# Copy source code
COPY . .

# Expose development port
EXPOSE 8182

# Development command
CMD ["npm", "run", "dev:service"]

# Stage 3: Production Build
FROM node:18-alpine AS production

# Metadata
LABEL maintainer="Restaurant Platform Team"
LABEL version="2.0.0"
LABEL description="PrinterMaster Background Service - Enterprise Printer Management"
LABEL service="printermaster"
LABEL environment="production"

# Install runtime dependencies and security updates
RUN apk add --no-cache \
    # Runtime libraries
    libusb \
    eudev \
    cups \
    cups-client \
    # Security and monitoring tools
    curl \
    tini \
    # USB utilities
    usbutils \
    # Process management
    dumb-init \
    && apk upgrade --no-cache \
    && rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S printeruser && \
    adduser -u 1001 -S printeruser -G printeruser && \
    # Add to printer groups
    adduser printeruser lp && \
    adduser printeruser dialout

# Create application directories
RUN mkdir -p /app/logs /app/licenses /app/config /app/service && \
    chown -R printeruser:printeruser /app

# Set working directory
WORKDIR /app

# Copy production dependencies from build stage
COPY --from=dependencies --chown=printeruser:printeruser /app/node_modules ./node_modules

# Copy application files
COPY --chown=printeruser:printeruser service/ ./service/
COPY --chown=printeruser:printeruser config/ ./config/
COPY --chown=printeruser:printeruser apps/desktop/services/ ./apps/desktop/services/
COPY --chown=printeruser:printeruser apps/desktop/websocket-functions.js ./apps/desktop/
COPY --chown=printeruser:printeruser package*.json ./

# Create logs and data directories
RUN mkdir -p /app/logs /app/data /app/tmp && \
    chown -R printeruser:printeruser /app/logs /app/data /app/tmp

# Set environment variables
ENV NODE_ENV=production \
    PRINTER_SERVICE_PORT=8182 \
    LOG_LEVEL=info \
    UV_THREADPOOL_SIZE=4 \
    NODE_OPTIONS="--max-old-space-size=1024" \
    # USB and printer configuration
    USB_MONITORING_INTERVAL=5000 \
    PRINTER_DISCOVERY_INTERVAL=30000 \
    ENABLE_USB_HOTPLUG=true \
    # Health monitoring
    HEALTH_CHECK_INTERVAL=30000 \
    MEMORY_WARNING_THRESHOLD=512 \
    CPU_WARNING_THRESHOLD=85 \
    # Security
    DOCKER_CONTAINER=true \
    DISABLE_AUTO_UPDATE=true

# Expose service port
EXPOSE 8182

# Health check configuration
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8182/health || exit 1

# Volume mounts for persistent data
VOLUME ["/app/logs", "/app/licenses", "/app/data"]

# Switch to non-root user
USER printeruser

# Use tini as init system for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Default command
CMD ["node", "service/service-main.js"]

# Build arguments for customization
ARG BUILD_DATE
ARG VCS_REF
ARG VERSION

# Additional metadata
LABEL org.label-schema.build-date=$BUILD_DATE \
      org.label-schema.vcs-ref=$VCS_REF \
      org.label-schema.version=$VERSION \
      org.label-schema.schema-version="1.0" \
      org.label-schema.name="printermaster-service" \
      org.label-schema.description="Enterprise-grade printer management service" \
      org.label-schema.vendor="Restaurant Platform" \
      org.label-schema.docker.cmd="docker run -d -p 8182:8182 --privileged -v /dev/bus/usb:/dev/bus/usb printermaster:latest"

# Security scanning labels
LABEL security.scan="enabled" \
      security.baseline="cis-docker-benchmark" \
      security.non-root="true" \
      security.privileged="false"