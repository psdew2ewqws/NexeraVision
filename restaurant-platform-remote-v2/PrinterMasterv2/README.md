# PrinterMaster v2 - Enterprise Printer Management System

[![License](https://img.shields.io/badge/license-Proprietary-red.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](package.json)
[![Node.js](https://img.shields.io/badge/node.js-18+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](docker-compose.yml)

> **Enterprise-grade cross-platform desktop application for printer management in restaurant environments, designed for 100+ device deployments with bulletproof reliability.**

## 🎯 **Overview**

PrinterMaster v2 is a comprehensive printer management solution built specifically for restaurant chains requiring centralized printer management across multiple locations. It replaces legacy Java-based solutions with a modern, secure, and scalable architecture.

### **Key Features**

- 🖨️ **Automatic Printer Discovery** - QZ Tray integration for seamless printer detection
- 🔐 **License-Based Authentication** - Branch identification without complex login workflows  
- 📊 **Real-Time Monitoring** - Live status updates with 30-second intervals
- 🧪 **Comprehensive Testing** - Print tests, alignment checks, and connectivity verification
- 🔄 **Auto-Recovery** - Crash detection with automatic restart mechanisms
- 📱 **Cross-Platform** - Windows, macOS, and Linux support
- 🏢 **Enterprise-Ready** - Centralized deployment, monitoring, and updates
- 🔒 **Security Hardened** - Encrypted communications and secure credential storage

## 🏗️ **Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                    PrinterMaster v2 Architecture             │
├─────────────────────────────────────────────────────────────┤
│  Desktop App (Electron + Next.js)                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   Main Process  │  │  Renderer UI    │  │  Preload     │ │
│  │   - IPC Handler │  │  - React UI     │  │  - Bridge    │ │
│  │   - Auto-start  │  │  - State Mgmt   │  │  - Security  │ │
│  │   - Monitoring  │  │  - Real-time    │  │  - API Calls │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  Printer SDK Layer                                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   QZ Tray API   │  │  Discovery      │  │  Status      │ │
│  │   - WebSocket   │  │  - Auto-detect  │  │  - Health    │ │
│  │   - ESC/POS     │  │  - Registration │  │  - Testing   │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  Backend API Integration                                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   License API   │  │  Printer API    │  │  Monitoring  │ │
│  │   - Validation  │  │  - Registration │  │  - Logging   │ │
│  │   - Branch ID   │  │  - Status Sync  │  │  - Metrics   │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 **Quick Start**

### **Prerequisites**

- **Node.js 18+** - [Download](https://nodejs.org/)
- **PostgreSQL 14+** - [Download](https://www.postgresql.org/)
- **QZ Tray** - [Download](https://qz.io/download/) (for printer functionality)
- **Git** - [Download](https://git-scm.com/)

### **Development Setup**

1. **Clone the repository:**
   ```bash
   cd /home/admin/restaurant-platform-remote-v2/PrinterMasterv2
   ```

2. **Run the automated setup:**
   ```bash
   chmod +x deployment/scripts/setup-development.sh
   ./deployment/scripts/setup-development.sh
   ```

3. **Start development environment:**
   ```bash
   ./start-dev.sh
   ```

4. **Access applications:**
   - 🔧 **Backend API**: http://localhost:3001
   - 🖥️ **Desktop App**: http://localhost:3002  
   - 📚 **API Documentation**: http://localhost:3001/api/docs

### **Production Deployment**

1. **Prepare server environment:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh
   ```

2. **Deploy with automation:**
   ```bash
   sudo ./deployment/scripts/production-deploy.sh
   ```

3. **Verify deployment:**
   ```bash
   curl http://localhost:3001/health
   systemctl status printer-master-v2
   ```

## 📁 **Project Structure**

```
PrinterMasterv2/
├── apps/
│   ├── desktop/              # Electron + Next.js desktop app
│   │   ├── src/
│   │   │   ├── main/         # Electron main process
│   │   │   ├── renderer/     # Next.js renderer
│   │   │   └── preload/      # Secure IPC bridge
│   │   └── package.json
│   └── backend/              # NestJS API server
│       ├── src/
│       │   ├── printer/      # Printer management modules
│       │   ├── auth/         # Authentication & authorization
│       │   └── database/     # Database migrations
│       └── package.json
├── packages/
│   ├── shared/               # Shared types and utilities
│   ├── printer-sdk/          # QZ Tray integration SDK
│   ├── config/               # Configuration management
│   └── ui-components/        # Reusable UI components
├── deployment/
│   ├── docker/               # Docker configurations
│   ├── scripts/              # Deployment automation
│   └── monitoring/           # Health check scripts
├── docs/                     # Comprehensive documentation
└── tests/                    # Test suites
```

## 🔧 **Development**

### **Available Scripts**

```bash
# Development
npm run dev                   # Start all services in development mode
npm run dev:backend          # Start backend only
npm run dev:desktop          # Start desktop app only

# Building
npm run build                # Build all applications
npm run build:backend        # Build backend only
npm run build:desktop        # Build desktop app only

# Testing
npm run test                 # Run all tests
npm run test:backend         # Backend tests only
npm run test:desktop         # Desktop tests only
npm run test:coverage        # Test coverage report

# Code Quality
npm run lint                 # Lint all code
npm run lint:fix            # Fix linting issues
npm run type-check          # TypeScript type checking

# Distribution
npm run dist                # Build desktop distributables
npm run dist:all            # Build for all platforms
npm run dist:win            # Windows only
npm run dist:mac            # macOS only
npm run dist:linux          # Linux only
```

### **Database Operations**

```bash
# Connect to development database
PGPASSWORD="E$$athecode006" psql -h localhost -U printer_dev -d printer_master_v2_dev

# Run migrations
cd apps/backend && npm run migration:run

# Reset database
cd apps/backend && npm run migration:reset

# Create new migration
cd apps/backend && npm run migration:create -- --name=AddNewFeature
```

## 🏢 **Enterprise Features**

### **License Management**
- **Branch-based licensing** with device limits
- **Automatic validation** and renewal
- **Offline mode** with sync capabilities
- **Centralized license server** integration

### **Printer Management**
- **Automatic discovery** via QZ Tray integration
- **Real-time status monitoring** with health checks
- **Comprehensive testing** (connectivity, print, alignment)
- **Multi-connection support** (USB, Network, Bluetooth)

### **Monitoring & Analytics**
- **System health monitoring** with alerts
- **Performance metrics** collection
- **Centralized logging** with log aggregation
- **Grafana dashboards** for visualization

### **Security & Compliance**
- **Encrypted data storage** with AES-256
- **Secure API communications** with JWT
- **Device fingerprinting** for license binding
- **Audit logging** for compliance

### **Deployment & Updates**
- **Auto-update mechanism** with rollback support
- **Enterprise deployment** via Group Policy/MDM
- **Centralized configuration** management
- **Blue-green deployment** support

## 📊 **Performance Specifications**

| Metric | Target | Enterprise Requirement |
|--------|--------|----------------------|
| Application Startup | < 5 seconds | ✅ Optimized cold start |
| Memory Usage (Idle) | < 100MB | ✅ Efficient resource usage |
| CPU Usage (Normal) | < 5% | ✅ Minimal system impact |
| Printer Discovery | < 30 seconds | ✅ Fast detection |
| Status Update Latency | < 2 seconds | ✅ Real-time updates |
| API Response Time | < 500ms | ✅ Fast API responses |
| Crash Recovery | < 10 seconds | ✅ Automatic restart |
| Uptime | > 99.5% | ✅ Enterprise reliability |

## 🔒 **Security**

### **Authentication & Authorization**
- **License-based authentication** without passwords
- **JWT tokens** with automatic refresh
- **Role-based access control** (RBAC)
- **Device fingerprinting** for security

### **Data Protection**
- **AES-256 encryption** for sensitive data
- **TLS 1.3** for all communications
- **Secure credential storage** with OS keychain
- **Input validation** and sanitization

### **Network Security**
- **Certificate pinning** for API connections
- **Rate limiting** to prevent abuse
- **CORS protection** with whitelist
- **Firewall recommendations** included

## 📈 **Scalability**

PrinterMaster v2 is designed to scale from single locations to enterprise deployments:

- **100+ concurrent devices** per backend instance
- **Horizontal scaling** with load balancers
- **Database read replicas** for performance
- **Redis caching** for session management
- **Microservices architecture** for component scaling

## 🛠️ **Technology Stack**

### **Desktop Application**
- **Electron 27+** - Cross-platform desktop framework
- **Next.js 14** - React framework for UI
- **TypeScript 5** - Type-safe development
- **Tailwind CSS** - Utility-first CSS
- **Zustand** - Lightweight state management

### **Backend Services**
- **NestJS 10** - Enterprise Node.js framework
- **TypeORM** - Database ORM with TypeScript
- **PostgreSQL 14** - Reliable relational database
- **Redis 7** - Caching and session storage
- **WebSocket** - Real-time communications

### **Infrastructure**
- **Docker** - Containerization
- **Nginx** - Reverse proxy and load balancer
- **Prometheus** - Metrics collection
- **Grafana** - Monitoring dashboards
- **Let's Encrypt** - SSL certificates

## 📚 **Documentation**

| Document | Description |
|----------|-------------|
| [**Deployment Guide**](docs/DEPLOYMENT_GUIDE.md) | Complete deployment instructions |
| [**API Reference**](http://localhost:3001/api/docs) | Interactive API documentation |
| [**Architecture Guide**](docs/ARCHITECTURE.md) | System design and patterns |
| [**Security Guide**](docs/SECURITY.md) | Security best practices |
| [**Troubleshooting**](docs/TROUBLESHOOTING.md) | Common issues and solutions |
| [**Contributing**](docs/CONTRIBUTING.md) | Development guidelines |

## 🧪 **Testing**

PrinterMaster v2 includes comprehensive testing:

```bash
# Unit tests
npm run test:unit

# Integration tests  
npm run test:integration

# End-to-end tests
npm run test:e2e

# Performance tests
npm run test:performance

# Security tests
npm run test:security

# Load testing (100+ devices)
npm run test:load
```

**Coverage Requirements:**
- **Unit tests**: > 80% code coverage
- **Integration tests**: All API endpoints
- **E2E tests**: Critical user workflows
- **Performance tests**: Response time validation
- **Load tests**: 100+ concurrent devices

## 🚨 **Monitoring**

### **Health Checks**
```bash
# System health
curl http://localhost:3001/health

# Database connectivity
curl http://localhost:3001/health/database

# QZ Tray integration
curl http://localhost:3001/health/qz-tray

# License validation
curl http://localhost:3001/health/licensing
```

### **Metrics Collection**
- **Application metrics**: `/metrics` endpoint
- **Business metrics**: Printer status, test results
- **System metrics**: CPU, memory, disk usage
- **Custom dashboards**: Grafana templates included

## 🔄 **Continuous Integration**

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm run test:all
      - name: Build applications
        run: npm run build
      - name: Security scan
        run: npm audit
```

## 🐛 **Troubleshooting**

### **Common Issues**

1. **QZ Tray Connection Failed**
   ```bash
   # Restart QZ Tray service
   pkill -f qz-tray
   java -jar qz-tray.jar
   ```

2. **License Validation Error**
   ```bash
   # Check network connectivity
   ping api.your-domain.com
   
   # Verify license format
   echo $LICENSE_KEY | grep -E "^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$"
   ```

3. **Database Connection Issues**
   ```bash
   # Check PostgreSQL status
   sudo systemctl status postgresql
   
   # Test connection
   psql -h localhost -U printer_dev -d printer_master_v2_dev -c "SELECT 1;"
   ```

### **Debug Mode**
```bash
# Enable debug logging
export DEBUG=printer-master:*
export LOG_LEVEL=debug

# Start with debugging
npm run dev
```

## 📞 **Support**

For enterprise support and customization:

- 📧 **Email**: support@restaurant-platform.com
- 🎫 **Support Portal**: https://support.restaurant-platform.com
- 📞 **Enterprise Hotline**: +1-800-PRINTER
- 💬 **Slack**: #printer-master-support

### **Support Tiers**

| Tier | Response Time | Features |
|------|---------------|----------|
| **Community** | Best effort | GitHub issues, documentation |
| **Professional** | 24 hours | Email support, priority fixes |
| **Enterprise** | 4 hours | Phone support, custom development |
| **Critical** | 1 hour | 24/7 hotline, emergency patches |

## 📄 **License**

This software is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.

**© 2024 Restaurant Platform Inc. All rights reserved.**

For licensing inquiries: licensing@restaurant-platform.com

---

## 🎯 **Roadmap**

### **Version 2.1** (Q1 2025)
- [ ] Advanced printer analytics
- [ ] Mobile companion app
- [ ] Enhanced security features
- [ ] Multi-language support

### **Version 2.2** (Q2 2025)
- [ ] Cloud-based license management
- [ ] AI-powered predictive maintenance
- [ ] Advanced reporting dashboard
- [ ] Integration marketplace

### **Version 3.0** (Q3 2025)
- [ ] Microservices architecture
- [ ] Kubernetes deployment
- [ ] Multi-tenant SaaS offering
- [ ] Global CDN distribution

---

**Built with ❤️ for restaurant operations teams worldwide.**