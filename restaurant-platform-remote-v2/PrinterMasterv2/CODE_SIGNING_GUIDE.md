# 🔐 Code Signing Guide for RestaurantPrint Pro

## Overview

Code signing is essential for distributing desktop applications safely and professionally. This guide covers setting up code signing for Windows, macOS, and Linux platforms.

## 🪟 Windows Code Signing

### Certificate Requirements
- **Type**: Code Signing Certificate from a trusted CA
- **Format**: `.p12` or `.pfx` file
- **Validation**: Organization Validated (OV) or Extended Validation (EV)
- **Providers**: DigiCert, GlobalSign, Sectigo, etc.

### Setup Process

#### 1. Obtain Certificate
```bash
# Option 1: Purchase from Certificate Authority
# - DigiCert: $299+/year
# - GlobalSign: $199+/year  
# - Sectigo: $149+/year

# Option 2: Self-signed for testing (NOT for production)
makecert -r -pe -n "CN=Restaurant Platform" -b 01/01/2024 -e 01/01/2025 -eku 1.3.6.1.5.5.7.3.3 -ss my restaurant-platform.cer
```

#### 2. Configure Environment Variables
```bash
# For GitHub Actions
CSC_LINK=base64_encoded_certificate_content
CSC_KEY_PASSWORD=your_certificate_password

# For local development
export CSC_LINK=/path/to/certificate.p12
export CSC_KEY_PASSWORD=your_password
```

#### 3. Update package.json
```json
{
  "build": {
    "win": {
      "certificateFile": "path/to/certificate.p12",
      "certificatePassword": "password_from_env",
      "publisherName": "Restaurant Platform Inc",
      "verifyUpdateCodeSignature": true
    }
  }
}
```

#### 4. Signing Process
```bash
# Manual signing with signtool
signtool sign /f certificate.p12 /p password /t http://timestamp.digicert.com /fd SHA256 application.exe

# Automatic via electron-builder
npm run dist:win
```

## 🍎 macOS Code Signing & Notarization

### Certificate Requirements
- **Apple Developer Account**: $99/year
- **Developer ID Application Certificate**: For distribution outside App Store
- **Developer ID Installer Certificate**: For installer packages

### Setup Process

#### 1. Create Certificates in Apple Developer Portal
```bash
# Install Xcode and command line tools
xcode-select --install

# List available certificates
security find-identity -v -p codesigning

# Download certificates from Apple Developer portal
# Install in Keychain Access
```

#### 2. Configure App-Specific Password
```bash
# Create app-specific password at appleid.apple.com
# Used for notarization process
export APPLE_ID=your-apple-id@example.com
export APPLE_APP_SPECIFIC_PASSWORD=xxxx-xxxx-xxxx-xxxx
export APPLE_TEAM_ID=YOUR_TEAM_ID
```

#### 3. Update package.json
```json
{
  "build": {
    "mac": {
      "hardenedRuntime": true,
      "gatekeeperAssess": false,
      "entitlements": "resources/entitlements.mac.plist",
      "entitlementsInherit": "resources/entitlements.mac.plist",
      "notarize": {
        "teamId": "YOUR_TEAM_ID"
      }
    }
  }
}
```

#### 4. Create Entitlements File
```xml
<!-- resources/entitlements.mac.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
    <key>com.apple.security.network.client</key>
    <true/>
    <key>com.apple.security.network.server</key>
    <true/>
    <key>com.apple.security.files.user-selected.read-write</key>
    <true/>
    <key>com.apple.security.print</key>
    <true/>
    <key>com.apple.security.device.usb</key>
    <true/>
</dict>
</plist>
```

#### 5. Signing & Notarization Process
```bash
# Sign application
codesign --force --options runtime --entitlements resources/entitlements.mac.plist --sign "Developer ID Application: Restaurant Platform Inc" "RestaurantPrint Pro.app"

# Create DMG
create-dmg "RestaurantPrint Pro.dmg" "RestaurantPrint Pro.app"

# Sign DMG
codesign --sign "Developer ID Application: Restaurant Platform Inc" "RestaurantPrint Pro.dmg"

# Notarize (automated via electron-builder)
npm run dist:mac
```

## 🐧 Linux Package Signing

### GPG Signing Setup

#### 1. Generate GPG Key
```bash
# Generate new GPG key
gpg --full-generate-key
# Choose RSA, 4096 bits, no expiration
# Use company email and details

# List keys
gpg --list-secret-keys --keyid-format LONG

# Export public key
gpg --armor --export YOUR_KEY_ID > restaurant-platform.pub
```

#### 2. Configure Package Signing
```json
{
  "build": {
    "linux": {
      "target": [
        {
          "target": "deb",
          "arch": ["x64", "arm64"]
        },
        {
          "target": "rpm", 
          "arch": ["x64", "arm64"]
        }
      ]
    },
    "deb": {
      "fpm": ["--deb-sign"]
    },
    "rpm": {
      "fpm": ["--rpm-sign"]
    }
  }
}
```

#### 3. Repository Setup
```bash
# Create APT repository
mkdir -p deb/pool/main
cp *.deb deb/pool/main/

# Generate Packages file
dpkg-scanpackages deb/pool/main /dev/null > deb/Packages
gzip -k deb/Packages

# Sign Release file
gpg --clearsign -o deb/InRelease deb/Release
```

## 🔧 CI/CD Integration

### GitHub Actions Secrets
```yaml
# Required secrets for GitHub Actions
secrets:
  # Windows
  WINDOWS_CSC_LINK: base64_encoded_certificate
  WINDOWS_CSC_KEY_PASSWORD: certificate_password
  
  # macOS
  APPLE_ID: apple_id_email
  APPLE_APP_SPECIFIC_PASSWORD: app_specific_password
  APPLE_TEAM_ID: team_id
  
  # Linux
  GPG_PRIVATE_KEY: gpg_private_key
  GPG_PASSPHRASE: gpg_passphrase
```

### Workflow Configuration
```yaml
# .github/workflows/release.yml
- name: Setup Code Signing (Windows)
  if: matrix.platform.os == 'windows-latest'
  env:
    CSC_LINK: ${{ secrets.WINDOWS_CSC_LINK }}
    CSC_KEY_PASSWORD: ${{ secrets.WINDOWS_CSC_KEY_PASSWORD }}
  run: echo "Code signing configured for Windows"

- name: Setup Code Signing (macOS)
  if: matrix.platform.os == 'macos-latest'
  env:
    APPLE_ID: ${{ secrets.APPLE_ID }}
    APPLE_APP_SPECIFIC_PASSWORD: ${{ secrets.APPLE_APP_SPECIFIC_PASSWORD }}
    APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
  run: echo "Code signing configured for macOS"
```

## 🛡️ Security Best Practices

### Certificate Security
- Store certificates securely (never in git)
- Use strong passwords for certificate files
- Rotate certificates before expiration
- Monitor certificate validity
- Use hardware security modules (HSM) for EV certificates

### Build Security
- Sign all executables and installers
- Verify signatures after build
- Use timestamp servers for long-term validity
- Implement reproducible builds
- Scan for malware before signing

### Distribution Security
- Use HTTPS for all downloads
- Implement certificate pinning
- Provide SHA256 checksums
- Sign metadata files
- Monitor for unauthorized signatures

## ✅ Verification Steps

### Windows Verification
```bash
# Verify signature
signtool verify /pa application.exe

# Check certificate details
signtool verify /v application.exe
```

### macOS Verification
```bash
# Verify signature
codesign -v -v "RestaurantPrint Pro.app"

# Check notarization
spctl -a -v "RestaurantPrint Pro.app"

# Verify DMG
codesign -v -v "RestaurantPrint Pro.dmg"
```

### Linux Verification
```bash
# Verify DEB signature
dpkg-sig --verify package.deb

# Verify RPM signature  
rpm --checksig package.rpm

# Check GPG signature
gpg --verify package.sig package.deb
```

## 📋 Troubleshooting

### Common Issues

#### Windows
- **Certificate not trusted**: Install intermediate certificates
- **Timestamp failure**: Use alternative timestamp servers
- **Permission denied**: Run with administrator privileges

#### macOS
- **Notarization failed**: Check entitlements and hardened runtime
- **Gatekeeper block**: Verify Developer ID certificates
- **Code sign error**: Check certificate expiration

#### Linux
- **GPG key not found**: Import public key to keyring
- **Package verification failed**: Check signature format
- **Repository trust**: Add public key to APT/YUM

### Debug Commands
```bash
# Windows
signtool verify /v /pa application.exe 2>&1

# macOS
codesign -dvvv "RestaurantPrint Pro.app"
spctl -a -t exec -vv "RestaurantPrint Pro.app"

# Linux
gpg --verify --verbose signature.asc package.deb
```

## 🔗 Resources

### Documentation
- [Electron Code Signing](https://www.electronjs.org/docs/tutorial/code-signing)
- [Apple Notarization Guide](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
- [Microsoft Code Signing](https://docs.microsoft.com/en-us/windows/win32/seccrypto/cryptography-tools)

### Tools
- [electron-builder](https://www.electron.build/code-signing)
- [electron-notarize](https://github.com/electron/electron-notarize)
- [create-dmg](https://github.com/sindresorhus/create-dmg)

### Certificate Providers
- [DigiCert](https://www.digicert.com/code-signing/)
- [GlobalSign](https://www.globalsign.com/en/code-signing-certificate/)
- [Sectigo](https://sectigo.com/ssl-certificates-tls/code-signing)

---

**Last Updated**: September 2024  
**Version**: 2.0.0  
**Status**: Production Ready