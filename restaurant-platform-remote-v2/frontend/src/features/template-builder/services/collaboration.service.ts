/**
 * Real-time Collaboration Service for Template Builder
 * Handles WebSocket connections for live collaboration features
 */

interface CollaborationUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  color: string;
  cursor: { x: number; y: number };
  selection: string[];
  isActive: boolean;
  lastSeen: Date;
}

interface CollaborationEvent {
  type: 'cursor_move' | 'selection_change' | 'component_update' | 'user_join' | 'user_leave' | 'lock_component' | 'unlock_component';
  userId: string;
  templateId: string;
  data: any;
  timestamp: Date;
}

class CollaborationService {
  private ws: WebSocket | null = null;
  private templateId: string | null = null;
  private currentUser: CollaborationUser | null = null;
  private collaborators: Map<string, CollaborationUser> = new Map();
  private eventListeners: Map<string, Function[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  // Color palette for collaborators
  private readonly collaboratorColors = [
    '#3B82F6', // Blue
    '#EF4444', // Red
    '#10B981', // Green
    '#F59E0B', // Amber
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#84CC16', // Lime
    '#F97316', // Orange
    '#6366F1', // Indigo
  ];

  constructor() {
    this.setupHeartbeat();
  }

  /**
   * Connect to collaboration server for a specific template
   */
  async connect(templateId: string, user: { id: string; name: string; email: string; avatar?: string }) {
    this.templateId = templateId;
    this.currentUser = {
      ...user,
      color: this.getRandomColor(),
      cursor: { x: 0, y: 0 },
      selection: [],
      isActive: true,
      lastSeen: new Date(),
    };

    try {
      const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'}/collaboration/${templateId}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);

    } catch (error) {
      console.error('Failed to connect to collaboration server:', error);
      this.emit('connection_error', error);
    }
  }

  /**
   * Disconnect from collaboration server
   */
  disconnect() {
    if (this.ws) {
      this.sendEvent({
        type: 'user_leave',
        userId: this.currentUser!.id,
        templateId: this.templateId!,
        data: {},
        timestamp: new Date(),
      });

      this.ws.close();
      this.ws = null;
    }

    this.templateId = null;
    this.currentUser = null;
    this.collaborators.clear();
    this.reconnectAttempts = 0;
  }

  /**
   * Send cursor position update
   */
  updateCursor(x: number, y: number) {
    if (!this.currentUser || !this.isConnected()) return;

    this.currentUser.cursor = { x, y };
    this.currentUser.lastSeen = new Date();

    this.sendEvent({
      type: 'cursor_move',
      userId: this.currentUser.id,
      templateId: this.templateId!,
      data: { x, y },
      timestamp: new Date(),
    });
  }

  /**
   * Send selection change
   */
  updateSelection(selectedComponentIds: string[]) {
    if (!this.currentUser || !this.isConnected()) return;

    this.currentUser.selection = selectedComponentIds;
    this.currentUser.lastSeen = new Date();

    this.sendEvent({
      type: 'selection_change',
      userId: this.currentUser.id,
      templateId: this.templateId!,
      data: { selection: selectedComponentIds },
      timestamp: new Date(),
    });
  }

  /**
   * Send component update
   */
  updateComponent(componentId: string, updates: any) {
    if (!this.currentUser || !this.isConnected()) return;

    this.sendEvent({
      type: 'component_update',
      userId: this.currentUser.id,
      templateId: this.templateId!,
      data: { componentId, updates },
      timestamp: new Date(),
    });
  }

  /**
   * Lock component for exclusive editing
   */
  lockComponent(componentId: string) {
    if (!this.currentUser || !this.isConnected()) return;

    this.sendEvent({
      type: 'lock_component',
      userId: this.currentUser.id,
      templateId: this.templateId!,
      data: { componentId },
      timestamp: new Date(),
    });
  }

  /**
   * Unlock component
   */
  unlockComponent(componentId: string) {
    if (!this.currentUser || !this.isConnected()) return;

    this.sendEvent({
      type: 'unlock_component',
      userId: this.currentUser.id,
      templateId: this.templateId!,
      data: { componentId },
      timestamp: new Date(),
    });
  }

  /**
   * Get list of active collaborators
   */
  getCollaborators(): CollaborationUser[] {
    return Array.from(this.collaborators.values())
      .filter(user => user.id !== this.currentUser?.id && user.isActive);
  }

  /**
   * Check if connected to collaboration server
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Add event listener
   */
  on(event: string, callback: Function) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  /**
   * Remove event listener
   */
  off(event: string, callback: Function) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to listeners
   */
  private emit(event: string, data?: any) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  /**
   * Handle WebSocket open
   */
  private handleOpen() {
    console.log('Connected to collaboration server');
    this.reconnectAttempts = 0;

    // Send user join event
    this.sendEvent({
      type: 'user_join',
      userId: this.currentUser!.id,
      templateId: this.templateId!,
      data: this.currentUser!,
      timestamp: new Date(),
    });

    this.emit('connected');
  }

  /**
   * Handle WebSocket message
   */
  private handleMessage(event: MessageEvent) {
    try {
      const collaborationEvent: CollaborationEvent = JSON.parse(event.data);
      this.processEvent(collaborationEvent);
    } catch (error) {
      console.error('Failed to parse collaboration event:', error);
    }
  }

  /**
   * Handle WebSocket close
   */
  private handleClose() {
    console.log('Disconnected from collaboration server');
    this.emit('disconnected');

    // Attempt to reconnect
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        this.reconnectAttempts++;
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        if (this.templateId && this.currentUser) {
          this.connect(this.templateId, this.currentUser);
        }
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  /**
   * Handle WebSocket error
   */
  private handleError(error: Event) {
    console.error('Collaboration WebSocket error:', error);
    this.emit('error', error);
  }

  /**
   * Send event to server
   */
  private sendEvent(event: CollaborationEvent) {
    if (this.isConnected()) {
      this.ws!.send(JSON.stringify(event));
    }
  }

  /**
   * Process incoming collaboration event
   */
  private processEvent(event: CollaborationEvent) {
    // Don't process our own events
    if (event.userId === this.currentUser?.id) return;

    switch (event.type) {
      case 'user_join':
        this.handleUserJoin(event);
        break;

      case 'user_leave':
        this.handleUserLeave(event);
        break;

      case 'cursor_move':
        this.handleCursorMove(event);
        break;

      case 'selection_change':
        this.handleSelectionChange(event);
        break;

      case 'component_update':
        this.handleComponentUpdate(event);
        break;

      case 'lock_component':
        this.handleComponentLock(event);
        break;

      case 'unlock_component':
        this.handleComponentUnlock(event);
        break;
    }
  }

  /**
   * Handle user join event
   */
  private handleUserJoin(event: CollaborationEvent) {
    const userData = event.data as CollaborationUser;

    // Assign color if not already assigned
    if (!userData.color) {
      userData.color = this.getRandomColor();
    }

    this.collaborators.set(event.userId, userData);
    this.emit('user_joined', userData);
  }

  /**
   * Handle user leave event
   */
  private handleUserLeave(event: CollaborationEvent) {
    const user = this.collaborators.get(event.userId);
    if (user) {
      this.collaborators.delete(event.userId);
      this.emit('user_left', user);
    }
  }

  /**
   * Handle cursor move event
   */
  private handleCursorMove(event: CollaborationEvent) {
    const user = this.collaborators.get(event.userId);
    if (user) {
      user.cursor = event.data;
      user.lastSeen = new Date(event.timestamp);
      user.isActive = true;
      this.emit('cursor_moved', { user, position: event.data });
    }
  }

  /**
   * Handle selection change event
   */
  private handleSelectionChange(event: CollaborationEvent) {
    const user = this.collaborators.get(event.userId);
    if (user) {
      user.selection = event.data.selection;
      user.lastSeen = new Date(event.timestamp);
      this.emit('selection_changed', { user, selection: event.data.selection });
    }
  }

  /**
   * Handle component update event
   */
  private handleComponentUpdate(event: CollaborationEvent) {
    this.emit('component_updated', {
      userId: event.userId,
      componentId: event.data.componentId,
      updates: event.data.updates,
    });
  }

  /**
   * Handle component lock event
   */
  private handleComponentLock(event: CollaborationEvent) {
    this.emit('component_locked', {
      userId: event.userId,
      componentId: event.data.componentId,
    });
  }

  /**
   * Handle component unlock event
   */
  private handleComponentUnlock(event: CollaborationEvent) {
    this.emit('component_unlocked', {
      userId: event.userId,
      componentId: event.data.componentId,
    });
  }

  /**
   * Get random color for collaborator
   */
  private getRandomColor(): string {
    const usedColors = Array.from(this.collaborators.values()).map(user => user.color);
    const availableColors = this.collaboratorColors.filter(color => !usedColors.includes(color));

    if (availableColors.length > 0) {
      return availableColors[Math.floor(Math.random() * availableColors.length)];
    }

    // If all colors are used, return a random one
    return this.collaboratorColors[Math.floor(Math.random() * this.collaboratorColors.length)];
  }

  /**
   * Setup heartbeat to keep connection alive
   */
  private setupHeartbeat() {
    setInterval(() => {
      if (this.isConnected() && this.currentUser) {
        this.currentUser.lastSeen = new Date();
        this.sendEvent({
          type: 'cursor_move', // Use cursor move as heartbeat
          userId: this.currentUser.id,
          templateId: this.templateId!,
          data: this.currentUser.cursor,
          timestamp: new Date(),
        });
      }
    }, 30000); // Send heartbeat every 30 seconds
  }

  /**
   * Simulate collaboration for demo purposes (when WebSocket is not available)
   */
  enableDemoMode() {
    // Add some fake collaborators for demonstration
    const demoUsers = [
      {
        id: 'demo-user-1',
        name: 'John Designer',
        email: 'john@company.com',
        color: '#3B82F6',
        cursor: { x: 100, y: 200 },
        selection: [],
        isActive: true,
        lastSeen: new Date(),
      },
      {
        id: 'demo-user-2',
        name: 'Sarah Manager',
        email: 'sarah@company.com',
        color: '#EF4444',
        cursor: { x: 300, y: 150 },
        selection: [],
        isActive: true,
        lastSeen: new Date(),
      },
    ];

    demoUsers.forEach(user => {
      this.collaborators.set(user.id, user);
    });

    // Simulate cursor movements
    setInterval(() => {
      demoUsers.forEach(user => {
        user.cursor.x += (Math.random() - 0.5) * 10;
        user.cursor.y += (Math.random() - 0.5) * 10;
        user.cursor.x = Math.max(0, Math.min(800, user.cursor.x));
        user.cursor.y = Math.max(0, Math.min(600, user.cursor.y));

        this.emit('cursor_moved', { user, position: user.cursor });
      });
    }, 2000);

    this.emit('connected');
  }
}

// Export singleton instance
export const collaborationService = new CollaborationService();

// Export types
export type { CollaborationUser, CollaborationEvent };