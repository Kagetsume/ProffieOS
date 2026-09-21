/**
 * Lit reactive controller — subscribe a component to an Effector store.
 *
 * @module ui/effector-controller
 */
import type { ReactiveController, ReactiveControllerHost } from 'lit';
import type { Store } from 'effector';
import { contextLogger } from '../logger/index.js';

/** Keeps `value` in sync with a store; calls `requestUpdate` on change. */
export class EffectorController<T> implements ReactiveController {
  value: T;

  private unwatch?: () => void;

  constructor(
    private readonly host: ReactiveControllerHost,
    private readonly store: Store<T>,
  ) {
    this.value = store.getState();
    host.addController(this);
  }

  hostConnected(): void {
    const log = contextLogger('effector-controller', 'hostConnected');
    log.entry();
    if (this.unwatch) {
      log.debug('branch: clearing previous watch before reconnect');
      this.unwatch();
    }
    this.value = this.store.getState();
    this.unwatch = this.store.watch((state) => {
      this.value = state;
      if (this.hostIsConnected()) {
        this.host.requestUpdate();
      }
    });
    log.exit({ value: this.value });
  }

  hostDisconnected(): void {
    const log = contextLogger('effector-controller', 'hostDisconnected');
    log.entry();
    if (this.unwatch) {
      log.debug('branch: unsubscribing from store');
      this.unwatch();
    } else {
      log.debug('branch: no active watch to clear');
    }
    this.unwatch = undefined;
    log.exit();
  }

  private hostIsConnected(): boolean {
    const host = this.host as Partial<HTMLElement>;
    return host.isConnected !== false;
  }
}
