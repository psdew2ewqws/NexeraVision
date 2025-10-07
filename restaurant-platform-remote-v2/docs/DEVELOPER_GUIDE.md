# PrinterMaster WebSocket Developer Guide

**Document Version**: 1.0
**Last Updated**: October 7, 2025
**For**: Software Engineers, Contributors

---

## Getting Started

### Local Development Setup

```bash
# 1. Clone repository
git clone https://github.com/your-org/restaurant-platform-remote-v2.git
cd restaurant-platform-remote-v2

# 2. Install Node.js 18+
# Use nvm for version management
nvm install 18
nvm use 18

# 3. Install global dependencies
npm install -g @nestjs/cli prisma pm2

# 4. Setup PostgreSQL locally
# Create database named 'postgres' with password 'E$$athecode006'
createdb postgres

# 5. Install backend dependencies
cd backend
npm install

# 6. Configure environment
cp .env.example .env
# Edit .env with local database credentials

# 7. Run Prisma migrations
npx prisma migrate dev

# 8. Start backend in development mode
npm run start:dev

# 9. In new terminal, setup frontend
cd ../frontend
npm install

# 10. Configure frontend environment
cp .env.example .env.local
# Edit .env.local with backend URL (http://localhost:3001)

# 11. Start frontend development server
npm run dev
```

---

## Project Structure

```
restaurant-platform-remote-v2/
├── backend/                          # NestJS Backend
│   ├── src/
│   │   ├── common/                   # Shared utilities
│   │   │   ├── guards/               # Auth guards (JWT, License)
│   │   │   └── adapters/             # Socket.IO adapter
│   │   ├── modules/
│   │   │   ├── printing/             # Main printing module
│   │   │   │   ├── gateways/         # WebSocket gateway ⭐
│   │   │   │   ├── controllers/      # REST controllers
│   │   │   │   └── services/         # Business logic services
│   │   │   ├── database/             # Prisma service
│   │   │   └── [other modules]/
│   │   └── main.ts                   # Application entry point
│   ├── prisma/
│   │   └── schema.prisma             # Database schema
│   └── package.json
│
├── frontend/                         # Next.js Frontend
│   ├── pages/                        # Next.js pages
│   ├── src/
│   │   ├── components/               # React components
│   │   ├── contexts/                 # React contexts (Auth, WS)
│   │   ├── hooks/                    # Custom React hooks
│   │   └── services/                 # API clients
│   └── package.json
│
├── PrinterMasterv2/                  # Electron Desktop App
│   ├── apps/
│   │   └── desktop/                  # Main desktop app
│   │       ├── websocket-functions.js # WebSocket client ⭐
│   │       └── printer-manager.js    # Printer control
│   └── package.json
│
└── docs/                             # Documentation (Phase 15)
    ├── ARCHITECTURE.md
    ├── API_REFERENCE.md
    ├── OPERATIONAL_RUNBOOKS.md
    ├── TROUBLESHOOTING_GUIDE.md
    ├── DEPLOYMENT_GUIDE.md
    └── DEVELOPER_GUIDE.md (this file)
```

---

## Adding New WebSocket Events

### Backend (Gateway)

**File**: `backend/src/modules/printing/gateways/printing-websocket.gateway.ts`

```typescript
// 1. Define event handler
@SubscribeMessage('my:new:event')
handleMyNewEvent(
  @ConnectedSocket() client: Socket,
  @MessageBody() data: { myField: string }
) {
  this.logger.log(`📨 [NEW-EVENT] Received: ${data.myField}`);

  // Process data
  const result = this.processMyData(data);

  // Emit response back to sender
  client.emit('my:new:response', {
    success: true,
    result,
    timestamp: new Date().toISOString()
  });

  // Or broadcast to all clients
  this.server.emit('my:new:broadcast', {
    message: 'New event processed',
    data: result
  });
}

// 2. Add supporting method
private processMyData(data: any): any {
  // Your business logic here
  return { processed: true, original: data };
}
```

### Desktop App (Client)

**File**: `PrinterMasterv2/apps/desktop/websocket-functions.js`

```javascript
// 1. Add event listener
socket.on('my:new:event', (data) => {
  console.log('📨 [NEW-EVENT] Received from server:', data);

  // Process data
  const result = processDataLocally(data);

  // Send response back
  socket.emit('my:new:response', {
    success: true,
    result,
    timestamp: new Date().toISOString()
  });
});

// 2. Add helper function
function processDataLocally(data) {
  // Your processing logic
  return { processed: true, ...data };
}
```

### Frontend (Web Client)

**File**: `frontend/src/hooks/useWebSocket.ts` or component

```typescript
// 1. Add event listener in hook
useEffect(() => {
  if (!socket) return;

  socket.on('my:new:broadcast', (data) => {
    console.log('📨 [NEW-EVENT] Broadcast received:', data);
    setMyState(data.result);
  });

  return () => {
    socket.off('my:new:broadcast');
  };
}, [socket]);

// 2. Emit events from component
const handleAction = () => {
  socket?.emit('my:new:event', {
    myField: 'test data',
    timestamp: new Date().toISOString()
  });
};
```

---

## Testing WebSocket Events

### Manual Testing Script

```javascript
// File: test-my-event.js
const io = require('socket.io-client');

const socket = io('http://localhost:3001/printing-ws', {
  auth: {
    token: 'your-jwt-token-here',
    userRole: 'web_user'
  }
});

socket.on('connect', () => {
  console.log('✅ Connected');

  // Send test event
  socket.emit('my:new:event', {
    myField: 'test data'
  });
});

socket.on('my:new:response', (data) => {
  console.log('📨 Response received:', data);
  process.exit(0);
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error);
  process.exit(1);
});
```

**Run**:
```bash
node test-my-event.js
```

---

## Adding New REST Endpoints

**File**: `backend/src/modules/printing/printing.controller.ts`

```typescript
// 1. Add endpoint method
@Get('my-endpoint/:id')
@UseGuards(JwtAuthGuard)
async getMyData(
  @Param('id') id: string,
  @Req() req: any
) {
  this.logger.log(`📊 [MY-ENDPOINT] Fetching data for: ${id}`);

  // Call service method
  const data = await this.printingService.getMyData(id);

  return {
    success: true,
    data,
    timestamp: new Date().toISOString()
  };
}

// 2. Add POST endpoint with validation
@Post('my-endpoint')
@UseGuards(JwtAuthGuard)
async createMyData(
  @Body() dto: CreateMyDataDto,
  @Req() req: any
) {
  this.logger.log(`📝 [MY-ENDPOINT] Creating data: ${JSON.stringify(dto)}`);

  const result = await this.printingService.createMyData(dto);

  return {
    success: true,
    id: result.id,
    timestamp: new Date().toISOString()
  };
}
```

**Service Implementation**:

```typescript
// File: backend/src/modules/printing/printing.service.ts

async getMyData(id: string): Promise<any> {
  // Database query
  const data = await this.prisma.myTable.findUnique({
    where: { id }
  });

  if (!data) {
    throw new NotFoundException(`Data with ID ${id} not found`);
  }

  return data;
}

async createMyData(dto: CreateMyDataDto): Promise<any> {
  const data = await this.prisma.myTable.create({
    data: {
      ...dto,
      createdAt: new Date()
    }
  });

  // Broadcast to WebSocket clients
  this.printingGateway.broadcastMyDataCreated(data);

  return data;
}
```

---

## Debugging Tips

### Backend Debugging

```bash
# 1. Enable debug logs
LOG_LEVEL=debug npm run start:dev

# 2. Watch specific logs
pm2 logs backend --lines 100 | grep "PHYSICAL-TEST"

# 3. Debug with VSCode
# Add to .vscode/launch.json:
{
  "type": "node",
  "request": "launch",
  "name": "Debug NestJS",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["run", "start:debug"],
  "port": 9229,
  "restart": true,
  "console": "integratedTerminal"
}
```

### WebSocket Debugging

```javascript
// Frontend: Enable Socket.IO debug logs
localStorage.debug = 'socket.io-client:socket';

// Desktop App: Enable debug logging
// Add to websocket-functions.js:
socket.onAny((event, ...args) => {
  console.log(`📡 [WEBSOCKET-DEBUG] Event: ${event}`, args);
});
```

### Database Debugging

```bash
# Enable query logging
# Add to .env:
DATABASE_LOG_LEVEL=query

# Or use Prisma Studio
npx prisma studio

# Monitor slow queries
psql -h localhost -U postgres -d postgres -c "
  SELECT query, mean_exec_time, calls
  FROM pg_stat_statements
  WHERE mean_exec_time > 100
  ORDER BY mean_exec_time DESC
  LIMIT 20;
"
```

---

## Common Development Tasks

### Adding a New Database Table

```bash
# 1. Edit Prisma schema
nano backend/prisma/schema.prisma

# Add model:
model MyNewTable {
  id        String   @id @default(uuid())
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

# 2. Create migration
npx prisma migrate dev --name add_my_new_table

# 3. Generate Prisma Client
npx prisma generate

# 4. Use in code
const data = await this.prisma.myNewTable.create({...});
```

### Implementing Correlation ID Pattern

```typescript
// 1. Generate correlation ID
const correlationId = this.generateCorrelationId('my_operation');

// 2. Register pending request
return new Promise((resolve, reject) => {
  this.registerPendingRequest(
    correlationId,
    'my_operation',
    15000, // timeout in ms
    (response) => resolve(response),
    (error) => reject(error)
  );

  // 3. Emit event with correlation ID
  desktopClient.emit('my:operation', {
    ...data,
    correlationId
  });
});

// 4. Handle response
@SubscribeMessage('my:operation:result')
handleOperationResult(
  @MessageBody() data: { correlationId: string; result: any }
) {
  // Resolve pending request
  this.resolvePendingRequest(data.correlationId, data.result);
}
```

---

## Code Style Guidelines

### TypeScript Conventions

```typescript
// ✅ Good
export interface PrinterTestRequest {
  printerId: string;
  printerName: string;
  correlationId: string;
}

async function sendPrintTest(request: PrinterTestRequest): Promise<PrintTestResult> {
  this.logger.log(`Sending test to: ${request.printerName}`);
  // ...
}

// ❌ Avoid
function test(data: any): any {
  console.log(data);
  // ...
}
```

### Logging Standards

```typescript
// ✅ Good - Structured logs with context
this.logger.log(`🖨️ [PRINT-TEST] Sending test to ${printerName} (${correlationId})`);
this.logger.warn(`⚠️ [RATE-LIMIT] Branch ${branchId} exceeded limit`);
this.logger.error(`❌ [ERROR] Failed to process: ${error.message}`);

// ❌ Avoid
console.log('test');
this.logger.log('error');
```

### Error Handling

```typescript
// ✅ Good
try {
  const result = await this.dangerousOperation();
  return { success: true, data: result };
} catch (error) {
  this.logger.error(`❌ [OPERATION] Failed: ${error.message}`, error.stack);
  throw new InternalServerErrorException('Operation failed');
}

// ❌ Avoid
try {
  await this.dangerousOperation();
} catch (e) {
  // Silent failure
}
```

---

## Git Workflow

```bash
# 1. Create feature branch
git checkout -b feature/add-new-websocket-event

# 2. Make changes and commit frequently
git add .
git commit -m "feat: Add new WebSocket event for printer calibration"

# 3. Push to remote
git push origin feature/add-new-websocket-event

# 4. Create pull request
# Use GitHub/GitLab UI to create PR

# 5. After review, merge to main
git checkout main
git pull origin main
git merge feature/add-new-websocket-event
git push origin main

# 6. Deploy to production
# Follow DEPLOYMENT_GUIDE.md
```

### Commit Message Conventions

```
feat: Add new feature
fix: Bug fix
docs: Documentation changes
refactor: Code refactoring
test: Add or update tests
chore: Build process, dependencies
perf: Performance improvements
style: Code formatting

Examples:
feat: Add printer health monitoring endpoint
fix: Resolve correlation ID timeout issue
docs: Update WebSocket API reference
perf: Optimize status update batching
```

---

## Testing

### Unit Tests

```typescript
// File: backend/src/modules/printing/printing.service.spec.ts

describe('PrintingService', () => {
  let service: PrintingService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [PrintingService, PrismaService]
    }).compile();

    service = module.get(PrintingService);
    prisma = module.get(PrismaService);
  });

  it('should create printer test request', async () => {
    const result = await service.createTestRequest('printer-123');
    expect(result.correlationId).toBeDefined();
    expect(result.status).toBe('queued');
  });
});
```

### Integration Tests

```typescript
// Test WebSocket events
describe('Printing WebSocket Gateway', () => {
  let socket: Socket;

  beforeAll(() => {
    socket = io('http://localhost:3001/printing-ws', {
      auth: { token: 'test-token' }
    });
  });

  it('should receive printer test result', (done) => {
    socket.emit('printer:test', { printerId: 'test-123' });

    socket.on('printer:test:result', (data) => {
      expect(data.correlationId).toBeDefined();
      done();
    });
  }, 10000);
});
```

---

## Useful Resources

- **NestJS Docs**: https://docs.nestjs.com/
- **Socket.IO Docs**: https://socket.io/docs/v4/
- **Prisma Docs**: https://www.prisma.io/docs/
- **Next.js Docs**: https://nextjs.org/docs
- **Project Architecture**: See `docs/ARCHITECTURE.md`
- **API Reference**: See `docs/API_REFERENCE.md`

---

**Document Maintained By**: Engineering Team
**Last Review Date**: October 7, 2025
**Next Review Date**: January 7, 2026
**Contact**: dev@example.com
