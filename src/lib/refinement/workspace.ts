import type { RefinementStroke } from '@/components/CutoutRefinementEditor';

export const REFINEMENT_WORKSPACE_SCHEMA_VERSION = 2;
export const REFINEMENT_WORKSPACE_MAX_AGE_MS = 60 * 60 * 1000;

export type RefinementWorkspaceMode = 'trial' | 'rewarded' | 'pro';
export type RefinementWorkspaceStatus = 'writing' | 'ready' | 'editing' | 'completed';
export type RefinementItemStatus = 'unmodified' | 'editing' | 'refined' | 'ineligible';
export type RefinementAssetPurpose = 'source' | 'transparent' | 'refined' | 'background';

export type RefinementAssetRef =
  | { kind: 'url'; url: string }
  | { kind: 'asset'; assetId: string };

export type RefinementWorkspace = {
  id: string;
  schemaVersion: typeof REFINEMENT_WORKSPACE_SCHEMA_VERSION;
  status: RefinementWorkspaceStatus;
  mode: RefinementWorkspaceMode;
  trialItemId: string | null;
  batchUnlocked: boolean;
  createdAt: number;
  updatedAt: number;
  itemOrder: string[];
};

export type RefinementWorkspaceItem = {
  id: string;
  workspaceId: string;
  name: string;
  order: number;
  eligible: boolean;
  ineligibleReason: string | null;
  processingMode: 'standard' | 'pro_high_precision';
  source: RefinementAssetRef | null;
  transparent: RefinementAssetRef | null;
  refined: RefinementAssetRef | null;
  background: RefinementAssetRef | null;
  backgroundValue: string | null;
  ratio: string;
  boundingBox?: { x: number; y: number; width: number; height: number };
  status: RefinementItemStatus;
  draftStrokes: RefinementStroke[];
};

export type RefinementAsset = {
  id: string;
  workspaceId: string;
  purpose: RefinementAssetPurpose;
  mimeType: string;
  size: number;
  blob: Blob;
};

export type RefinementWorkspaceBundle = {
  workspace: RefinementWorkspace;
  items: RefinementWorkspaceItem[];
};

export type WorkspaceSaveItem = Omit<
  RefinementWorkspaceItem,
  'workspaceId' | 'source' | 'transparent' | 'refined' | 'background' | 'draftStrokes' | 'status'
> & {
  source: string | Blob | null;
  transparent: string | Blob | null;
  background?: string | Blob | null;
};

