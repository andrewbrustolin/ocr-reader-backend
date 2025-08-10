import { Injectable } from '@nestjs/common';

export type OcrProgress = {
  status: 'idle' | 'queued' | 'running' | 'completed' | 'failed';
  progress: number;           // 0..100
  message?: string;           // last tesseract status message
  error?: string;             
  startedAt?: string;
  updatedAt?: string;
  finishedAt?: string;
};

@Injectable()
export class OcrProgressService {
  private readonly map = new Map<number, OcrProgress>();

  get(id: number): OcrProgress {
    return this.map.get(id) ?? { status: 'idle', progress: 0 };
  }

  set(id: number, patch: Partial<OcrProgress>) {
    const prev = this.get(id);
    const next: OcrProgress = {
      ...prev,
      ...patch,
      updatedAt: new Date().toISOString(),
    };

    if (patch.status === 'queued' || patch.status === 'running') {
      next.startedAt = next.startedAt ?? new Date().toISOString();
    }

    if (patch.status === 'completed' || patch.status === 'failed') {
      next.finishedAt = new Date().toISOString();
    }

    // Set the progress in the service
    this.map.set(id, next);
  }

  reset(id: number) {
    this.map.delete(id);
  }
}