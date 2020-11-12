import parseSVG from "parse-svg-path";
import absSVG from "abs-svg-path";
import normalizeSVG from "normalize-svg-path";
import { cubicBezier, round, Vector } from "./Math";
import Animated, { interpolate } from "react-native-reanimated";

interface Curve {
  to: Vector;
  c1: Vector;
  c2: Vector;
}
export type Path = {
  move: Vector;
  curves: Curve[];
  close: boolean;
};
export const serialize = (path: Path) => {
  "worklet";
  return `M${path.move.x},${path.move.y} ${path.curves
    .map((c) => `C${c.c1.x},${c.c1.y} ${c.c2.x},${c.c2.y} ${c.to.x},${c.to.y}`)
    .join(" ")}${path.close ? "Z" : ""}`;
};

/**
 * @summary Create a new path
 */
export const createPath = (move: Vector): Path => {
  "worklet";
  return {
    move,
    curves: [],
    close: false,
  };
};
/**
 * @summary Add a close command to a path.
 */
export const close = (path: Path) => {
  "worklet";
  path.close = true;
};
/**
 * @summary Add a cubic Bèzier curve command to a path.
 */
export const addCurve = (path: Path, c: Curve) => {
  "worklet";
  path.curves.push({
    c1: c.c1,
    c2: c.c2,
    to: c.to,
  });
};
/**
 * @summary Interpolate two paths with an animation value that goes from 0 to 1
 */
/**
 * @summary Interpolate between paths.
 */
export const interpolatePath = (
  value: number,
  inputRange: number[],
  outputRange: Path[],
  extrapolate = Animated.Extrapolate.CLAMP
) => {
  "worklet";
  const path = {
    move: {
      x: interpolate(
        value,
        inputRange,
        outputRange.map((p) => p.move.x),
        extrapolate
      ),
      y: interpolate(
        value,
        inputRange,
        outputRange.map((p) => p.move.y),
        extrapolate
      ),
    },
    curves: outputRange[0].curves.map((_, index) => ({
      c1: {
        x: interpolate(
          value,
          inputRange,
          outputRange.map((p) => p.curves[index].c1.x),
          extrapolate
        ),
        y: interpolate(
          value,
          inputRange,
          outputRange.map((p) => p.curves[index].c1.y),
          extrapolate
        ),
      },
      c2: {
        x: interpolate(
          value,
          inputRange,
          outputRange.map((p) => p.curves[index].c2.x),
          extrapolate
        ),
        y: interpolate(
          value,
          inputRange,
          outputRange.map((p) => p.curves[index].c2.y),
          extrapolate
        ),
      },
      to: {
        x: interpolate(
          value,
          inputRange,
          outputRange.map((p) => p.curves[index].to.x),
          extrapolate
        ),
        y: interpolate(
          value,
          inputRange,
          outputRange.map((p) => p.curves[index].to.y),
          extrapolate
        ),
      },
    })),
    close: outputRange[0].close,
  };
  return serialize(path);
};

export const mixPath = (
  value: number,
  p1: Path,
  p2: Path,
  extrapolate = Animated.Extrapolate.CLAMP
) => {
  "worklet";
  return interpolatePath(value, [0, 1], [p1, p2], extrapolate);
};
/**
 * @description ⚠️ this function cannot run on the UI thread. It must be executed on the JS thread
 * @summary Parse an SVG path into a sequence of Bèzier curves.
 * The SVG is normalized to have absolute values and to be approximated to a sequence of Bèzier curves.
 */
type SVGCloseCommand = ["Z"];
type SVGMoveCommand = ["M", number, number];
type SVGCurveCommand = ["C", number, number, number, number, number, number];
type SVGNormalizedCommands = [
  SVGMoveCommand,
  ...(SVGCurveCommand | SVGCloseCommand)[]
];
export const parse = (d: string): Path => {
  const segments: SVGNormalizedCommands = normalizeSVG(absSVG(parseSVG(d)));
  const path = createPath({ x: segments[0][1], y: segments[0][2] });
  segments.forEach((segment) => {
    if (segment[0] === "Z") {
      close(path);
    } else if (segment[0] === "C") {
      addCurve(path, {
        c1: {
          x: segment[1],
          y: segment[2],
        },
        c2: {
          x: segment[3],
          y: segment[4],
        },
        to: {
          x: segment[5],
          y: segment[6],
        },
      });
    }
  });
  return path;
};
interface SelectedCurve {
  from: Vector;
  curve: Curve;
}
interface NullableSelectedCurve {
  from: Vector;
  curve: Curve | null;
}
const curveIsFound = (c: NullableSelectedCurve): c is SelectedCurve => {
  "worklet";
  return c.curve !== null;
};
const solveCubic = (a: number, b: number, c: number, d: number) => {
  "worklet";
  if (Math.abs(a) < 1e-8) {
    // Quadratic case, ax^2+bx+c=0
    a = b;
    b = c;
    c = d;
    if (Math.abs(a) < 1e-8) {
      // Linear case, ax+b=0
      a = b;
      b = c;
      if (Math.abs(a) < 1e-8) {
        // Degenerate case
        return [];
      }
      return [-b / a];
    }

    const D = b * b - 4 * a * c;
    if (Math.abs(D) < 1e-8) {
      return [-b / (2 * a)];
    } else if (D > 0) {
      return [(-b + Math.sqrt(D)) / (2 * a), (-b - Math.sqrt(D)) / (2 * a)];
    }
    return [];
  }
  // https://stackoverflow.com/questions/27176423/function-to-solve-cubic-equation-analytically
  const cuberoot = (x: number) => {
    "worklet";
    const y = Math.pow(Math.abs(x), 1 / 3);
    return x < 0 ? -y : y;
  };

  // Convert to depressed cubic t^3+pt+q = 0 (subst x = t - b/3a)
  const p = (3 * a * c - b * b) / (3 * a * a);
  const q = (2 * b * b * b - 9 * a * b * c + 27 * a * a * d) / (27 * a * a * a);
  let roots;

  if (Math.abs(p) < 1e-8) {
    // p = 0 -> t^3 = -q -> t = -q^1/3
    roots = [cuberoot(-q)];
  } else if (Math.abs(q) < 1e-8) {
    // q = 0 -> t^3 + pt = 0 -> t(t^2+p)=0
    roots = [0].concat(p < 0 ? [Math.sqrt(-p), -Math.sqrt(-p)] : []);
  } else {
    const D = (q * q) / 4 + (p * p * p) / 27;
    if (Math.abs(D) < 1e-8) {
      // D = 0 -> two roots
      roots = [(-1.5 * q) / p, (3 * q) / p];
    } else if (D > 0) {
      // Only one real root
      const u = cuberoot(-q / 2 - Math.sqrt(D));
      roots = [u - p / (3 * u)];
    } else {
      // D < 0, three roots, but needs to use complex numbers/trigonometric solution
      const u = 2 * Math.sqrt(-p / 3);
      const t = Math.acos((3 * q) / p / u) / 3; // D < 0 implies p < 0 and acos argument in [-1..1]
      const k = (2 * Math.PI) / 3;
      roots = [u * Math.cos(t), u * Math.cos(t - k), u * Math.cos(t - 2 * k)];
    }
  }

  // Convert back from depressed cubic
  for (let i = 0; i < roots.length; i++) {
    roots[i] -= b / (3 * a);
  }

  return roots;
};
/**
 *  @summary Given a cubic Bèzier curve, return the y value for x.
 *  @example
    const x = 116;
    const from = vec.create(59, 218);
    const c1 = vec.create(131, 39);
    const c2 = vec.create(204, 223);
    const to = vec.create(227, 89);
    // y= 139
    const y = cubicBezierYForX(x, from, c1, c2, to)));
  */
export const cubicBezierYForX = (
  x: number,
  a: Vector,
  b: Vector,
  c: Vector,
  d: Vector,
  precision = 2
) => {
  "worklet";
  const pa = -a.x + 3 * b.x - 3 * c.x + d.x;
  const pb = 3 * a.x - 6 * b.x + 3 * c.x;
  const pc = -3 * a.x + 3 * b.x;
  const pd = a.x - x;
  // eslint-disable-next-line prefer-destructuring
  const t = solveCubic(pa, pb, pc, pd)
    .map((root) => round(root, precision))
    .filter((root) => root >= 0 && root <= 1)[0];
  return cubicBezier(t, a.y, b.y, c.y, d.y);
};
/**
 * @summary Return the curves at x. This function assumes that only one curve is available at x
 */
export const selectCurve = (path: Path, x: number): SelectedCurve => {
  "worklet";
  const result: NullableSelectedCurve = {
    from: path.move,
    curve: null,
  };
  for (let i = 0; i < path.curves.length; i++) {
    const c = path.curves[i];
    const contains =
      result.from.x > c.to.x
        ? x >= c.to.x && x <= result.from.x
        : x >= result.from.x && x <= c.to.x;
    if (contains) {
      result.curve = c;
      break;
    }
    result.from = c.to;
  }
  if (!curveIsFound(result)) {
    throw new Error(`No curve found at ${x}`);
  }
  return result;
};

export const getYForX = (path: Path, x: number, precision = 2) => {
  "worklet";
  const c = selectCurve(path, x);
  return cubicBezierYForX(
    x,
    c.from,
    c.curve.c1,
    c.curve.c2,
    c.curve.to,
    precision
  );
};
