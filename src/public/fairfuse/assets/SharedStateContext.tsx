import {
  createContext, useContext, useEffect, useMemo, useState,
} from 'react';
import { TrrackedProvenance } from '../../../store/types';
import useProvenance from './useProvenance';
import { ProvenanceStateModel } from './types';

interface SharedState {
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  hoveredGroup: string | null;
  setHoveredGroup: React.Dispatch<React.SetStateAction<string | null>>
  hoveredGroupRankingView: string | null;
  setHoveredGroupRankingView: React.Dispatch<React.SetStateAction<string | null>>
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

  const provenance = useProvenance();

  useEffect(() => {
    if (provenanceState) {
      setSearchQuery(provenanceState.searchQuery);
      setHoveredGroup(provenanceState.hoveredGroup);
      setHoveredGroupRankingView(provenanceState.hoveredGroupRankingView);
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

  const value = useMemo(
    () => ({
      searchQuery,
      setSearchQuery,
      hoveredGroup,
      setHoveredGroup,
      hoveredGroupRankingView,
      setHoveredGroupRankingView,
    }),
    [searchQuery, hoveredGroup, hoveredGroupRankingView],
  );

  return (
    <SharedStateContext.Provider value={value}>
      {children}
    </SharedStateContext.Provider>
  );
}
