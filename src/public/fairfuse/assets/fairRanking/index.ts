/**
 * Browser-side replacement for the FairFuse consensus backend.
 *
 * Each function below mirrors one Flask route in `main.py`, taking the same JSON
 * body and returning the same JSON response, so a call site can drop its `fetch()`
 * and call directly:
 *
 * ```ts
 * import { consensus } from './fairRanking';
 *
 * const result = consensus({ rankings, groups, arpThreshold: 0.1 });
 * ```
 *
 * `GET /` (the health check) has no equivalent here.
 */

import {
  fpr,
  getFairCopeland,
  normalisedKendallTauDistance,
  rankParityScore,
  validateInput,
} from './utils';
import type {
  ConsensusRequest,
  ConsensusResponse,
  FairnessMetricsRequest,
  FairnessMetricsResponse,
  SimilarityMetricsRequest,
  SimilarityMetricsResponse,
} from './types';

/**
 * `POST /fairness-metrics` — Favoured Pair Representation and Attribute Rank Parity
 * for each input ranking. Python: `main.fairness_metrics`.
 *
 * Only the first protected attribute (`groups[1]`) is scored, matching the Python.
 */
export function fairnessMetrics({
  rankings,
  groups,
}: FairnessMetricsRequest): FairnessMetricsResponse {
  validateInput(rankings, groups);

  const fprScores: number[][] = [];
  const arp: number[] = [];

  for (const ranking of rankings) {
    const scores = fpr(ranking, groups[0], groups[1]);
    fprScores.push(scores);
    arp.push(rankParityScore(scores));
  }

  return { fpr: fprScores, arp };
}

/**
 * `POST /similarity-metrics` — the full pairwise matrix of normalised Kendall tau
 * distances between the input rankings. Python: `main.similarity_metrics`.
 *
 * Symmetric, with a zero diagonal.
 */
export function similarityMetrics({
  rankings,
}: SimilarityMetricsRequest): SimilarityMetricsResponse {
  validateInput(rankings);

  return rankings.map((a) => rankings.map((b) => normalisedKendallTauDistance(a, b)));
}

/**
 * `POST /consensus` — the fair consensus ranking, plus the fairness of every input
 * ranking and of the consensus itself. Python: `main.fairRanking`.
 */
export function consensus({
  rankings,
  groups,
  arpThreshold,
}: ConsensusRequest): ConsensusResponse {
  validateInput(rankings, groups);

  return getFairCopeland(rankings, groups, [arpThreshold]);
}

export type {
  ConsensusRequest,
  ConsensusResponse,
  FairnessMetricsRequest,
  FairnessMetricsResponse,
  GroupInfo,
  Ranking,
  SimilarityMetricsRequest,
  SimilarityMetricsResponse,
} from './types';

export {
  allPairPrecedence,
  argmaxFirst,
  argminFirst,
  argsortAsc,
  candidatesByGroup,
  copeland,
  correctParityPolicy,
  determineGroupFromItem,
  fairCopeland,
  findBottomCandidate,
  findCandidateLowest,
  fpr,
  getFairCopeland,
  getMaxMinPar,
  listOfAttributeDicts,
  makeIntersectionalAttribute,
  normalisedKendallTauDistance,
  pairCount,
  pairCountAtPositionArray,
  positionMap,
  rankParityScore,
  uniqueSorted,
  validateInput,
  zeros2d,
} from './utils';
