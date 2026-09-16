/**
 * TypeScript port of the MANI-Rank helpers reachable from the FairFuse backend's
 * three HTTP endpoints.
 *
 * Original Python: `app/mani_rank/multi_fair/{utils,metrics,copeland,fair_copeland,
 * correct_parity_policy}.py` and `app/consensus/fair_copeland.py`, itself referenced
 * from https://github.com/KCachel/MANI-Rank.
 *
 * Every function here is pure and dependency-free. Each carries a pointer back to the
 * Python source it replaces.
 */

import type { GroupInfo, Ranking } from './types';

// ---------------------------------------------------------------------------
// numpy shims
// ---------------------------------------------------------------------------

/** `np.unique` over a 1-D array: the distinct values, ascending. */
export function uniqueSorted(values: number[]): number[] {
  return [...new Set(values)].sort((a, b) => a - b);
}

/**
 * `np.argsort`: the indices that would sort `values` ascending.
 *
 * The inputs here are permutations, so there are no ties and the choice of sort
 * algorithm cannot change the result.
 */
export function argsortAsc(values: number[]): number[] {
  return values
    .map((value, index) => ({ value, index }))
    .sort((a, b) => a.value - b.value)
    .map(({ index }) => index);
}

/** `np.argmax`: the index of the *first* maximum, matching numpy's tie behaviour. */
export function argmaxFirst(values: number[]): number {
  let best = 0;
  for (let i = 1; i < values.length; i++) {
    if (values[i] > values[best]) best = i;
  }
  return best;
}

/** `np.argmin`: the index of the *first* minimum. */
export function argminFirst(values: number[]): number {
  let best = 0;
  for (let i = 1; i < values.length; i++) {
    if (values[i] < values[best]) best = i;
  }
  return best;
}

/** `np.zeros((rows, cols))`. */
export function zeros2d(rows: number, cols: number): number[][] {
  return Array.from({ length: rows }, () => new Array<number>(cols).fill(0));
}

/**
 * `position[candidate] = index of candidate in ranking`.
 *
 * The Python repeatedly calls `list.index(...)` / `np.argwhere(...)` inside inner
 * loops; precomputing this map gives identical results at lower complexity.
 */
export function positionMap(ranking: readonly number[]): number[] {
  const positions = new Array<number>(ranking.length).fill(-1);
  for (let i = 0; i < ranking.length; i++) positions[ranking[i]] = i;
  return positions;
}

// ---------------------------------------------------------------------------
// utils.py
// ---------------------------------------------------------------------------

/** Number of unordered pairs among `n` candidates. Python: `utils.pair_count`. */
export function pairCount(n: number): number {
  return (n * (n - 1)) / 2;
}

/**
 * For each position in a ranking of `n` candidates, how many candidates it is
 * favoured over: `[n-1, n-2, ..., 0]`. Python: `utils.pair_count_at_position_array`.
 */
export function pairCountAtPositionArray(n: number): number[] {
  return Array.from({ length: n }, (_, i) => n - 1 - i);
}

/**
 * Group label -> the candidate ids carrying it, keyed in ascending label order.
 * Python: `utils.candidates_by_group`.
 */
export function candidatesByGroup(
  candidates: readonly number[],
  grpMem: readonly number[],
): Map<number, number[]> {
  const byGroup = new Map<number, number[]>();
  for (const label of uniqueSorted([...grpMem])) byGroup.set(label, []);
  for (let i = 0; i < candidates.length; i++) {
    byGroup.get(grpMem[i])!.push(candidates[i]);
  }
  return byGroup;
}

/**
 * Precedence matrix: `Q[i][j]` is the number of voters who prefer `j` over `i`.
 * Python: `utils.all_pair_precedence`.
 *
 * The Python walks every ordered pair `(i, j)` including `i === j`, writing each
 * symmetric entry twice with the same value; one pass over `i < j` is equivalent.
 */
export function allPairPrecedence(ranks: readonly Ranking[]): number[][] {
  const nVoters = ranks.length;
  const nCandidates = ranks[0].length;
  const edgeWeights = zeros2d(nCandidates, nCandidates);
  const positions = ranks.map((rank) => positionMap(rank));

  for (let i = 0; i < nCandidates; i++) {
    for (let j = i + 1; j < nCandidates; j++) {
      let hij = 0; // voters ranking i below j, i.e. preferring j to i
      let hji = 0;
      for (let r = 0; r < nVoters; r++) {
        if (positions[r][i] > positions[r][j]) hij++;
        else hji++;
      }
      edgeWeights[i][j] = hij;
      edgeWeights[j][i] = hji;
    }
  }
  return edgeWeights;
}

/**
 * Normalised Kendall tau distance between two rankings, in `[0, 1]`.
 * Python: `utils.normalised_kendall_tau_distance`.
 *
 * The count covers ordered pairs, hence the `n * (n - 1)` denominator.
 */
export function normalisedKendallTauDistance(
  values1: readonly number[],
  values2: readonly number[],
): number {
  const n = values1.length;
  if (values2.length !== n) throw new Error('Both lists have to be of equal length');

  const a = argsortAsc([...values1]);
  const b = argsortAsc([...values2]);

  let ndisordered = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if ((a[i] < a[j] && b[i] > b[j]) || (a[i] > a[j] && b[i] < b[j])) ndisordered++;
    }
  }
  return ndisordered / (n * (n - 1));
}

/**
 * Collapse every protected attribute into a single intersectional attribute:
 * each candidate is relabelled by the index of its distinct combination of group
 * labels. Python: `utils.make_intersectional_attribute`.
 *
 * Row 0 of `groupInfo` (the candidate ids) is dropped, matching `groups[1:,]`.
 * Combinations are ordered the way `np.unique(..., axis=1)` orders columns:
 * lexicographically, with row 0 of the *remaining* rows most significant.
 */
export function makeIntersectionalAttribute(groupInfo: GroupInfo): number[] {
  const attributeRows = groupInfo.slice(1);
  const numCandidates = attributeRows[0].length;

  const columnOf = (c: number): number[] => attributeRows.map((row) => row[c]);

  const seen = new Map<string, number[]>();
  for (let c = 0; c < numCandidates; c++) {
    const column = columnOf(c);
    seen.set(column.join(','), column);
  }

  const combos = [...seen.values()].sort((x, y) => {
    for (let k = 0; k < x.length; k++) {
      if (x[k] !== y[k]) return x[k] - y[k];
    }
    return 0;
  });

  const comboIndex = new Map<string, number>();
  combos.forEach((combo, index) => comboIndex.set(combo.join(','), index));

  return Array.from({ length: numCandidates }, (_, c) =>
    comboIndex.get(columnOf(c).join(','))!,
  );
}

// ---------------------------------------------------------------------------
// metrics.py
// ---------------------------------------------------------------------------

/**
 * Favoured Pair Representation of each group under `ranking`, indexed by group id.
 * Python: `metrics.fpr`.
 *
 * `candidates` and `grpMem` are rows 0 and `k` of a `GroupInfo`. Group labels must
 * be `0..numGroups-1` — the Python indexes its group dictionary positionally here
 * and by raw label elsewhere, so the two only agree when labels are contiguous.
 * See `validateGroupInfo`.
 */
export function fpr(ranking: readonly number[], candidates: readonly number[], grpMem: readonly number[]): number[] {
  const labels = uniqueSorted([...grpMem]);
  const groupsOfCandidates = candidatesByGroup(candidates, grpMem);
  const positions = positionMap(ranking);
  const pairCnt = pairCountAtPositionArray(ranking.length);

  const scores: number[] = [];
  for (const label of labels) {
    const cands = groupsOfCandidates.get(label)!;
    const grpSz = cands.length;

    let totalFavored = 0;
    for (const x of cands) totalFavored += pairCnt[positions[x]];

    const favoredOverOtherGrp = totalFavored - pairCount(grpSz);
    const totalMixedWithGroup = grpSz * (ranking.length - grpSz);
    scores.push(favoredOverOtherGrp / totalMixedWithGroup);
  }
  return scores;
}

/** Attribute (or intersectional) Rank Parity: `max(fpr) - min(fpr)`. Python: `metrics.rank_parity_score`. */
export function rankParityScore(fprScores: readonly number[]): number {
  return Math.max(...fprScores) - Math.min(...fprScores);
}

// ---------------------------------------------------------------------------
// copeland.py / fair_copeland.py
// ---------------------------------------------------------------------------

/**
 * Copeland rank aggregation: score each candidate by the number of pairwise
 * match-ups it does not lose, then sort. Python: `copeland.copeland` and the first
 * half of `fair_copeland.fair_copeland`.
 *
 * The Python sorts `(score, candidate)` tuples with `reverse=True`, so ties on
 * score break by *descending candidate id*. That tie-break is load-bearing: it
 * decides the consensus ranking whenever two candidates win equally often.
 */
export function copeland(ranks: readonly Ranking[], candidateList?: readonly number[]): Ranking {
  const items = uniqueSorted([...ranks[0]]);
  const candidates = candidateList ?? items;
  const qmat = allPairPrecedence(ranks);

  const scores = new Map<number, number>();
  for (const item of items) scores.set(item, 0);

  for (const item of candidates) {
    for (const comparisonItem of candidates) {
      if (item === comparisonItem) continue;
      const numItemWins = qmat[comparisonItem][item];
      const numComparisonItemWins = qmat[item][comparisonItem];
      if (numItemWins >= numComparisonItemWins) {
        scores.set(item, scores.get(item)! + 1);
      }
    }
  }

  return [...scores.entries()]
    .sort(([candA, scoreA], [candB, scoreB]) => scoreB - scoreA || candB - candA)
    .map(([cand]) => cand);
}

/**
 * Fair-Copeland: aggregate with Copeland, then swap candidates until the ranking
 * meets the parity thresholds. Python: `fair_copeland.fair_copeland`.
 *
 * @param groupInfo Row 0 candidate ids, then one row per protected attribute, with
 *   the intersectional attribute already appended as the final row.
 * @param pthres Per-attribute ARP thresholds (a single-element list applies to all).
 * @param ithres Intersectional rank parity threshold.
 */
export function fairCopeland(
  ranks: readonly Ranking[],
  groupInfo: GroupInfo,
  pthres: readonly number[],
  ithres: number,
): Ranking {
  const copelandRanking = copeland(ranks, groupInfo[0]);
  return correctParityPolicy(copelandRanking, groupInfo, pthres, ithres);
}

// ---------------------------------------------------------------------------
// correct_parity_policy.py
// ---------------------------------------------------------------------------

/** Candidate id -> its group label for one attribute. Python: `determine_group_from_item`. */
export function determineGroupFromItem(
  candidates: readonly number[],
  grpMem: readonly number[],
): Map<number, number> {
  const byItem = new Map<number, number>();
  for (let i = 0; i < candidates.length; i++) byItem.set(candidates[i], grpMem[i]);
  return byItem;
}

/** One `determineGroupFromItem` map per protected attribute. Python: `list_of_attribute_dicts`. */
export function listOfAttributeDicts(groupInfo: GroupInfo): Map<number, number>[] {
  return groupInfo.slice(1).map((row) => determineGroupFromItem(groupInfo[0], row));
}

interface MaxMinParity {
  maxParity: number[];
  minParity: number[];
  maxParityGroupId: number[];
  minParityGroupId: number[];
}

/**
 * Per attribute, the highest and lowest group fpr and which group holds each.
 * Python: `correct_parity_policy.get_max_min_par`.
 *
 * The group ids come back as positional indices into the fpr list, and are compared
 * against raw group labels by the caller — see the note on `fpr`.
 */
export function getMaxMinPar(ranking: readonly number[], groupInfo: GroupInfo): MaxMinParity {
  const result: MaxMinParity = {
    maxParity: [],
    minParity: [],
    maxParityGroupId: [],
    minParityGroupId: [],
  };

  for (let atr = 0; atr < groupInfo.length - 1; atr++) {
    const fprs = fpr(ranking, groupInfo[0], groupInfo[atr + 1]);
    result.maxParity.push(Math.max(...fprs));
    result.minParity.push(Math.min(...fprs));
    result.maxParityGroupId.push(argmaxFirst(fprs));
    result.minParityGroupId.push(argminFirst(fprs));
  }
  return result;
}

/** The lowest-ranked candidate belonging to `group`. Python: `find_candidate_lowest`. */
export function findCandidateLowest(
  ranking: readonly number[],
  group: number,
  groupLegend: Map<number, number>,
): number | undefined {
  for (let i = ranking.length - 1; i >= 0; i--) {
    if (groupLegend.get(ranking[i]) === group) return ranking[i];
  }
  return undefined;
}

interface SwapPair {
  top: number;
  indexTop: number;
  bottom: number;
  indexBottom: number;
}

/**
 * Find a candidate of the under-represented group ranked below `indexTop`, so the
 * two can be swapped. Python: `correct_parity_policy.find_bottom_candidate`.
 *
 * If nothing below `indexTop` qualifies, the Python recurses on a new top drawn
 * from the prefix above it; that recursion is a loop here. The prefix shrinks every
 * round, so the loop terminates.
 */
export function findBottomCandidate(
  ranking: readonly number[],
  indexTop: number,
  groupLegend: Map<number, number>,
  minParityGroupId: number,
): SwapPair {
  let idxTop = indexTop;

  for (;;) {
    const top = ranking[idxTop];

    for (let i = idxTop + 1; i < ranking.length; i++) {
      const bottom = ranking[i];
      if (groupLegend.get(bottom) === minParityGroupId) {
        return { top, indexTop: idxTop, bottom, indexBottom: i };
      }
    }

    // Nothing below the current top qualifies; retry from a higher member of the
    // top's own group.
    const newTop = findCandidateLowest(ranking.slice(0, idxTop), groupLegend.get(top)!, groupLegend);
    if (newTop === undefined) {
      throw new Error(
        `No candidate of group ${minParityGroupId} can be promoted: the ranking cannot be ` +
          'made fairer by swapping. Try increasing the allowable difference in parity.',
      );
    }
    idxTop = ranking.indexOf(newTop);
  }
}

/** True when every attribute's parity spread is within its threshold. */
function withinThresholds(diffs: readonly number[], thresholds: readonly number[]): boolean {
  // numpy broadcasts a length-1 threshold array across every attribute.
  if (thresholds.length === 1) return diffs.every((d) => d <= thresholds[0]);
  if (thresholds.length !== diffs.length) {
    throw new Error(
      `Cannot broadcast ${thresholds.length} thresholds against ${diffs.length} attributes`,
    );
  }
  return diffs.every((d, i) => d <= thresholds[i]);
}

/**
 * Swap candidates until every attribute meets its rank-parity threshold.
 * Python: the `atr_correct === 'both'` branch of `correct_parity_policy`
 * (`correct_parity_policy.py:129-170`), with `inter_given = True`.
 *
 * The other two branches of the Python (`pa_only`, `inter_only`) are unreachable
 * from the HTTP endpoints and are not ported.
 *
 * `groupInfo` must already carry the intersectional attribute as its last row; that
 * row is checked against `ithres` while the rest are checked against `pthres`.
 *
 * Gives up and returns the best ranking so far once it has made more swaps than
 * there are candidate pairs — the same guard the Python uses to avoid looping
 * forever on thresholds that cannot be met.
 */
export function correctParityPolicy(
  ranking: readonly number[],
  groupInfo: GroupInfo,
  pthres: readonly number[],
  ithres: number,
): Ranking {
  const attributeLegend = listOfAttributeDicts(groupInfo);
  const corrected = [...ranking];
  const maxSwaps = pairCount(ranking.length);

  let parity = getMaxMinPar(corrected, groupInfo);
  let swapNum = 0;

  const spread = (): number[] => parity.maxParity.map((max, i) => max - parity.minParity[i]);

  const isFair = (): boolean => {
    const diffs = spread();
    return (
      withinThresholds(diffs.slice(0, -1), pthres) && diffs[diffs.length - 1] <= ithres
    );
  };

  while (!isFair()) {
    if (swapNum > maxSwaps) return corrected; // threshold unreachable; best effort

    const attributeToCorrect = argmaxFirst(spread());
    const legend = attributeLegend[attributeToCorrect];

    const topCandidate = findCandidateLowest(
      corrected,
      parity.maxParityGroupId[attributeToCorrect],
      legend,
    );
    if (topCandidate === undefined) {
      throw new Error(
        `No candidate found in the over-represented group ${parity.maxParityGroupId[attributeToCorrect]}`,
      );
    }

    const { top, indexTop, bottom, indexBottom } = findBottomCandidate(
      corrected,
      corrected.indexOf(topCandidate),
      legend,
      parity.minParityGroupId[attributeToCorrect],
    );

    corrected[indexTop] = bottom;
    corrected[indexBottom] = top;
    swapNum++;

    parity = getMaxMinPar(corrected, groupInfo);
  }

  return corrected;
}

// ---------------------------------------------------------------------------
// consensus/fair_copeland.py
// ---------------------------------------------------------------------------

/**
 * Build the fair consensus ranking and report the fairness of every input ranking
 * alongside it. Python: `app/consensus/fair_copeland.get_fair_copeland`.
 */
export function getFairCopeland(
  baseRankings: readonly Ranking[],
  groups: GroupInfo,
  arpThreshold: readonly number[] = [0.1],
): {
  method: (number | 'Consensus')[];
  fpr: number[][];
  arp: number[];
  ranking: Ranking;
} {
  const intersectional = makeIntersectionalAttribute(groups);
  const groupsWithInter: GroupInfo = [...groups, intersectional];
  const ithres = 1;

  const fprScores: number[][] = [];
  const arpScores: number[] = [];
  const method: (number | 'Consensus')[] = [];

  // Only the first protected attribute is reported, matching the Python.
  for (let r = 0; r < baseRankings.length; r++) {
    const scores = fpr(baseRankings[r], groups[0], groups[1]);
    fprScores.push(scores);
    arpScores.push(rankParityScore(scores));
    method.push(r);
  }

  const ranking = fairCopeland(baseRankings, groupsWithInter, arpThreshold, ithres);

  const consensusFpr = fpr(ranking, groups[0], groups[1]);
  fprScores.push(consensusFpr);
  arpScores.push(rankParityScore(consensusFpr));
  method.push('Consensus');

  return { method, fpr: fprScores, arp: arpScores, ranking };
}

// ---------------------------------------------------------------------------
// input validation
// ---------------------------------------------------------------------------

/**
 * Reject inputs the algorithms cannot handle.
 *
 * The Python uses candidate ids as matrix indices and group ids as both labels and
 * positional indices, so it silently produces wrong answers (or raises a `KeyError`
 * deep in a loop) when these do not hold. Failing here keeps the errors legible.
 */
export function validateInput(rankings: readonly Ranking[], groups?: GroupInfo): void {
  if (rankings.length === 0) throw new Error('rankings must not be empty');

  const n = rankings[0].length;
  if (n < 2) throw new Error(`Need at least 2 candidates, got ${n}`);

  rankings.forEach((ranking, r) => {
    if (ranking.length !== n) {
      throw new Error(`rankings[${r}] has length ${ranking.length}, expected ${n}`);
    }
    const seen = new Set(ranking);
    if (seen.size !== n || ranking.some((c) => !Number.isInteger(c) || c < 0 || c >= n)) {
      throw new Error(`rankings[${r}] must be a permutation of 0..${n - 1}`);
    }
  });

  if (!groups) return;

  if (groups.length < 2) {
    throw new Error('groups must hold candidate ids plus at least one attribute row');
  }
  groups.forEach((row, i) => {
    if (row.length !== n) {
      throw new Error(`groups[${i}] has length ${row.length}, expected ${n}`);
    }
  });

  const candidates = groups[0];
  if (new Set(candidates).size !== n || candidates.some((c) => !Number.isInteger(c) || c < 0 || c >= n)) {
    throw new Error(`groups[0] (candidate ids) must be a permutation of 0..${n - 1}`);
  }

  for (let atr = 1; atr < groups.length; atr++) {
    const labels = uniqueSorted(groups[atr]);
    if (labels.some((label, i) => label !== i)) {
      throw new Error(
        `groups[${atr}] labels must be contiguous integers starting at 0, got ${labels.join(', ')}`,
      );
    }
    // With a single group the fpr denominator `grpSz * (n - grpSz)` is zero. The
    // Python raises a ZeroDivisionError here; JavaScript would quietly yield NaN.
    if (labels.length < 2) {
      throw new Error(
        `groups[${atr}] puts every candidate in one group, so fairness is undefined`,
      );
    }
  }
}
