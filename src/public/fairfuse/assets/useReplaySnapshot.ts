import { useMemo } from 'react';
import type { ParticipantData } from '../../../storage/types';
import { useCurrentIdentifier } from '../../../routes/utils';
import { parseTrialOrder } from '../../../utils/parseTrialOrder';
import type { FairFuseSnapshot } from './types';

/** Key the ranking state is stored under inside a component's answer. */
export const SNAPSHOT_KEY = 'fairfuseSnapshot';

function trialOrderRank(trialOrder: string): number {
  const { step, funcIndex } = parseTrialOrder(trialOrder);
  return (step ?? 0) * 1000 + (funcIndex ?? 0);
}

function readSnapshot(answer: Record<string, unknown> | undefined): unknown {
  const value = answer?.[SNAPSHOT_KEY];
  return value && typeof value === 'object' ? value : null;
}

/**
 * The ranking state this component should open with.
 *
 * Resolution order matters. The component's *own* saved snapshot wins, so a participant who
 * navigates back and forward again keeps their work; only when there is none — the first
 * visit — does it inherit from the component named by `REPLAY_FROM`.
 *
 * The inherited lookup goes by component name rather than by the `${name}_${index}` answer
 * key, since that index is the flat sequence position and shifts under randomised or
 * conditional orders. Only submitted answers count (`endTime > -1`).
 *
 * Returns `null` when there is nothing to replay, so the component behaves like a fresh task.
 */
export function useReplaySnapshot(
  answers: ParticipantData['answers'],
  replayFrom: string | undefined,
  csvUrl: string,
): FairFuseSnapshot | null {
  const identifier = useCurrentIdentifier();

  // Serialising here keys the memo below on the snapshot's *contents*. A fresh object
  // identity each render would re-seed the view mid-session and undo live edits.
  const serialised = useMemo(() => {
    const own = readSnapshot(answers[identifier]?.answer);
    if (own) return JSON.stringify(own);

    if (!replayFrom) return null;

    const previous = Object.values(answers)
      .filter((a) => a.componentName === replayFrom && a.endTime > -1)
      .sort((a, b) => trialOrderRank(b.trialOrder) - trialOrderRank(a.trialOrder))[0];

    const inherited = readSnapshot(previous?.answer);
    if (!inherited) {
      console.warn(`[fairfuse] REPLAY_FROM "${replayFrom}" resolved to no snapshot; starting fresh`);
      return null;
    }
    return JSON.stringify(inherited);
  }, [answers, identifier, replayFrom]);

  return useMemo(() => {
    if (!serialised) return null;
    try {
      const snapshot = JSON.parse(serialised) as FairFuseSnapshot;
      // Candidate ids in a replayed ranking mean nothing against another dataset.
      if (snapshot.csvUrl !== csvUrl) {
        console.warn(`[fairfuse] ignoring snapshot from a different dataset (${snapshot.csvUrl})`);
        return null;
      }
      return snapshot;
    } catch {
      console.error('[fairfuse] could not parse replay snapshot');
      return null;
    }
  }, [serialised, csvUrl]);
}

/**
 * Highest `#FAIR_n` suffix among restored columns, so a newly generated consensus continues
 * the numbering instead of colliding with a replayed `#FAIR_1`.
 */
export function highestConsensusIndex(generatedRankings: { colName: string }[]): number {
  return generatedRankings.reduce(
    (max, gr) => Math.max(max, Number(/^#FAIR_(\d+)$/.exec(gr.colName)?.[1] ?? 0)),
    0,
  );
}
