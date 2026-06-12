export const TAU = Math.PI * 2;

export function rad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function deg(radians: number): number {
  return (radians * 180) / Math.PI;
}

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function dist(ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  return Math.sqrt(dx * dx + dy * dy);
}

export function dist2(ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  return dx * dx + dy * dy;
}

/** Angle in degrees from (ax,ay) to (bx,by). 0 = +x, 90 = +y (down on screen). */
export function angleTo(ax: number, ay: number, bx: number, by: number): number {
  return deg(Math.atan2(by - ay, bx - ax));
}

export function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function randInt(min: number, max: number): number {
  return Math.floor(randRange(min, max + 1));
}

export function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function chance(p: number): boolean {
  return Math.random() < p;
}

export function wrap360(a: number): number {
  a %= 360;
  return a < 0 ? a + 360 : a;
}

/** Shortest signed difference between two angles in degrees. */
export function angleDiff(a: number, b: number): number {
  let d = wrap360(b - a);
  if (d > 180) d -= 360;
  return d;
}

export function easeOutCubic(t: number): number {
  const u = 1 - t;
  return 1 - u * u * u;
}

export function quadBezier(p0: number, p1: number, p2: number, t: number): number {
  const u = 1 - t;
  return u * u * p0 + 2 * u * t * p1 + t * t * p2;
}
