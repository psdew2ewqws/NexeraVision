import React from 'react';
import { MousePointer2 } from 'lucide-react';

interface Collaborator {
  id: string;
  name: string;
  color: string;
  cursor: { x: number; y: number };
  isActive: boolean;
  lastSeen: Date;
}

interface CollaboratorCursorsProps {
  collaborators: Collaborator[];
  zoom: number;
}

export function CollaboratorCursors({ collaborators, zoom }: CollaboratorCursorsProps) {
  const activeCollaborators = collaborators.filter(
    c => c.isActive && Date.now() - c.lastSeen.getTime() < 30000 // Active within last 30 seconds
  );

  if (activeCollaborators.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {activeCollaborators.map(collaborator => (
        <div
          key={collaborator.id}
          className="absolute transition-all duration-100 ease-out"
          style={{
            left: collaborator.cursor.x * zoom,
            top: collaborator.cursor.y * zoom,
            zIndex: 1000,
          }}
        >
          {/* Cursor */}
          <div
            className="relative"
            style={{ color: collaborator.color }}
          >
            <MousePointer2 size={20} className="drop-shadow-sm" />

            {/* Name tag */}
            <div
              className="absolute top-5 left-2 px-2 py-1 text-xs text-white rounded shadow-lg whitespace-nowrap"
              style={{ backgroundColor: collaborator.color }}
            >
              {collaborator.name}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}