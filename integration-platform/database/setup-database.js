#!/usr/bin/env node

const { Client } = require('pg');
require('dotenv').config();

async function setupDatabase() {
  console.log('🚀 Setting up Integration Platform Database...\n');

  // Connect to PostgreSQL server (without database)
  const adminClient = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5433,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'E$$athecode006',
    database: 'postgres' // Connect to default database
  });

  try {
    await adminClient.connect();
    console.log('✅ Connected to PostgreSQL server');

    // Check if database exists
    const dbExistsQuery = `
      SELECT 1 FROM pg_database
      WHERE datname = $1
    `;
    const dbExists = await adminClient.query(dbExistsQuery, ['integration_platform']);

    if (dbExists.rows.length === 0) {
      // Create database
      console.log('📊 Creating database: integration_platform');
      await adminClient.query('CREATE DATABASE integration_platform');
      console.log('✅ Database created successfully');
    } else {
      console.log('📊 Database integration_platform already exists');
    }

    await adminClient.end();

    // Connect to the new database
    const dbClient = new Client({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5433,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'E$$athecode006',
      database: 'integration_platform'
    });

    await dbClient.connect();
    console.log('✅ Connected to integration_platform database');

    // Enable UUID extension
    console.log('🔧 Enabling UUID extension...');
    await dbClient.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await dbClient.query('CREATE EXTENSION IF NOT EXISTS "pg_trgm"');
    console.log('✅ Extensions enabled');

    // Create initial schema
    console.log('🏗️  Creating initial database schema...');

    // Organizations/Tenants table
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(50),
        address TEXT,
        logo_url VARCHAR(500),
        website VARCHAR(255),
        timezone VARCHAR(100) DEFAULT 'UTC',
        subscription_plan VARCHAR(50) DEFAULT 'free',
        subscription_status VARCHAR(20) DEFAULT 'active',
        settings JSONB DEFAULT '{}',
        limits JSONB DEFAULT '{"connections": 50, "requests_per_minute": 1000, "webhooks": 100}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        deleted_at TIMESTAMP WITH TIME ZONE
      )
    `);

    // Users table
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'user',
        avatar_url VARCHAR(500),
        is_active BOOLEAN DEFAULT true,
        last_login_at TIMESTAMP WITH TIME ZONE,
        email_verified_at TIMESTAMP WITH TIME ZONE,
        two_factor_enabled BOOLEAN DEFAULT false,
        two_factor_secret VARCHAR(255),
        api_key VARCHAR(255) UNIQUE,
        permissions JSONB DEFAULT '[]',
        settings JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        deleted_at TIMESTAMP WITH TIME ZONE
      )
    `);

    // Integration Providers table
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS integration_providers (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        type VARCHAR(50) NOT NULL, -- 'pos' or 'delivery'
        category VARCHAR(100) NOT NULL,
        logo_url VARCHAR(500),
        website VARCHAR(255),
        description TEXT,
        documentation_url VARCHAR(500),
        api_base_url VARCHAR(500),
        auth_type VARCHAR(50) NOT NULL, -- 'oauth2', 'api_key', 'basic_auth'
        auth_config JSONB DEFAULT '{}',
        webhook_config JSONB DEFAULT '{}',
        rate_limits JSONB DEFAULT '{}',
        supported_features JSONB DEFAULT '[]',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Integration Connections table
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS integration_connections (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        provider_id UUID NOT NULL REFERENCES integration_providers(id),
        name VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'inactive', -- 'active', 'inactive', 'error', 'pending'
        auth_data JSONB DEFAULT '{}', -- encrypted credentials
        config_data JSONB DEFAULT '{}',
        sync_settings JSONB DEFAULT '{}',
        last_sync_at TIMESTAMP WITH TIME ZONE,
        last_error TEXT,
        error_count INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        deleted_at TIMESTAMP WITH TIME ZONE,
        UNIQUE(organization_id, provider_id, name)
      )
    `);

    // Webhook Configurations table
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS webhook_configurations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        connection_id UUID REFERENCES integration_connections(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        url VARCHAR(500) NOT NULL,
        method VARCHAR(10) DEFAULT 'POST',
        headers JSONB DEFAULT '{}',
        events JSONB DEFAULT '[]', -- array of event types
        filters JSONB DEFAULT '{}',
        secret VARCHAR(255),
        signature_header VARCHAR(100) DEFAULT 'X-Webhook-Signature',
        timeout_ms INTEGER DEFAULT 30000,
        retry_count INTEGER DEFAULT 3,
        retry_delay_ms INTEGER DEFAULT 1000,
        is_active BOOLEAN DEFAULT true,
        last_triggered_at TIMESTAMP WITH TIME ZONE,
        success_count INTEGER DEFAULT 0,
        failure_count INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Menu Items table
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS menu_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        connection_id UUID NOT NULL REFERENCES integration_connections(id) ON DELETE CASCADE,
        external_id VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        price DECIMAL(10,2),
        currency VARCHAR(3) DEFAULT 'USD',
        image_url VARCHAR(500),
        is_available BOOLEAN DEFAULT true,
        modifiers JSONB DEFAULT '[]',
        allergens JSONB DEFAULT '[]',
        nutritional_info JSONB DEFAULT '{}',
        metadata JSONB DEFAULT '{}',
        sync_status VARCHAR(50) DEFAULT 'synced', -- 'synced', 'pending', 'error'
        last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(connection_id, external_id)
      )
    `);

    // Orders table
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        connection_id UUID NOT NULL REFERENCES integration_connections(id) ON DELETE CASCADE,
        external_id VARCHAR(255) NOT NULL,
        order_number VARCHAR(100),
        status VARCHAR(50) NOT NULL,
        customer_info JSONB DEFAULT '{}',
        items JSONB DEFAULT '[]',
        total_amount DECIMAL(10,2),
        currency VARCHAR(3) DEFAULT 'USD',
        payment_status VARCHAR(50),
        payment_method VARCHAR(50),
        delivery_info JSONB DEFAULT '{}',
        metadata JSONB DEFAULT '{}',
        ordered_at TIMESTAMP WITH TIME ZONE,
        sync_status VARCHAR(50) DEFAULT 'synced',
        last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(connection_id, external_id)
      )
    `);

    // Integration Logs table
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS integration_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        connection_id UUID REFERENCES integration_connections(id) ON DELETE CASCADE,
        level VARCHAR(20) NOT NULL, -- 'debug', 'info', 'warn', 'error'
        event_type VARCHAR(100) NOT NULL,
        message TEXT NOT NULL,
        metadata JSONB DEFAULT '{}',
        request_data JSONB,
        response_data JSONB,
        error_details JSONB,
        duration_ms INTEGER,
        ip_address INET,
        user_agent TEXT,
        correlation_id VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Sync Status table
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS sync_status (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        connection_id UUID NOT NULL REFERENCES integration_connections(id) ON DELETE CASCADE,
        sync_type VARCHAR(50) NOT NULL, -- 'menu', 'orders', 'inventory'
        status VARCHAR(50) NOT NULL, -- 'pending', 'running', 'completed', 'failed'
        started_at TIMESTAMP WITH TIME ZONE,
        completed_at TIMESTAMP WITH TIME ZONE,
        items_processed INTEGER DEFAULT 0,
        items_total INTEGER DEFAULT 0,
        error_message TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // API Keys table
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        key_prefix VARCHAR(20) NOT NULL,
        key_hash VARCHAR(255) NOT NULL,
        scopes JSONB DEFAULT '[]',
        rate_limit INTEGER DEFAULT 1000,
        is_active BOOLEAN DEFAULT true,
        expires_at TIMESTAMP WITH TIME ZONE,
        last_used_at TIMESTAMP WITH TIME ZONE,
        usage_count INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Rate Limits table
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS rate_limits (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        identifier VARCHAR(255) NOT NULL, -- API key, user ID, or IP address
        identifier_type VARCHAR(50) NOT NULL, -- 'api_key', 'user', 'ip'
        endpoint VARCHAR(255),
        requests_count INTEGER DEFAULT 0,
        window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        window_duration_ms INTEGER DEFAULT 3600000, -- 1 hour
        limit_value INTEGER DEFAULT 1000,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(identifier, endpoint, window_start)
      )
    `);

    console.log('✅ Basic schema created successfully');

    // Create indexes
    console.log('🏗️  Creating database indexes...');

    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug)',
      'CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id)',
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
      'CREATE INDEX IF NOT EXISTS idx_users_api_key ON users(api_key)',
      'CREATE INDEX IF NOT EXISTS idx_integration_connections_org_id ON integration_connections(organization_id)',
      'CREATE INDEX IF NOT EXISTS idx_integration_connections_provider_id ON integration_connections(provider_id)',
      'CREATE INDEX IF NOT EXISTS idx_integration_connections_status ON integration_connections(status)',
      'CREATE INDEX IF NOT EXISTS idx_webhook_configurations_org_id ON webhook_configurations(organization_id)',
      'CREATE INDEX IF NOT EXISTS idx_webhook_configurations_connection_id ON webhook_configurations(connection_id)',
      'CREATE INDEX IF NOT EXISTS idx_menu_items_org_id ON menu_items(organization_id)',
      'CREATE INDEX IF NOT EXISTS idx_menu_items_connection_id ON menu_items(connection_id)',
      'CREATE INDEX IF NOT EXISTS idx_menu_items_external_id ON menu_items(external_id)',
      'CREATE INDEX IF NOT EXISTS idx_menu_items_sync_status ON menu_items(sync_status)',
      'CREATE INDEX IF NOT EXISTS idx_orders_org_id ON orders(organization_id)',
      'CREATE INDEX IF NOT EXISTS idx_orders_connection_id ON orders(connection_id)',
      'CREATE INDEX IF NOT EXISTS idx_orders_external_id ON orders(external_id)',
      'CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)',
      'CREATE INDEX IF NOT EXISTS idx_orders_ordered_at ON orders(ordered_at)',
      'CREATE INDEX IF NOT EXISTS idx_integration_logs_org_id ON integration_logs(organization_id)',
      'CREATE INDEX IF NOT EXISTS idx_integration_logs_connection_id ON integration_logs(connection_id)',
      'CREATE INDEX IF NOT EXISTS idx_integration_logs_level ON integration_logs(level)',
      'CREATE INDEX IF NOT EXISTS idx_integration_logs_event_type ON integration_logs(event_type)',
      'CREATE INDEX IF NOT EXISTS idx_integration_logs_created_at ON integration_logs(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_sync_status_connection_id ON sync_status(connection_id)',
      'CREATE INDEX IF NOT EXISTS idx_sync_status_type ON sync_status(sync_type)',
      'CREATE INDEX IF NOT EXISTS idx_sync_status_status ON sync_status(status)',
      'CREATE INDEX IF NOT EXISTS idx_api_keys_org_id ON api_keys(organization_id)',
      'CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash)',
      'CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON rate_limits(identifier)',
      'CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON rate_limits(window_start)'
    ];

    for (const indexQuery of indexes) {
      await dbClient.query(indexQuery);
    }

    console.log('✅ Indexes created successfully');

    await dbClient.end();

    console.log('\n🎉 Database setup completed successfully!');
    console.log('🔗 Connection URL: postgresql://postgres:E$$athecode006@localhost:5433/integration_platform');
    console.log('\n📝 Next steps:');
    console.log('1. Run: cd backend && npm install');
    console.log('2. Run: npm run db:migrate');
    console.log('3. Run: npm run db:seed');
    console.log('4. Run: npm run dev');

  } catch (error) {
    console.error('❌ Error setting up database:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  setupDatabase();
}

module.exports = { setupDatabase };