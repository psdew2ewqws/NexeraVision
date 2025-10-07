#!/bin/bash
# Restaurant Platform Server Management Script
# Keeps backend and frontend running in persistent screen sessions

PROJECT_DIR="/home/admin/restaurant-platform-remote-v2"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

echo "🚀 Restaurant Platform Server Manager"
echo "====================================="

# Function to check if screen session exists
session_exists() {
    screen -list | grep -q "$1"
}

# Function to kill existing screen sessions
kill_session() {
    if session_exists "$1"; then
        echo "🔄 Stopping existing $1 session..."
        screen -S "$1" -X quit 2>/dev/null
        sleep 2
    fi
}

# Stop existing sessions
echo "🛑 Stopping existing sessions..."
kill_session "restaurant-backend"
kill_session "restaurant-frontend"

# Kill any processes on ports 3000 and 3001
echo "🧹 Cleaning up ports..."
fuser -k 3000/tcp 2>/dev/null
fuser -k 3001/tcp 2>/dev/null
sleep 3

# Start backend in screen
echo "🔧 Starting backend server (Port 3001)..."
cd "$BACKEND_DIR"
screen -dmS restaurant-backend bash -c "PORT=3001 npm run start:dev"
sleep 5

# Start frontend in screen
echo "🎨 Starting frontend server (Port 3000)..."
cd "$FRONTEND_DIR"
screen -dmS restaurant-frontend bash -c "PORT=3000 npm run dev"
sleep 5

echo ""
echo "✅ Servers started successfully!"
echo ""
echo "📊 Server Status:"
echo "  Backend:  http://localhost:3001 (screen: restaurant-backend)"
echo "  Frontend: http://localhost:3000 (screen: restaurant-frontend)"
echo ""
echo "📝 Useful Commands:"
echo "  View all sessions:    screen -ls"
echo "  Attach to backend:    screen -r restaurant-backend"
echo "  Attach to frontend:   screen -r restaurant-frontend"
echo "  Detach from screen:   Ctrl+A, then D"
echo "  Stop all servers:     $0 stop"
echo ""

# Check if sessions are running
if session_exists "restaurant-backend"; then
    echo "✅ Backend session running"
else
    echo "❌ Backend session failed to start"
fi

if session_exists "restaurant-frontend"; then
    echo "✅ Frontend session running"
else
    echo "❌ Frontend session failed to start"
fi
