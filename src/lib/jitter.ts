// Deterministic jitter (§7). Seeded from a point's index so points keep their
// horizontal offset across redraws instead of jumping on every restyle.

// Integer hash → [0, 1).
function hash(n: number): number {
  let x = (n | 0) + 0x9e3779b9;
  x = Math.imul(x ^ (x >>> 16), 0x21f0aaad);
  x = Math.imul(x ^ (x >>> 15), 0x735a2d97);
  x ^= x >>> 15;
  return (x >>> 0) / 4294967296;
}

// Symmetric horizontal offset in [-width/2, +width/2], stable per (index, seed).
export function jitter(index: number, width: number, seed = 0): number {
  return (hash(index * 2654435761 + seed * 40503) - 0.5) * width;
}
