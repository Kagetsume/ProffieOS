/**
 * Vitest + jsdom setup — polyfills for Web Awesome form-associated custom elements.
 */

/** jsdom may lack Clipboard API — used by `<po-copy-panel>`. */
if (typeof navigator !== 'undefined' && !navigator.clipboard) {
  Object.assign(navigator, {
    clipboard: {
      writeText: async (): Promise<void> => {},
    },
  });
}
function createValidityState(flags: Partial<ValidityState> = {}): ValidityState {
  return {
    badInput: false,
    customError: false,
    patternMismatch: false,
    rangeOverflow: false,
    rangeUnderflow: false,
    stepMismatch: false,
    tooLong: false,
    tooShort: false,
    typeMismatch: false,
    valueMissing: false,
    valid: true,
    ...flags,
  };
}

class ElementInternalsStub {
  form: HTMLFormElement | null = null;

  labels: NodeListOf<HTMLLabelElement> = [] as unknown as NodeListOf<HTMLLabelElement>;

  private _validity = createValidityState();

  get validity(): ValidityState {
    return this._validity;
  }

  setFormValue(): void {}

  setValidity(flags: Partial<ValidityState> = {}, _message?: string, _anchor?: Element): void {
    const invalid = Object.entries(flags).some(
      ([key, value]) => key !== 'valid' && Boolean(value),
    );
    this._validity = createValidityState({
      ...flags,
      valid: flags.valid ?? !invalid,
    });
  }

  setWillValidate(): void {}

  checkValidity(): boolean {
    return this._validity.valid;
  }

  reportValidity(): boolean {
    return this._validity.valid;
  }
}

if (typeof HTMLElement !== 'undefined') {
  HTMLElement.prototype.attachInternals = function attachInternals(): ElementInternals {
    return new ElementInternalsStub() as unknown as ElementInternals;
  };
}

/** jsdom has no working 2d canvas — stub enough for layout/preview/component tests. */
function createCanvas2DStub(): CanvasRenderingContext2D {
  const noop = (): void => {};
  const gradient = { addColorStop: noop };
  return {
    setTransform: noop,
    clearRect: noop,
    fillRect: noop,
    beginPath: noop,
    moveTo: noop,
    arc: noop,
    lineTo: noop,
    closePath: noop,
    clip: noop,
    save: noop,
    restore: noop,
    drawImage: noop,
    createLinearGradient: () => gradient,
    fillStyle: '',
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    filter: 'none',
    imageSmoothingEnabled: true,
  } as unknown as CanvasRenderingContext2D;
}

if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = function getContext(type: string) {
    if (type !== '2d') {
      return null;
    }
    return createCanvas2DStub();
  };
}

/** jsdom may lack ResizeObserver — required by `<po-blade-preview>`. */
if (typeof globalThis.ResizeObserver === 'undefined') {
  class ResizeObserverStub implements ResizeObserver {
    constructor(private readonly callback: ResizeObserverCallback) {}

    observe(): void {
      this.callback([], this);
    }

    unobserve(): void {}

    disconnect(): void {}
  }
  globalThis.ResizeObserver = ResizeObserverStub;
}
