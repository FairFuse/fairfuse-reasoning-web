import { initializeTrrack, Registry } from '@trrack/core';
import { useMemo } from 'react';

const useProvenance = () => {
  const prov = useMemo(() => {
    const reg = Registry.create();

    const trrackSearchQuery = reg.register('searchQuery', (state, d: string) => {
      state.searchQuery = d;
      return state;
    });

    const trrackHoveredGroup = reg.register('hoveredGroup', (state, d: string | null) => {
      state.hoveredGroup = d;
      return state;
    });

    const trrackHoveredGroupRankingView = reg.register('hoveredGroupRankingView', (state, d: string | null) => {
      state.hoveredGroupRankingView = d;
      return state;
    });

    const trrackInst = initializeTrrack({
      registry: reg,
      initialState: {
        searchQuery: '',
        hoveredGroup: null,
        hoveredGroupRankingView: null,
      },
    });

    return {
      actions: {
        trrackSearchQuery,
        trrackHoveredGroup,
        trrackHoveredGroupRankingView,
      },
      trrack: trrackInst,
    };
  }, []);

  return prov;
};

export type ProvenanceModel = ReturnType<typeof useProvenance>;

export default useProvenance;
