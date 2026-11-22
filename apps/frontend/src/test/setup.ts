globalThis.structuredClone ??= (value: unknown) =>
  JSON.parse(JSON.stringify(value));

Element.prototype.scrollTo ??= () => undefined;

globalThis.ResizeObserver ??= class ResizeObserver {
  observe() {
    // no-op stub
  }

  unobserve() {
    // no-op stub
  }

  disconnect() {
    // no-op stub
  }
};
