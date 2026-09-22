/**
 * Tests for Lit EffectorController bridge.
 */
import { createEvent, createStore } from 'effector';
import { LitElement, html } from 'lit';
import { describe, expect, it, vi } from 'vitest';
import { EffectorController } from './effector-controller';

const tick = createEvent<number>();
const $counter = createStore(0).on(tick, (_, value) => value);

class TestHost extends LitElement {
  readonly counterController = new EffectorController(this, $counter);

  render() {
    return html`<span>${this.counterController.value}</span>`;
  }
}

customElements.define('test-effector-host', TestHost);

describe('EffectorController', () => {
  it('reflects store updates into the host render cycle', async () => {
    tick(0);
    const host = document.createElement('test-effector-host') as TestHost;
    document.body.appendChild(host);
    await host.updateComplete;
    expect(host.shadowRoot?.textContent).toBe('0');

    tick(3);
    await host.updateComplete;
    expect(host.shadowRoot?.textContent).toBe('3');

    host.remove();
  });

  it('clears an existing watch when hostConnected runs again', async () => {
    tick(0);
    const host = document.createElement('test-effector-host') as TestHost;
    document.body.appendChild(host);
    await host.updateComplete;

    host.counterController.hostConnected();
    tick(5);
    await host.updateComplete;
    expect(host.shadowRoot?.textContent).toBe('5');

    host.remove();
  });

  it('hostDisconnected is safe when no watch was established', () => {
    tick(0);
    const host = document.createElement('test-effector-host') as TestHost;
    host.counterController.hostDisconnected();
    expect(host.counterController.value).toBe(0);
  });

  it('stops requesting updates after the host disconnects', async () => {
    tick(0);
    const host = document.createElement('test-effector-host') as TestHost;
    document.body.appendChild(host);
    await host.updateComplete;

    const requestUpdate = vi.spyOn(host, 'requestUpdate');
    host.remove();
    await host.updateComplete;

    tick(7);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(requestUpdate).not.toHaveBeenCalled();
  });
});
