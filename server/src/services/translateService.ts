import NodeCache from "node-cache";
import { db } from "../db/db";
import { signVariants, words } from "../db/schema";
import { eq } from "drizzle-orm";

type Landmark = { x: number; y: number; z?: number };
type Frame = Landmark[][];
type Sequence = Frame[];

const cache = new NodeCache({ stdTTL: 3600 });

const LANDMARK_COUNT = 21;
const COORDS_PER_POINT = 3;
const MAX_HANDS = 2;
const HAND_VECTOR_SIZE = LANDMARK_COUNT * COORDS_PER_POINT;
const FRAME_VECTOR_SIZE = HAND_VECTOR_SIZE * MAX_HANDS;

const DEFAULT_K = 5;

// transform hand landmarks into a normalized vector
function normalizeHand(hand: Landmark[] | undefined): number[] {
  if (!hand || hand.length !== LANDMARK_COUNT) {
    return new Array(HAND_VECTOR_SIZE).fill(0);
  }

  const wrist = hand[0];
  const middleMcp = hand[9];

  const scale = Math.max(
    Math.sqrt(
      (middleMcp.x - wrist.x) ** 2 +
        (middleMcp.y - wrist.y) ** 2 +
        ((middleMcp.z ?? 0) - (wrist.z ?? 0)) ** 2,
    ),
    1e-6, // avoid division by zero
  );

  const vector: number[] = [];
  for (const point of hand) {
    vector.push(
      (point.x - wrist.x) / scale,
      (point.y - wrist.y) / scale,
      ((point.z ?? 0) - (wrist.z ?? 0)) / scale,
    );
  }
  return vector;
}

// transform a single frame into a fixed-length vector (126 values for 2 hands)
export function frameToVector(frame: Frame): number[] {
  if (!frame || frame.length === 0) {
    return new Array(FRAME_VECTOR_SIZE).fill(0);
  }

  const vector: number[] = [];
  for (let i = 0; i < MAX_HANDS; i++) {
    vector.push(...normalizeHand(frame[i]));
  }
  return vector;
}

// transform the entire sequence of frames into a 2D array of vectors
export function sequenceToVectors(sequence: Sequence): number[][] {
  return sequence.map((frame) => frameToVector(frame));
}

// compute Euclidean distance between two vectors
export function euclideanDistance(v1: number[], v2: number[]): number {
  if (v1.length !== v2.length) {
    throw new Error(
      "Vectors must be of the same length for Euclidean distance calculation",
    );
  }
  let sum = 0;
  for (let i = 0; i < v1.length; i++) {
    sum += (v1[i] - v2[i]) ** 2;
  }
  return Math.sqrt(sum);
}

// Dynamic Time Warping (DTW)
export function dtwDistance(
  seq1: number[][],
  seq2: number[][],
  bandRatio = 0.2,
): number {
  const n = seq1.length;
  const m = seq2.length;
  if (n === 0 || m === 0) return Infinity;

  const band = Math.max(
    Math.abs(n - m) + 1,
    Math.floor(Math.max(n, m) * bandRatio),
  );

  const dp: number[][] = Array(n + 1)
    .fill(null)
    .map(() => Array(m + 1).fill(Infinity));
  dp[0][0] = 0;

  for (let i = 1; i <= n; i++) {
    const jStart = Math.max(1, i - band);
    const jEnd = Math.min(m, i + band);
    for (let j = jStart; j <= jEnd; j++) {
      const cost = euclideanDistance(seq1[i - 1], seq2[j - 1]);
      dp[i][j] = cost + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }

  // count the number of steps in the optimal path for normalization
  let i = n;
  let j = m;
  let steps = 0;

  while (i > 0 || j > 0) {
    steps++;
    if (i === 0) {
      j--;
    } else if (j === 0) {
      i--;
    } else {
      const diag = dp[i - 1][j - 1];
      const up = dp[i - 1][j];
      const left = dp[i][j - 1];
      const minVal = Math.min(diag, up, left);
      if (minVal === diag) {
        i--;
        j--;
      } else if (minVal === up) {
        i--;
      } else {
        j--;
      }
    }
  }

  // normalize the DTW distance by the number of steps to get an average distance
  return dp[n][m] / Math.max(steps, 1);
}

// fetch all sign variants for a given dialect, convert their landmarks to vectors, and cache the result
export async function getVariantVectorsForDialect(dialect: string) {
  const cacheKey = `variants_${dialect}`;
  const cached = cache.get(cacheKey);

  if (cached) {
    return cached as {
      id: number;
      word: string;
      arabicText: string;
      vectors: number[][];
    }[];
  }

  const variants = await db
    .select({
      id: signVariants.id,
      landmarksJson: signVariants.landmarksJson,
      word: words.word,
      arabicText: words.arabicText,
    })
    .from(signVariants)
    .innerJoin(words, eq(signVariants.signId, words.id))
    .where(eq(signVariants.dialect, dialect));

  const result = variants.flatMap((v) => {
    const samples = v.landmarksJson as Sequence[];
    return samples.map((sequence) => ({
      id: v.id,
      word: v.word,
      arabicText: v.arabicText,
      vectors: sequenceToVectors(sequence),
    }));
  });

  if (result.length > 0) {
    cache.set(cacheKey, result);
  }

  return result;
}

type Neighbor = {
  word: string;
  arabicText: string;
  distance: number;
};

// find the k nearest variants (by DTW distance) to the input sequence
async function findKNearestNeighbors(
  inputVectors: number[][],
  dialect: string,
  k: number,
): Promise<Neighbor[]> {
  const variants = await getVariantVectorsForDialect(dialect);

  const distances: Neighbor[] = [];

  for (const variant of variants) {
    if (variant.vectors.length < 3) {
      console.log(`  ⏭️ "${variant.word}" skipped (less than 3 frames)`);
      continue;
    }

    const distance = dtwDistance(inputVectors, variant.vectors);
    console.log(`  - "${variant.word}": distance = ${distance.toFixed(4)}`);

    distances.push({
      word: variant.word,
      arabicText: variant.arabicText,
      distance,
    });
  }

  // sort ascending by distance and keep only the k closest neighbors
  distances.sort((a, b) => a.distance - b.distance);
  const neighbors = distances.slice(0, Math.min(k, distances.length));

  console.log(`🔍 Nearest ${neighbors.length} neighbors (K=${k}):`);
  neighbors.forEach((n, idx) =>
    console.log(
      `   ${idx + 1}. "${n.word}" - distance: ${n.distance.toFixed(4)}`,
    ),
  );

  return neighbors;
}

// find the best matching sign for a given input sequence using a KNN classifier:
// gathers the k closest variants by DTW distance, then lets them vote
// (weighted by inverse distance, so closer neighbors count more) on the winning word
export async function findBestMatch(
  inputSequence: Sequence,
  dialect: string,
  k: number = DEFAULT_K,
): Promise<{
  word: string;
  arabicText: string;
  confidence: number;
  distance: number;
} | null> {
  const inputVectors = sequenceToVectors(inputSequence);

  console.log(`📏 Number of input frames: ${inputVectors.length}`);

  if (inputVectors.length === 0) {
    console.log("⚠️ No input frames found");
    return null;
  }

  const neighbors = await findKNearestNeighbors(inputVectors, dialect, k);

  if (neighbors.length === 0) {
    console.log("⚠️ No valid signs to compare for this dialect");
    return null;
  }

  // weighted vote: each neighbor votes for its word, weighted by inverse distance
  // (epsilon avoids division by zero for a near-perfect match)
  const epsilon = 1e-6;

  const votes = new Map<
    string,
    { word: string; arabicText: string; weight: number; distances: number[] }
  >();

  for (const neighbor of neighbors) {
    const weight = 1 / (neighbor.distance + epsilon);
    const existing = votes.get(neighbor.arabicText);
    if (existing) {
      existing.weight += weight;
      existing.distances.push(neighbor.distance);
    } else {
      votes.set(neighbor.arabicText, {
        word: neighbor.word,
        arabicText: neighbor.arabicText,
        weight,
        distances: [neighbor.distance],
      });
    }
  }

  // pick the word with the highest total weighted vote
  let bestEntry: {
    word: string;
    arabicText: string;
    weight: number;
    distances: number[];
  } | null = null;
  let totalWeight = 0;

  for (const entry of votes.values()) {
    totalWeight += entry.weight;
    if (!bestEntry || entry.weight > bestEntry.weight) {
      bestEntry = entry;
    }
  }

  if (!bestEntry) {
    console.log("⚠️ No valid candidate found for comparison");
    return null;
  }

  // confidence blends how strongly the neighbors agreed (vote share) with how
  // close the winning neighbors actually were (distance score)
  const voteShare = bestEntry.weight / totalWeight;
  const avgDistance =
    bestEntry.distances.reduce((sum, d) => sum + d, 0) /
    bestEntry.distances.length;
  const distanceScore = Math.exp(-avgDistance / 1);
  const confidence = Math.min(1, Math.max(0, voteShare * distanceScore));

  console.log(
    `✅ Best match (KNN, K=${neighbors.length}): "${bestEntry.word}" (${bestEntry.arabicText}) - avg distance: ${avgDistance.toFixed(
      4,
    )} - vote share: ${(voteShare * 100).toFixed(1)}%`,
  );

  return {
    word: bestEntry.word,
    arabicText: bestEntry.arabicText,
    confidence: Math.round(confidence * 100),
    distance: avgDistance,
  };
}

export function clearTranslationCache(dialect?: string) {
  if (dialect) {
    cache.del(`variants_${dialect}`);
    console.log(`🗑️ Cleared cache for dialect: ${dialect}`);
  } else {
    cache.flushAll();
    console.log("🗑️ Cleared all cache");
  }
}
