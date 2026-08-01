export interface RequestScope {
  signal: AbortSignal;
  isCurrent: () => boolean;
}

/**
 * Owns one latest-wins request lane.
 *
 * Aborting saves browser work, while the sequence comparison remains the
 * correctness guard for transports that resolve after cancellation.
 */
export class RequestSequence {
  private sequence = 0;
  private controller: AbortController | null = null;

  begin(): RequestScope {
    this.controller?.abort();

    const sequence = ++this.sequence;
    const controller = new AbortController();
    this.controller = controller;

    return {
      signal: controller.signal,
      isCurrent: () => sequence === this.sequence && !controller.signal.aborted,
    };
  }

  invalidate(): void {
    this.sequence += 1;
    this.controller?.abort();
    this.controller = null;
  }
}
