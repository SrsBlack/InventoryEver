import React, { createContext, useContext } from 'react';
import { useWorkspace } from '../hooks/useWorkspace';
import type { Workspace } from '../types';

interface WorkspaceContextValue {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  loading: boolean;
  error: string | null;
  fetchWorkspaces: () => Promise<void>;
  createWorkspace: (name: string, type?: 'personal' | 'family' | 'business') => Promise<Workspace>;
  switchWorkspace: (workspace: Workspace) => Promise<void>;
  updateWorkspace: (id: string, updates: Partial<Workspace>) => Promise<Workspace>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({
  children,
  userId,
}: {
  children: React.ReactNode;
  userId: string | undefined;
}) {
  const workspace = useWorkspace(userId);
  return <WorkspaceContext.Provider value={workspace}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspaceContext(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspaceContext must be used within WorkspaceProvider');
  return ctx;
}
