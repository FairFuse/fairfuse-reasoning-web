export type Candidate = {
  id: number;
  name: string;
  region: string;
  rankings: Record<string, number>;
};

export type GeneratedRanking = { colName: string; rankById: Record<number, number>; pinned: boolean };

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
