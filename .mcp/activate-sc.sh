#!/bin/bash
# SuperClaude MCP Activation Script

echo "🚀 Activating SuperClaude MCP servers..."

# Export MCP configuration
export MCP_CONFIG="$HOME/.mcp/sc-config.json"

# Start essential services
npx @modelcontextprotocol/server-sequential-thinking &
npx @modelcontextprotocol/server-memory &

echo "✅ MCP servers activated"
echo "📝 Configuration: $MCP_CONFIG"
