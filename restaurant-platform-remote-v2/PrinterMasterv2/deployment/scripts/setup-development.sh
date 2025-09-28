#!/bin/bash

# PrinterMaster v2 - Development Environment Setup Script
# Enterprise-grade development environment configuration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="/home/admin/restaurant-platform-remote-v2/PrinterMasterv2"
NODE_VERSION="18"
POSTGRES_VERSION="14"
DATABASE_NAME="printer_master_v2_dev"
DATABASE_USER="printer_dev"
DATABASE_PASS="E\$\$athecode006"

echo -e "${BLUE}🚀 PrinterMaster v2 - Development Environment Setup${NC}"
echo -e "${BLUE}=================================================${NC}"

# Function to print step headers
print_step() {
    echo -e "\n${YELLOW}📋 Step $1: $2${NC}"
    echo -e "${YELLOW}----------------------------------------${NC}"
}

# Function to print success messages
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Function to print error messages
print_error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if running as correct user
if [ "$USER" != "admin" ]; then
    print_error "This script should be run as the 'admin' user"
fi

print_step "1" "Checking System Requirements"

# Check OS
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    print_success "Linux system detected"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    print_success "macOS system detected"
else
    print_error "Unsupported operating system: $OSTYPE"
fi

# Check if Node.js is installed
if command_exists node; then
    NODE_CURRENT=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_CURRENT" -ge "$NODE_VERSION" ]; then
        print_success "Node.js v$NODE_CURRENT is installed"
    else
        print_error "Node.js v$NODE_VERSION or higher is required (current: v$NODE_CURRENT)"
    fi
else
    print_error "Node.js is not installed. Please install Node.js v$NODE_VERSION or higher"
fi

# Check if npm is installed
if command_exists npm; then
    print_success "npm is installed"
else
    print_error "npm is not installed"
fi

# Check if Git is installed
if command_exists git; then
    print_success "Git is installed"
else
    print_error "Git is not installed"
fi

# Check if PostgreSQL is installed
if command_exists psql; then
    print_success "PostgreSQL is installed"
else
    print_error "PostgreSQL is not installed. Please install PostgreSQL v$POSTGRES_VERSION or higher"
fi

print_step "2" "Setting up Project Directory"

# Create project directory if it doesn't exist
if [ ! -d "$PROJECT_ROOT" ]; then
    mkdir -p "$PROJECT_ROOT"
    print_success "Created project directory: $PROJECT_ROOT"
else
    print_success "Project directory exists: $PROJECT_ROOT"
fi

# Change to project directory
cd "$PROJECT_ROOT"

print_step "3" "Installing Global Dependencies"

# Install global npm packages
npm install -g concurrently wait-on cross-env electron electron-builder
print_success "Global npm packages installed"

print_step "4" "Setting up Database"

# Create database user and database
sudo -u postgres psql -c "CREATE USER $DATABASE_USER WITH PASSWORD '$DATABASE_PASS';" 2>/dev/null || echo "User already exists"
sudo -u postgres psql -c "CREATE DATABASE $DATABASE_NAME OWNER $DATABASE_USER;" 2>/dev/null || echo "Database already exists"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DATABASE_NAME TO $DATABASE_USER;" 2>/dev/null

print_success "Database setup completed"

# Run database migrations
if [ -f "apps/backend/src/database/migrations/001-create-printer-tables.sql" ]; then
    PGPASSWORD="$DATABASE_PASS" psql -h localhost -U "$DATABASE_USER" -d "$DATABASE_NAME" -f "apps/backend/src/database/migrations/001-create-printer-tables.sql"
    print_success "Database migrations applied"
else
    echo -e "${YELLOW}⚠️  Database migration file not found, skipping...${NC}"
fi

print_step "5" "Installing Project Dependencies"

# Install root dependencies
if [ -f "package.json" ]; then
    npm install
    print_success "Root dependencies installed"
fi

# Install desktop app dependencies
if [ -d "apps/desktop" ] && [ -f "apps/desktop/package.json" ]; then
    cd apps/desktop
    npm install
    cd "$PROJECT_ROOT"
    print_success "Desktop app dependencies installed"
fi

# Install backend dependencies
if [ -d "apps/backend" ] && [ -f "apps/backend/package.json" ]; then
    cd apps/backend
    npm install
    cd "$PROJECT_ROOT"
    print_success "Backend dependencies installed"
fi

# Install shared packages dependencies
for package_dir in packages/*/; do
    if [ -f "${package_dir}package.json" ]; then
        cd "$package_dir"
        npm install
        cd "$PROJECT_ROOT"
        print_success "Dependencies installed for $(basename "$package_dir")"
    fi
done

print_step "6" "Setting up Configuration Files"

# Create environment files
cat > apps/desktop/.env.local << EOF
NODE_ENV=development
NEXT_PUBLIC_APP_VERSION=2.0.0
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
EOF

cat > apps/backend/.env << EOF
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://$DATABASE_USER:$DATABASE_PASS@localhost:5432/$DATABASE_NAME
JWT_SECRET=your-super-secret-jwt-key-for-development
CORS_ORIGIN=http://localhost:3002
LOG_LEVEL=debug
EOF

print_success "Configuration files created"

print_step "7" "Setting up QZ Tray (Optional)"

# Check if QZ Tray is installed
if command_exists java; then
    echo -e "${BLUE}Java is installed. You can download QZ Tray from: https://qz.io/download/${NC}"
    echo -e "${BLUE}QZ Tray is required for printer functionality.${NC}"
else
    echo -e "${YELLOW}⚠️  Java is not installed. QZ Tray requires Java 8 or higher.${NC}"
    echo -e "${BLUE}Install Java and then download QZ Tray from: https://qz.io/download/${NC}"
fi

print_step "8" "Setting up Development Scripts"

# Create development start script
cat > start-dev.sh << 'EOF'
#!/bin/bash

# Start all development services
echo "🚀 Starting PrinterMaster v2 Development Environment"

# Start backend
cd apps/backend
npm run dev &
BACKEND_PID=$!

# Wait for backend to start
sleep 5

# Start desktop app
cd ../desktop
npm run dev &
DESKTOP_PID=$!

echo "✅ Development environment started!"
echo "📊 Backend API: http://localhost:3001"
echo "🖥️  Desktop App: http://localhost:3002"
echo "📚 API Docs: http://localhost:3001/api/docs"

# Cleanup on exit
cleanup() {
    echo "🛑 Shutting down development servers..."
    kill $BACKEND_PID $DESKTOP_PID
    exit 0
}

trap cleanup INT TERM

# Wait for processes
wait
EOF

chmod +x start-dev.sh

print_success "Development scripts created"

print_step "9" "Setting up IDE Configuration"

# Create VS Code settings
mkdir -p .vscode
cat > .vscode/settings.json << EOF
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.suggest.autoImports": true,
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "eslint.workingDirectories": [
    "apps/desktop",
    "apps/backend",
    "packages/shared",
    "packages/printer-sdk"
  ],
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/out": true,
    "**/.next": true
  }
}
EOF

cat > .vscode/launch.json << EOF
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Desktop App",
      "type": "node",
      "request": "launch",
      "program": "\${workspaceFolder}/apps/desktop/node_modules/.bin/electron",
      "args": ["."],
      "cwd": "\${workspaceFolder}/apps/desktop",
      "env": {
        "NODE_ENV": "development"
      }
    },
    {
      "name": "Debug Backend",
      "type": "node",
      "request": "launch",
      "program": "\${workspaceFolder}/apps/backend/src/main.ts",
      "cwd": "\${workspaceFolder}/apps/backend",
      "env": {
        "NODE_ENV": "development"
      },
      "runtimeArgs": ["-r", "ts-node/register"]
    }
  ]
}
EOF

print_success "IDE configuration created"

print_step "10" "Running Initial Health Checks"

# Check database connection
PGPASSWORD="$DATABASE_PASS" psql -h localhost -U "$DATABASE_USER" -d "$DATABASE_NAME" -c "SELECT 1;" >/dev/null 2>&1
if [ $? -eq 0 ]; then
    print_success "Database connection verified"
else
    print_error "Database connection failed"
fi

# Check TypeScript compilation
if [ -d "apps/desktop" ]; then
    cd apps/desktop
    npx tsc --noEmit >/dev/null 2>&1
    if [ $? -eq 0 ]; then
        print_success "Desktop TypeScript compilation check passed"
    else
        echo -e "${YELLOW}⚠️  Desktop TypeScript compilation has errors${NC}"
    fi
    cd "$PROJECT_ROOT"
fi

print_step "11" "Final Setup"

# Create project documentation
cat > README-DEVELOPMENT.md << 'EOF'
# PrinterMaster v2 - Development Guide

## Quick Start

1. **Start Development Environment:**
   ```bash
   ./start-dev.sh
   ```

2. **Access Applications:**
   - Backend API: http://localhost:3001
   - Desktop App: http://localhost:3002  
   - API Documentation: http://localhost:3001/api/docs

## Development Workflow

### Backend Development
```bash
cd apps/backend
npm run dev          # Start development server
npm run test         # Run tests
npm run lint         # Run linter
```

### Desktop App Development
```bash
cd apps/desktop
npm run dev          # Start Next.js + Electron
npm run build        # Build for production
npm run dist         # Create distributable
```

### Database Management
```bash
# Connect to database
PGPASSWORD="E$$athecode006" psql -h localhost -U printer_dev -d printer_master_v2_dev

# Run migrations
npm run migration:run

# Reset database
npm run migration:reset
```

## Debugging

- Use VS Code debugger configurations
- Check logs in `apps/backend/logs/`
- Electron DevTools available in development mode

## Testing QZ Tray Integration

1. Download and install QZ Tray from https://qz.io/download/
2. Start QZ Tray service
3. Test connection in the desktop app

## Troubleshooting

### Common Issues:
1. **Port conflicts:** Make sure ports 3001, 3002 are free
2. **Database connection:** Verify PostgreSQL is running
3. **QZ Tray:** Ensure Java 8+ is installed and QZ Tray is running

### Reset Development Environment:
```bash
rm -rf node_modules */node_modules
npm install
./setup-development.sh
```
EOF

print_success "Development documentation created"

echo -e "\n${GREEN}🎉 Development Environment Setup Complete!${NC}"
echo -e "${GREEN}=================================================${NC}"
echo -e "\n${BLUE}Next Steps:${NC}"
echo -e "1. Start development environment: ${YELLOW}./start-dev.sh${NC}"
echo -e "2. Open your IDE and start coding!"
echo -e "3. Access the applications:"
echo -e "   - Backend API: ${BLUE}http://localhost:3001${NC}"
echo -e "   - Desktop App: ${BLUE}http://localhost:3002${NC}"
echo -e "   - API Docs: ${BLUE}http://localhost:3001/api/docs${NC}"
echo -e "\n${YELLOW}📖 Read README-DEVELOPMENT.md for detailed development guide${NC}"
echo -e "\n${GREEN}Happy coding! 🚀${NC}"