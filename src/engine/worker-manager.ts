/**
 * Worker Manager
 *
 * Manages the projection web worker for non-blocking UI during calculations.
 */

import type { FinancialProfile } from '@models/profile';
import type { Trajectory } from '@models/trajectory';
import type { Comparison, Change } from '@models/comparison';
import type { WorkerRequest, WorkerRequestBody, WorkerResponse } from '@workers/projection-worker';

/**
 * Manages communication with the projection web worker.
 */
export class ProjectionWorkerManager {
  private worker: Worker | null = null;
  private pendingRequests: Map<
    number,
    { resolve: (value: unknown) => void; reject: (reason: unknown) => void }
  > = new Map();
  private requestId = 0;

  /**
   * Initialize the worker.
   */
  private ensureWorker(): Worker {
    if (this.worker === null) {
      this.worker = new Worker(
        new URL('../workers/projection-worker.ts', import.meta.url),
        { type: 'module' }
      );

      this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        this.handleResponse(event.data);
      };

      this.worker.onerror = (error) => {
        console.error('Worker error:', error);
        // Reject all pending requests
        for (const [_, handlers] of this.pendingRequests) {
          handlers.reject(new Error('Worker error'));
        }
        this.pendingRequests.clear();
      };
    }

    return this.worker;
  }

  /**
   * Handle response from worker.
   * Matches responses to requests using the requestId.
   */
  private handleResponse(response: WorkerResponse): void {
    const handlers = this.pendingRequests.get(response.requestId);
    if (!handlers) {
      // Response for unknown request (possibly cancelled or timed out)
      return;
    }

    this.pendingRequests.delete(response.requestId);

    if (response.type === 'error') {
      handlers.reject(new Error(response.error));
    } else {
      handlers.resolve(response);
    }
  }

  /**
   * Send a request to the worker.
   * Automatically assigns and tracks a unique requestId.
   */
  private sendRequest<T>(request: WorkerRequestBody): Promise<T> {
    return new Promise((resolve, reject) => {
      const requestId = this.requestId++;
      this.pendingRequests.set(requestId, {
        resolve: resolve as (value: unknown) => void,
        reject,
      });

      const worker = this.ensureWorker();
      const fullRequest: WorkerRequest = { ...request, requestId };
      worker.postMessage(fullRequest);
    });
  }

  /**
   * Generate a full trajectory in the background.
   */
  async generateTrajectory(profile: FinancialProfile): Promise<Trajectory> {
    const response = await this.sendRequest<{ type: 'trajectory'; trajectory: Trajectory }>({
      type: 'generate',
      profile,
    });
    return response.trajectory;
  }

  /**
   * Generate a quick preview trajectory.
   */
  async generateQuickTrajectory(
    profile: FinancialProfile,
    years: number = 10
  ): Promise<Trajectory> {
    const response = await this.sendRequest<{ type: 'trajectory'; trajectory: Trajectory }>({
      type: 'generateQuick',
      profile,
      years,
    });
    return response.trajectory;
  }

  /**
   * Compare two trajectories in the background.
   */
  async compareTrajectories(
    baseline: Trajectory,
    alternate: Trajectory,
    changes: Change[],
    name: string = 'Comparison'
  ): Promise<Comparison> {
    const response = await this.sendRequest<{ type: 'comparison'; comparison: Comparison }>({
      type: 'compare',
      baseline,
      alternate,
      changes,
      name,
    });
    return response.comparison;
  }

  /**
   * Terminate the worker.
   */
  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.pendingRequests.clear();
    }
  }
}

/**
 * Singleton instance for the application.
 */
let workerInstance: ProjectionWorkerManager | null = null;

/**
 * Get the singleton worker manager instance.
 */
export function getProjectionWorker(): ProjectionWorkerManager {
  if (workerInstance === null) {
    workerInstance = new ProjectionWorkerManager();
  }
  return workerInstance;
}

/**
 * Check if Web Workers are supported.
 */
export function supportsWebWorkers(): boolean {
  return typeof Worker !== 'undefined';
}

/**
 * Generate trajectory, using worker if available, otherwise main thread.
 */
export async function generateTrajectoryAsync(
  profile: FinancialProfile
): Promise<Trajectory> {
  if (supportsWebWorkers()) {
    try {
      return await getProjectionWorker().generateTrajectory(profile);
    } catch {
      // Fall back to main thread
    }
  }

  // Import dynamically to avoid circular dependencies in worker
  const { generateTrajectory } = await import('./projector');
  return generateTrajectory(profile);
}
