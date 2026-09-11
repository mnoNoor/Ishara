export interface Extremum {
  index: number;
  value: number;
  type: "peak" | "trough";
}

export function findExtrema(
  series: number[],
  minProminence: number,
): Extremum[] {
  if (series.length < 3) return [];

  const extrema: Extremum[] = [];
  let lastExtremumValue = series[0];
  let candidateIndex = 0;
  let direction: "up" | "down" | null = null;

  for (let i = 1; i < series.length; i++) {
    const delta = series[i] - series[i - 1];
    if (delta === 0) continue;

    const newDirection = delta > 0 ? "up" : "down";

    if (direction === null) {
      direction = newDirection;
      candidateIndex = i - 1;
      continue;
    }

    if (newDirection !== direction) {
      const candidateValue = series[candidateIndex];
      const prominence = Math.abs(candidateValue - lastExtremumValue);

      if (prominence >= minProminence) {
        extrema.push({
          index: candidateIndex,
          value: candidateValue,
          type: direction === "up" ? "peak" : "trough",
        });
        lastExtremumValue = candidateValue;
      }
      direction = newDirection;
    }

    candidateIndex = i;
  }

  return extrema;
}

export interface OscillationInfo {
  amplitude: number;
  extremaCount: number;
}

export function analyzeOscillation(
  series: number[],
  minProminence: number,
): OscillationInfo {
  if (series.length === 0) return { amplitude: 0, extremaCount: 0 };

  const extrema = findExtrema(series, minProminence);
  const amplitude = Math.max(...series) - Math.min(...series);

  return { amplitude, extremaCount: extrema.length };
}
