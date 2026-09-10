import {
  createContext, useContext, useEffect, useMemo, useState,
} from 'react';
import { TrrackedProvenance } from '../../../store/types';
import useProvenance from './useProvenance';
import type { ColFairness, GeneratedRanking, ProvenanceStateModel } from './types';

interface SharedState {
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  hoveredGroup: string | null;
  setHoveredGroup: React.Dispatch<React.SetStateAction<string | null>>
  hoveredGroupRankingView: string | null;
  setHoveredGroupRankingView: React.Dispatch<React.SetStateAction<string | null>>
  hoveredId: number | null;
  setHoveredId: React.Dispatch<React.SetStateAction<number | null>>;
  hoveredCol: string | null;
  setHoveredCol: React.Dispatch<React.SetStateAction<string | null>>;
  arpThreshold: number;
  setArpThreshold: React.Dispatch<React.SetStateAction<number>>;
  generatedRankings: GeneratedRanking[];
  setGeneratedRankings: React.Dispatch<React.SetStateAction<GeneratedRanking[]>>;
  similarityMatrix: number[][] | null;
  setSimilarityMatrix: React.Dispatch<React.SetStateAction<number[][] | null>>;
  colFairnessMap: Record<string, ColFairness>;
  setColFairnessMap: React.Dispatch<React.SetStateAction<Record<string, ColFairness>>>;
}

const SharedStateContext = createContext<SharedState | null>(null);

export function useSharedState() {
  const ctx = useContext(SharedStateContext);
  if (!ctx) throw new Error('useSharedState must be used within SharedStateProvider');
  return ctx;
}

export function SharedStateProvider({ provenanceState, setProvenance, children }: { provenanceState?: ProvenanceStateModel, setProvenance: (provenanceGraph: TrrackedProvenance) => void, children: React.ReactNode }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);
  const [hoveredGroupRankingView, setHoveredGroupRankingView] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [hoveredCol, setHoveredCol] = useState<string | null>(null);
  const [arpThreshold, setArpThreshold] = useState<number>(0.5);
  const [generatedRankings, setGeneratedRankings] = useState<GeneratedRanking[]>([]);
  const [similarityMatrix, setSimilarityMatrix] = useState<number[][] | null>(null);
  const [colFairnessMap, setColFairnessMap] = useState<Record<string, ColFairness>>({});

  const provenance = useProvenance();

  useEffect(() => {
    if (provenanceState) {
      setSearchQuery(provenanceState.searchQuery ?? '');
      setHoveredGroup(provenanceState.hoveredGroup ?? null);
      setHoveredGroupRankingView(provenanceState.hoveredGroupRankingView ?? null);
      setHoveredId(provenanceState.hoveredId ?? null);
      setHoveredCol(provenanceState.hoveredCol ?? null);
      setArpThreshold(provenanceState.arpThreshold ?? 0.5);
      setGeneratedRankings(provenanceState.generatedRankings ?? []);
      setSimilarityMatrix(provenanceState.similarityMatrix ?? null);
      setColFairnessMap(provenanceState.colFairnessMap ?? {});
    }
  }, [provenanceState]);

  useEffect(() => {
    provenance.trrack.apply('SearchText', provenance.actions.trrackSearchQuery(searchQuery));
    setProvenance(provenance.trrack.graph.backend);
  }, [searchQuery, provenance, setProvenance]);

  useEffect(() => {
    provenance.trrack.apply('HoveredGroup', provenance.actions.trrackHoveredGroup(hoveredGroup));
    setProvenance(provenance.trrack.graph.backend);
  }, [hoveredGroup, provenance, setProvenance]);

  useEffect(() => {
    provenance.trrack.apply('HoveredGroupRankingView', provenance.actions.trrackHoveredGroupRankingView(hoveredGroupRankingView));
    setProvenance(provenance.trrack.graph.backend);
  }, [hoveredGroupRankingView, provenance, setProvenance]);

  useEffect(() => {
    provenance.trrack.apply('HoveredId', provenance.actions.trrackHoveredId(hoveredId));
    setProvenance(provenance.trrack.graph.backend);
  }, [hoveredId, provenance, setProvenance]);

  useEffect(() => {
    provenance.trrack.apply('HoveredCol', provenance.actions.trrackHoveredCol(hoveredCol));
    setProvenance(provenance.trrack.graph.backend);
  }, [hoveredCol, provenance, setProvenance]);

  useEffect(() => {
    provenance.trrack.apply('ArpThreshold', provenance.actions.trrackArpThreshold(arpThreshold));
    setProvenance(provenance.trrack.graph.backend);
  }, [arpThreshold, provenance, setProvenance]);

  useEffect(() => {
    provenance.trrack.apply('GeneratedRankings', provenance.actions.trrackGeneratedRankings(generatedRankings));
    setProvenance(provenance.trrack.graph.backend);
  }, [generatedRankings, provenance, setProvenance]);

  useEffect(() => {
    provenance.trrack.apply('SimilarityMatrix', provenance.actions.trrackSimilarityMatrix(similarityMatrix));
    setProvenance(provenance.trrack.graph.backend);
  }, [similarityMatrix, provenance, setProvenance]);

  useEffect(() => {
    provenance.trrack.apply('ColFairnessMap', provenance.actions.trrackColFairnessMap(colFairnessMap));
    setProvenance(provenance.trrack.graph.backend);
  }, [colFairnessMap, provenance, setProvenance]);

  const value = useMemo(
    () => ({
      searchQuery,
      setSearchQuery,
      hoveredGroup,
      setHoveredGroup,
      hoveredGroupRankingView,
      setHoveredGroupRankingView,
      hoveredId,
      setHoveredId,
      hoveredCol,
      setHoveredCol,
      arpThreshold,
      setArpThreshold,
      generatedRankings,
      setGeneratedRankings,
      similarityMatrix,
      setSimilarityMatrix,
      colFairnessMap,
      setColFairnessMap,
    }),
    [searchQuery, hoveredGroup, hoveredGroupRankingView, hoveredId, hoveredCol, arpThreshold, generatedRankings, similarityMatrix, colFairnessMap],
  );

  return (
    <SharedStateContext.Provider value={value}>
      {children}
    </SharedStateContext.Provider>
  );
}
