/** Parameters supplied by the study config for the `fairfuseApp` component. */
export type FairFuseParameters = {
  /** Path to the ranking CSV, relative to the public folder (no leading slash). */
  CSV_URL: string;
  /**
   * Name of an earlier component whose ranking state this component should restore.
   * Omit for a normal task; set it on a reflection screen to replay what the
   * participant left behind on the named component.
   */
  REPLAY_FROM?: string;
};

export type Candidate = {
  id: number;
  name: string;
  region: string;
  rankings: Record<string, number>;
};

export type GeneratedRanking = { colName: string; rankById: Record<number, number>; pinned: boolean };

/**
 * Everything needed to put the ranking view back exactly as a participant left it.
 *
 * Written to the component's answer under the key `fairfuseSnapshot` and read back by a
 * later component via its `REPLAY_FROM` parameter. `similarityMatrix` and `colFairnessMap`
 * are deliberately absent — both are recomputed from `candidates` and `generatedRankings`
 * by effects in FairFuseApp, so storing them would only add bulk and risk staleness.
 */
export type FairFuseSnapshot = {
  /** Guards against restoring a ranking onto a different dataset. */
  csvUrl: string;
  generatedRankings: GeneratedRanking[];
  displayedCols: string[];
  compressed: boolean;
  arpThreshold: number;
  /**
   * Restored alongside `arpThreshold`: the effect that latches `maxArp` also overwrites
   * the threshold, so restoring one without the other loses the slider position.
   */
  maxArp: number | null;
  selectedId: number | null;
};

export type ColFairness = { arp: number; fpr: number[] };

export type ColBodyProps = {
  col: string;
  colW: number;
  compressed: boolean;
  rowH: number;
  candidates: Candidate[];
  hoveredId: number | null;
  hoveredCol: string | null;
  hoveredGroup: string | null;
  groupColors: Record<string, string>;
  onHover: (id: number | null, col: string | null) => void;
  onReorder?: (colName: string, newOrderedIds: number[]) => void;
  highlighted?: boolean;
  selectedId: number | null;
  onSelect: (id: number) => void;
};

export interface ProvenanceStateModel {
  searchQuery: string;
  hoveredGroup: string | null;
  hoveredGroupRankingView: string | null;
  hoveredId: number | null;
  hoveredCol: string | null;
  arpThreshold: number;
  generatedRankings: GeneratedRanking[];
  similarityMatrix: number[][] | null;
  colFairnessMap: Record<string, ColFairness>;
  displayedCols: string[];
  hoveredHeatmapCols: [string, string] | null;
  compressed: boolean;
}
