/**
 * Shared types for the TypeScript port of the FairFuse consensus backend.
 *
 * The request/response shapes mirror the JSON accepted and returned by the Flask
 * routes in `main.py`, so a caller can swap a `fetch()` for a direct function call.
 */

/** A permutation of the candidate ids `0..n-1`, best candidate first. */
export type Ranking = number[];

/**
 * `[candidateIds, ...groupLabelRows]`.
 *
 * Row 0 is the candidate ids. Each subsequent row holds one protected attribute's
 * group label per candidate, in the same column order as row 0. The Python only
 * ever reads rows 0 and 1, so a two-row array is the common case.
 */
export type GroupInfo = number[][];

export interface FairnessMetricsRequest {
  rankings: Ranking[];
  groups: GroupInfo;
}

export interface FairnessMetricsResponse {
  /** One Favoured Pair Representation score per group, per input ranking. */
  fpr: number[][];
  /** Attribute Rank Parity (max fpr - min fpr) per input ranking. */
  arp: number[];
}

export interface SimilarityMetricsRequest {
  rankings: Ranking[];
}

/** Symmetric `n x n` matrix of normalised Kendall tau distances, zero on the diagonal. */
export type SimilarityMetricsResponse = number[][];

export interface ConsensusRequest {
  rankings: Ranking[];
  groups: GroupInfo;
  arpThreshold: number;
}

export interface ConsensusResponse {
  /** The index of each input ranking, then the literal `'Consensus'`. */
  method: (number | 'Consensus')[];
  /** fpr per input ranking, then the consensus ranking's fpr. */
  fpr: number[][];
  /** arp per input ranking, then the consensus ranking's arp. */
  arp: number[];
  /** The fair consensus ranking. */
  ranking: Ranking;
}
