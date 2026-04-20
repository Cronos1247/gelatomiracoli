class ShimDOMMatrix {
  a = 1;
  b = 0;
  c = 0;
  d = 1;
  e = 0;
  f = 0;
}

class ShimCanvasRenderingContext2D {}

export { ShimCanvasRenderingContext2D as CanvasRenderingContext2D, ShimDOMMatrix as DOMMatrix };

export function createCanvas() {
  return {
    getContext: () => new ShimCanvasRenderingContext2D(),
  };
}

const canvasShim = {
  DOMMatrix: ShimDOMMatrix,
  CanvasRenderingContext2D: ShimCanvasRenderingContext2D,
  createCanvas,
};

export default canvasShim;
