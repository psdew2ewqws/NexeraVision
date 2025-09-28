# 🚀 Desktop Application Deployment Guide

## Overview

This guide covers the deployment process for RestaurantPrint Pro desktop application across Windows, macOS, and Linux platforms.

## 📋 Prerequisites

### Development Environment
- Node.js 18+ with npm
- Git
- Platform-specific build tools:
  - **Windows**: Visual Studio Build Tools or Visual Studio Community
  - **macOS**: Xcode Command Line Tools
  - **Linux**: build-essential package

### Certificates & Signing (Production)
- **Windows**: Code signing certificate (.p12 format)
- **macOS**: Apple Developer ID certificate
- **Linux**: GPG key for package signing (optional)

## 🛠️ Build Process

### 1. Local Development Build

```bash
# Navigate to desktop app directory
cd apps/desktop

# Install dependencies
npm install

# Build Next.js application
npm run build:next

# Package for current platform
npm run pack

# Package for all platforms (requires platform-specific tools)
npm run dist:all
```

### 2. Production Build via GitHub Actions

#### Automatic Release (Recommended)
```bash
# Tag a new version
git tag v2.0.1
git push origin v2.0.1

# GitHub Actions will automatically:
# 1. Build for all platforms
# 2. Sign applications (if certificates configured)
# 3. Create GitHub release
# 4. Upload artifacts
```

#### Manual Release
```bash
# Trigger manual build
gh workflow run release.yml -f version=v2.0.1
```

## 📦 Platform-Specific Instructions

### Windows Deployment

#### Build Targets
- **NSIS Installer** (`.exe`) - Full installation package
- **Portable** (`.exe`) - No installation required
- **MSIX** (`.msix`) - Microsoft Store compatible (optional)

#### Code Signing Setup
```bash
# Environment variables for GitHub Actions
CSC_LINK=base64_encoded_certificate
CSC_KEY_PASSWORD=certificate_password
```

#### Installation Options
1. **Silent Install**: `RestaurantPrint-Pro-2.0.1-win-x64.exe /S`
2. **Custom Directory**: `RestaurantPrint-Pro-2.0.1-win-x64.exe /D=C:\CustomPath`
3. **No Desktop Shortcut**: `RestaurantPrint-Pro-2.0.1-win-x64.exe /NODESKTOP`

#### Registry Keys Created
```
HKEY_LOCAL_MACHINE\SOFTWARE\RestaurantPrint Pro
- InstallPath: Installation directory
- Version: Application version
- AutoStart: Auto-start setting
```

### macOS Deployment

#### Build Targets
- **DMG** (`.dmg`) - Disk image installer
- **ZIP** (`.zip`) - Archive for direct installation

#### Code Signing & Notarization
```bash
# Environment variables
APPLE_ID=your_apple_id@example.com
APPLE_APP_SPECIFIC_PASSWORD=app_specific_password
APPLE_TEAM_ID=your_team_id
```

#### Installation Process
1. Mount DMG file
2. Drag application to Applications folder
3. Launch from Applications or Launchpad

#### Permission Requirements
- **Accessibility**: For printer communication
- **Network**: For backend API communication
- **Files**: For log file management

### Linux Deployment

#### Build Targets
- **AppImage** (`.AppImage`) - Universal Linux application
- **DEB** (`.deb`) - Debian/Ubuntu package
- **RPM** (`.rpm`) - Red Hat/CentOS/SUSE package

#### Installation Commands
```bash
# AppImage (Universal)
chmod +x RestaurantPrint-Pro-2.0.1-linux-x86_64.AppImage
./RestaurantPrint-Pro-2.0.1-linux-x86_64.AppImage

# Debian/Ubuntu
sudo dpkg -i restaurant-print-pro_2.0.1_amd64.deb

# Red Hat/CentOS
sudo rpm -i restaurant-print-pro-2.0.1.x86_64.rpm
```

#### System Integration
- Desktop entry created in `/usr/share/applications/`
- Auto-start capability via systemd
- Log files in `~/.config/RestaurantPrint Pro/logs/`

## 🔧 Configuration Management

### Environment Configuration

#### Production Settings
```javascript
// In main.js or config file
const config = {
  production: true,
  apiUrl: 'https://api.restaurant-platform.com',
  updateServer: 'https://github.com/restaurant-platform/printer-master-v2',
  logLevel: 'info',
  autoStart: true,
  updateCheckInterval: 4 * 60 * 60 * 1000 // 4 hours
};
```

#### Development Settings
```javascript
const config = {
  production: false,
  apiUrl: 'http://localhost:3001',
  updateServer: 'disabled',
  logLevel: 'debug',
  autoStart: false,
  updateCheckInterval: 60 * 1000 // 1 minute for testing
};
```

### License Configuration

#### Branch License Setup
1. User enters branch ID (UUID format)
2. Application validates with backend API
3. License stored securely using electron-store
4. Auto-start enabled after successful validation

## 🔄 Auto-Update System

### Update Flow
1. **Check**: Application checks for updates every 4 hours
2. **Download**: Updates download automatically in background
3. **Notify**: User notified when update is ready
4. **Install**: User can choose immediate restart or defer
5. **Restart**: Application restarts and applies update

### Update Channels
- **Stable** (`latest`): Production releases
- **Beta** (`beta`): Pre-release testing
- **Alpha** (`alpha`): Development builds

### Update Configuration
```javascript
// Configure update channel
autoUpdater.channel = 'latest'; // stable, beta, or alpha
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;
```

## 📊 Monitoring & Analytics

### Application Metrics
- Startup time tracking
- Memory usage monitoring
- Crash reporting
- Update success rates
- Printer discovery statistics

### Log Files Location
- **Windows**: `%APPDATA%\RestaurantPrint Pro\logs\`
- **macOS**: `~/Library/Logs/RestaurantPrint Pro/`
- **Linux**: `~/.config/RestaurantPrint Pro/logs/`

### Health Checks
- QZ Tray connection status
- Backend API connectivity
- Printer availability
- License validation status

## 🛡️ Security Considerations

### Code Signing
- **Windows**: Authenticode signing prevents security warnings
- **macOS**: Developer ID signing + notarization required
- **Linux**: GPG signing for package repositories

### Secure Communication
- All API calls use HTTPS/WSS
- Certificate pinning for backend communication
- License keys encrypted at rest
- No sensitive data in logs

### Permission Model
- Minimal required permissions
- User consent for sensitive operations
- Sandboxed execution where possible
- Regular security audits via GitHub Actions

## 🚀 Deployment Checklist

### Pre-Release
- [ ] All tests passing
- [ ] Security audit clean
- [ ] Performance benchmarks met
- [ ] Cross-platform testing complete
- [ ] Documentation updated
- [ ] Version number incremented

### Release Process
- [ ] Create git tag
- [ ] GitHub Actions build successful
- [ ] All platform artifacts generated
- [ ] Code signing successful
- [ ] Release notes prepared
- [ ] GitHub release created

### Post-Release
- [ ] Monitor update adoption rates
- [ ] Check error reporting systems
- [ ] Verify auto-update functionality
- [ ] Update internal documentation
- [ ] Notify deployment teams

## 📞 Support & Troubleshooting

### Common Issues

#### Build Failures
- Node.js version mismatch
- Missing platform-specific build tools
- Certificate/signing issues
- Dependency conflicts

#### Runtime Issues
- QZ Tray not installed/running
- Network connectivity problems
- License validation failures
- Auto-update errors

### Debug Information
```bash
# Enable debug logging
export DEBUG=electron*,restaurant-print-pro*

# Collect system information
npm run debug:system

# Generate support bundle
npm run support:bundle
```

### Support Channels
- GitHub Issues: Technical problems
- Internal Documentation: Deployment guides
- Team Chat: Quick questions
- Email Support: Enterprise customers

## 📈 Performance Optimization

### Bundle Size Optimization
- Tree shaking enabled
- Code splitting for routes
- Dynamic imports for heavy modules
- Asset optimization

### Memory Management
- Automatic garbage collection
- Resource cleanup on window close
- Efficient data structures
- Memory leak detection

### Startup Optimization
- Lazy loading of non-critical modules
- Cached configuration loading
- Minimized initial render blocking
- Background initialization

---

## 🔗 Related Documentation

- [API Integration Guide](./API_INTEGRATION.md)
- [QZ Tray Setup Guide](./QZ_TRAY_SETUP.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)
- [License Management](./LICENSE_MANAGEMENT.md)

---

**Last Updated**: September 2024  
**Version**: 2.0.0  
**Platform**: Windows, macOS, Linux