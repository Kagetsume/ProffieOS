/**
 * Lit reactive controller — subscribe a component to an Effector store.
 *
 * @module ui/effector-controller
 */
import type { ReactiveController, ReactiveControllerHost } from 'lit';
import type { Store } from 'effector';
import { contextLogger } from '../logger/index.js';

/**
 * Keeps a mirrored store value on the host and triggers Lit re-renders when the
 * store changes.
 *
 * Register via the constructor; Lit invokes {@link hostConnected} and
 * {@link hostDisconnected} to subscribe and unsubscribe from the store.
 */
export class EffectorController<T> implements ReactiveController {
  /** Latest snapshot of the bound Effector store state. */
  value: T;

  private unwatch?: () => void;

  /**
   * Binds an Effector store to a Lit reactive controller host.
   *
   * Initializes {@link value} from the store's current state and registers this
   * controller on the host so lifecycle hooks run automatically.
   *
   * @param host - Lit element (or other reactive host) that owns this controller.
   * @param store - Effector store whose state is mirrored into {@link value}.
   */
  constructor(
    private readonly host: ReactiveControllerHost,
    private readonly store: Store<T>,
  ) {
    this.value = store.getState();
    host.addController(this);
  }

  /**
   * Lit reactive controller hook invoked when the host connects to the document.
   *
   * Subscribes to the store, syncs {@link value}, and calls
   * {@link ReactiveControllerHost.requestUpdate} on each state change while the
   * host remains connected.
   *
   * @returns Nothing.
   */
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

  /**
   * Lit reactive controller hook invoked when the host disconnects from the document.
   *
   * Unsubscribes from the store and clears the watch handle.
   *
   * @returns Nothing.
   */
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

  /**
   * Determines whether the host element is currently connected to the document.
   *
   * Treats hosts without an `isConnected` property as connected so non-DOM hosts
   * still receive updates.
   *
   * @returns `true` when the host is connected or lacks an `isConnected` flag.
   */
  private hostIsConnected(): boolean {
    const host = this.host as Partial<HTMLElement>;
    return host.isConnected !== false;
  }
}
