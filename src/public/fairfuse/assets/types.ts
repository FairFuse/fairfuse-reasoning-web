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
};
