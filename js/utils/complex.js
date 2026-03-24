/**
 * Complex number utilities (optional, for clarity)
 * Basic operations used in fractal iteration
 */

export function add(a, b) {
  return { re: a.re + b.re, im: a.im + b.im };
}

export function square(z) {
  return {
    re: z.re * z.re - z.im * z.im,
    im: 2 * z.re * z.im
  };
}

export function modulusSq(z) {
  return z.re * z.re + z.im * z.im;
}
