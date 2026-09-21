/**
 * Vitest + jsdom setup — polyfills for Web Awesome form-associated custom elements.
 */
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

/** jsdom has no working 2d canvas — stub enough for layout/preview tests. */
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = function getContext(type: string) {
    if (type !== '2d') {
      return null;
    }
    return {
      setTransform: () => {},
      beginPath: () => {},
      moveTo: () => {},
      arc: () => {},
      lineTo: () => {},
      closePath: () => {},
      clip: () => {},
    } as unknown as CanvasRenderingContext2D;
  };
}
