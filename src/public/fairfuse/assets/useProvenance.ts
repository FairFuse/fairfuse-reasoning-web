import { initializeTrrack, Registry } from '@trrack/core';
import { useMemo } from 'react';
import type { ColFairness, GeneratedRanking } from './types';

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

    const trrackHoveredId = reg.register('hoveredId', (state, d: number | null) => {
      state.hoveredId = d;
      return state;
    });

    const trrackHoveredCol = reg.register('hoveredCol', (state, d: string | null) => {
      state.hoveredCol = d;
      return state;
    });

    const trrackArpThreshold = reg.register('arpThreshold', (state, d: number) => {
      state.arpThreshold = d;
      return state;
    });

    const trrackGeneratedRankings = reg.register('generatedRankings', (state, d: GeneratedRanking[]) => {
      state.generatedRankings = d;
      return state;
    });

    const trrackSimilarityMatrix = reg.register('similarityMatrix', (state, d: number[][] | null) => {
      state.similarityMatrix = d;
      return state;
    });

    const trrackColFairnessMap = reg.register('colFairnessMap', (state, d: Record<string, ColFairness>) => {
      state.colFairnessMap = d;
      return state;
    });

    const trrackDisplayedCols = reg.register('displayedCols', (state, d: string[]) => {
      state.displayedCols = d;
      return state;
    });

    const trrackHoveredHeatmapCols = reg.register('hoveredHeatmapCols', (state, d: [string, string] | null) => {
      state.hoveredHeatmapCols = d;
      return state;
    });

    const trrackCompressed = reg.register('compressed', (state, d: boolean) => {
      state.compressed = d;
      return state;
    });

    const trrackInst = initializeTrrack({
      registry: reg,
      initialState: {
        searchQuery: '',
        hoveredGroup: null,
        hoveredGroupRankingView: null,
        hoveredId: null,
        hoveredCol: null,
        arpThreshold: 0.5,
        generatedRankings: [],
        similarityMatrix: null,
        colFairnessMap: {},
        displayedCols: [],
        hoveredHeatmapCols: null,
        compressed: false,
      },
    });

    return {
      actions: {
        trrackSearchQuery,
        trrackHoveredGroup,
        trrackHoveredGroupRankingView,
        trrackHoveredId,
        trrackHoveredCol,
        trrackArpThreshold,
        trrackGeneratedRankings,
        trrackSimilarityMatrix,
        trrackColFairnessMap,
        trrackDisplayedCols,
        trrackHoveredHeatmapCols,
        trrackCompressed,
      },
      trrack: trrackInst,
    };
  }, []);

  return prov;
};

export type ProvenanceModel = ReturnType<typeof useProvenance>;

export default useProvenance;
