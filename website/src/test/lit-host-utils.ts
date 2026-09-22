/**
 * Shared helpers for Lit component tests in jsdom.
 */
export type LitHost = HTMLElement & { updateComplete?: Promise<boolean> };

/** Wait for Lit's update cycle to finish. */
export async function updateComplete(el: LitHost): Promise<void> {
  await el.updateComplete;
}

/** Append to document, wait for first render, return cleanup. */
export async function mount<T extends LitHost>(el: T): Promise<{ el: T; unmount: () => void }> {
  document.body.appendChild(el);
  await updateComplete(el);
  return {
    el,
    unmount: () => {
      el.remove();
    },
  };
}

/** Light DOM or shadow root for a Lit host. */
export function renderRoot(host: HTMLElement): ParentNode {
  return host.shadowRoot ?? host;
}

/** Find one element by `data-testid` within a host (shadow or light DOM). */
export function getByTestId(host: HTMLElement, testId: string): HTMLElement {
  const match = renderRoot(host).querySelector(`[data-testid="${testId}"]`);
  if (!(match instanceof HTMLElement)) {
    throw new Error(`Missing data-testid="${testId}" under <${host.tagName.toLowerCase()}>`);
  }
  return match;
}

/** Find all elements with the same `data-testid` within a host. */
export function getAllByTestId(host: HTMLElement, testId: string): HTMLElement[] {
  return [...renderRoot(host).querySelectorAll(`[data-testid="${testId}"]`)].filter(
    (node): node is HTMLElement => node instanceof HTMLElement,
  );
}

/** Find elements whose `data-testid` starts with a prefix (e.g. `sidebar-nav-link-`). */
export function getAllByTestIdPrefix(host: HTMLElement, prefix: string): HTMLElement[] {
  return [...renderRoot(host).querySelectorAll(`[data-testid^="${prefix}"]`)].filter(
    (node): node is HTMLElement => node instanceof HTMLElement,
  );
}
