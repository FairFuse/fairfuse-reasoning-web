import {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import {
  Autocomplete, Box, Button, Flex, SegmentedControl, Slider,
} from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import { CSV_URL } from './constants';
import type {
  Candidate, ColFairness, ProvenanceStateModel,
} from './types';
import {
  buildGroupArrays, formatColLabel, generateGroupColors, parseCsv, sortByColRank,
} from './utils';
import RankingView from './components/RankingView';
import SimilarityHeatmapPair from './components/SimilarityHeatmapPair';
import { AppNavBar } from '../../../components/interface/AppNavBar';
import { StimulusParams } from '../../../store/types';
import { SharedStateProvider, useSharedState } from './SharedStateContext';

function FairFuseApp({ setAnswer }: StimulusParams<unknown, unknown>) {
  const {
    searchQuery, setSearchQuery, hoveredGroup, setHoveredGroup,
    arpThreshold, setArpThreshold,
    generatedRankings, setGeneratedRankings,
    similarityMatrix, setSimilarityMatrix,
    colFairnessMap, setColFairnessMap,
    displayedCols,
  } = useSharedState();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [rankingCols, setRankingCols] = useState<string[]>([]);
  const [protectedAttr, setProtectedAttr] = useState('Group');
  const [compressed, setCompressed] = useState(false);
  // const [searchQuery, setSearchQuery] = useState('');
  const [maxArp, setMaxArp] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  // const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);
  const [hoveredHeatmapCols, setHoveredHeatmapCols] = useState<[string, string] | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const consensusCountRef = useRef(0);

  const handleSelect = useCallback((id: number) => {
    setSelectedId((prev) => (prev === id ? null : id));
  }, []);

  useEffect(() => {
    const candidate = candidates.find((c) => c.id === selectedId) ?? null;
    if (candidate) {
      setAnswer({ status: true, answers: { candidateName: candidate?.name ?? '' } });
    }
  }, [selectedId, candidates, setAnswer]);

  const groupLabels = useMemo(() => {
    if (candidates.length === 0) return [];
    const sorted = [...candidates].sort((a, b) => a.id - b.id);
    return [...new Set(sorted.map((c) => c.region))];
  }, [candidates]);

  const groupColors = useMemo(() => generateGroupColors(groupLabels), [groupLabels]);

  useEffect(() => {
    fetch(CSV_URL)
      .then((r) => r.text())
      .then((text) => {
        const { candidates: c, rankingCols: rc, protectedAttr: pa } = parseCsv(text);
        setCandidates(c);
        setRankingCols(rc);
        setProtectedAttr(pa);
      });
  }, []);

  useEffect(() => {
    const allCols = [...rankingCols, ...generatedRankings.map((gr) => gr.colName)];
    if (candidates.length === 0 || allCols.length === 0) return;

    const allRankings = allCols.map((col) => {
      const gr = generatedRankings.find((g) => g.colName === col);
      if (gr) return [...candidates].sort((a, b) => (gr.rankById[a.id] ?? 9999) - (gr.rankById[b.id] ?? 9999)).map((c) => c.id);
      return sortByColRank(candidates, col).map((c) => c.id);
    });

    const { ids, groupIds } = buildGroupArrays(candidates);
    const groups = [ids, groupIds];

    fetch('http://localhost:8001/fairness-metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rankings: allRankings, groups }),
    })
      .then((r) => r.json())
      .then((data) => {
        setColFairnessMap(() => {
          const next: Record<string, ColFairness> = {};
          allCols.forEach((col, i) => { next[col] = { arp: data.arp[i], fpr: data.fpr[i] }; });
          return next;
        });
      });
  }, [candidates, rankingCols, generatedRankings]);

  useEffect(() => {
    if (candidates.length === 0 || rankingCols.length === 0) return;

    const rankings = rankingCols.map((col) => sortByColRank(candidates, col).map((c) => c.id));
    const consensusRankings = generatedRankings.map((gr) => [...candidates].sort((a, b) => (gr.rankById[a.id] ?? 9999) - (gr.rankById[b.id] ?? 9999)).map((c) => c.id));

    fetch('http://localhost:8001/similarity-metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rankings: [...rankings, ...consensusRankings] }),
    })
      .then((r) => r.json())
      .then((data) => { setSimilarityMatrix(data); });
  }, [candidates, rankingCols, generatedRankings]);

  useEffect(() => {
    if (maxArp !== null || generatedRankings.length === 0) return;
    const firstColName = generatedRankings[0].colName;
    const arp = colFairnessMap[firstColName]?.arp;
    if (arp == null) return;
    setMaxArp(arp);
    setArpThreshold(arp);
  }, [colFairnessMap, generatedRankings, maxArp]);

  const augmentedCandidates = useMemo(
    () => (generatedRankings.length === 0 ? candidates : candidates.map((c) => ({
      ...c,
      rankings: {
        ...c.rankings,
        ...Object.fromEntries(generatedRankings.map((gr) => [gr.colName, gr.rankById[c.id] ?? 9999])),
      },
    }))),
    [candidates, generatedRankings],
  );

  const allRankingCols = useMemo(
    () => [...rankingCols, ...generatedRankings.map((gr) => gr.colName)],
    [rankingCols, generatedRankings],
  );

  const handleGenerateConsensus = useCallback(async () => {
    setGenerating(true);
    try {
      const rankings = rankingCols.map((col) => sortByColRank(candidates, col).map((c) => c.id));
      const { ids, groupIds } = buildGroupArrays(candidates);
      const groups = [ids, groupIds];
      const res = await fetch('http://localhost:8001/consensus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rankings, groups, arpThreshold: maxArp === null ? 1 : arpThreshold }),
      });
      const data = await res.json();
      const rankById: Record<number, number> = {};
      (data.ranking as number[]).forEach((id, idx) => { rankById[id] = idx + 1; });
      setGeneratedRankings((prev) => {
        const lastUnpinnedIdx = prev.reduce((acc, gr, i) => (!gr.pinned ? i : acc), -1);
        if (lastUnpinnedIdx !== -1) {
          const next = [...prev];
          next[lastUnpinnedIdx] = { ...next[lastUnpinnedIdx], rankById };
          return next;
        }
        consensusCountRef.current += 1;
        return [...prev, { colName: `#FAIR_${consensusCountRef.current}`, rankById, pinned: false }];
      });
    } finally {
      setGenerating(false);
    }
  }, [candidates, rankingCols, arpThreshold, maxArp]);

  const handleConsensusReorder = useCallback((colName: string, newOrderedIds: number[]) => {
    setGeneratedRankings((prev) => prev.map((gr) => {
      if (gr.colName !== colName) return gr;
      const rankById: Record<number, number> = {};
      newOrderedIds.forEach((id, idx) => { rankById[id] = idx + 1; });
      return { ...gr, rankById };
    }));
  }, []);

  const handlePinToggle = useCallback((colName: string) => {
    setGeneratedRankings((prev) => prev.map((gr) => (gr.colName === colName ? { ...gr, pinned: !gr.pinned } : gr)));
  }, []);

  const handleHeatmapHoverCols = useCallback((cols: [string, string] | null) => {
    setHoveredHeatmapCols(cols);
  }, []);

  const handleDeleteConsensus = useCallback((colName: string) => {
    setGeneratedRankings((prev) => prev.filter((gr) => gr.colName !== colName));
  }, []);

  const pinnedCols = useMemo(
    () => new Set(generatedRankings.filter((gr) => gr.pinned).map((gr) => gr.colName)),
    [generatedRankings],
  );

  const baseDisplayedCols = useMemo(
    () => displayedCols.filter((c) => !c.startsWith('#FAIR_')),
    [displayedCols],
  );

  const consensusDisplayedCols = useMemo(
    () => displayedCols.filter((c) => c.startsWith('#FAIR_')),
    [displayedCols],
  );

  const baseHeatmapLabels = useMemo(
    () => baseDisplayedCols.map(formatColLabel),
    [baseDisplayedCols],
  );

  const consensusHeatmapLabels = useMemo(
    () => consensusDisplayedCols.map(formatColLabel),
    [consensusDisplayedCols],
  );

  const displayedMatrix = useMemo(() => {
    if (!similarityMatrix || displayedCols.length === 0) return null;
    const baseIdx = Object.fromEntries(allRankingCols.map((col, i) => [col, i]));
    return displayedCols.map((rowCol) => displayedCols.map((colCol) => {
      const r = baseIdx[rowCol] ?? -1;
      const c = baseIdx[colCol] ?? -1;
      return r !== -1 && c !== -1 && r < similarityMatrix.length && c < similarityMatrix[r].length
        ? similarityMatrix[r][c]
        : 0;
    }));
  }, [similarityMatrix, displayedCols, allRankingCols]);

  const nBase = baseDisplayedCols.length;
  const nConsensus = consensusDisplayedCols.length;

  const baseMatrix = useMemo(
    () => displayedMatrix?.slice(0, nBase).map((row) => row.slice(0, nBase)) ?? null,
    [displayedMatrix, nBase],
  );
  const crossMatrix = useMemo(() => {
    if (!displayedMatrix || consensusDisplayedCols.length === 0) return null;
    return displayedMatrix.slice(0, nBase).map((row) => row.slice(nBase));
  }, [displayedMatrix, nBase, consensusDisplayedCols.length]);

  const sharedCellSize = useMemo(
    () => ((nBase + nConsensus) > 0 ? Math.max(4, Math.floor((225 - 100) / (nBase + nConsensus))) : 20),
    [nBase, nConsensus],
  );

  const highlightedCols = useMemo(
    () => (hoveredHeatmapCols ? new Set(hoveredHeatmapCols) : undefined),
    [hoveredHeatmapCols],
  );

  const candidateNames = useMemo(() => candidates.map((c) => c.name), [candidates]);

  const searchedId = searchQuery.trim()
    ? (candidates.find((c) => c.name.toLowerCase().includes(searchQuery.trim().toLowerCase()))?.id ?? null)
    : null;

  return (
    <Box h="calc(100vh)" style={{ display: 'flex' }} m="-16">
      {/* Sidebar */}
      <Flex
        direction="column"
        w={350}
        style={{
          borderRight: '1px solid #dee2e6',
        }}
      >
        <Box style={{ flexShrink: 0, overflowY: 'auto', flex: 1 }}>
          {/* 1. Fairness controller */}
          <div style={{ padding: 16, background: '#f5f5f5' }}>
            {maxArp !== null && (
            <div>
              <div style={{
                fontSize: 14, fontWeight: 600, color: '#555', marginBottom: 10,
              }}
              >
                Fairness Threshold:
                {' '}
                {(1 - arpThreshold).toFixed(2)}
              </div>
              <Slider
                defaultValue={1}
                min={0}
                max={1}
                step={0.01}
                value={Math.round((1 - arpThreshold) * 100) / 100}
                onChange={(v) => { const next = 1 - v; if (next < (maxArp ?? 1)) setArpThreshold(next); }}
                size="md"
                marks={[
                  { value: parseFloat((1 - maxArp).toFixed(2)), label: 'Min' },
                  { value: 1, label: 'Max' },
                ]}
                mb="sm"
                h={32}
              />
            </div>
            )}
            <Button
              size="xs"
              fullWidth
              loading={generating}
              disabled={candidates.length === 0}
              onClick={handleGenerateConsensus}
            >
              {maxArp !== null ? 'Generate Fair Consensus Ranking' : 'Generate Consensus Ranking'}
            </Button>
          </div>

          {/* 2. Similarity View */}
          {baseMatrix && (
          <div style={{ padding: 16, borderTop: '1px solid #dee2e6' }}>
            <div style={{
              fontSize: 14, fontWeight: 600, color: '#555', marginBottom: 6,
            }}
            >
              Similarity View
            </div>
            <SimilarityHeatmapPair
              baseMatrix={baseMatrix}
              baseLabels={baseHeatmapLabels}
              baseColNames={baseDisplayedCols}
              crossMatrix={crossMatrix}
              crossLabels={consensusHeatmapLabels}
              crossColNames={consensusDisplayedCols}
              cellSize={sharedCellSize}
              onHoverCols={handleHeatmapHoverCols}
            />
          </div>
          )}

          {/* 3. Legend */}
          {groupLabels.length > 0 && (
          <div style={{ padding: 16, borderTop: '1px solid #dee2e6' }}>
            <div style={{
              fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 4,
            }}
            >
              Attribute Legend
            </div>
            <div style={{
              fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 8,
            }}
            >
              {protectedAttr}
            </div>
            {groupLabels.map((label) => {
              const dimmed = hoveredGroup !== null && hoveredGroup !== label;
              return (
                <div
                  key={label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 2,
                    opacity: dimmed ? 0.25 : 1,
                    transition: 'opacity 0.15s',
                  }}
                >
                  <div style={{
                    width: 20, height: 20, borderRadius: 2, flexShrink: 0, backgroundColor: groupColors[label] ?? '#999',
                  }}
                  />
                  <span style={{ fontSize: 14, color: '#333' }}>{label}</span>
                </div>
              );
            })}
          </div>
          )}
        </Box>

        {/* 4. Participant Task */}
        <Flex
          direction="column"
          style={{
            position: 'relative', borderTop: '1px solid #dee2e6', maxHeight: 350, overflow: 'auto',
          }}
        >
          <Box px={16} py={4} bg="blue.1">
            <h4 style={{ margin: 0, padding: 0 }}>Task</h4>
          </Box>
          <Box flex={1} style={{ overflow: 'auto' }}>
            <AppNavBar width={349} top={0} sidebarOpen />
          </Box>
        </Flex>
      </Flex>

      {/* Main column */}
      <Box flex={1} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Box
          style={{
            border: '1px solid #dee2e6', margin: '4px 4px 0', padding: '6px 8px', display: 'flex', alignItems: 'center', gap: 8,
          }}
          bg="green.0"
        >
          <span style={{ fontSize: 11, color: '#666' }}>View</span>
          <SegmentedControl
            size="xs"
            value={compressed ? 'compressed' : 'normal'}
            onChange={(v) => setCompressed(v === 'compressed')}
            data={[
              { label: 'Normal', value: 'normal' },
              { label: 'Compressed', value: 'compressed' },
            ]}
          />
          <Autocomplete
            size="xs"
            placeholder="Search candidate…"
            value={searchQuery}
            onChange={setSearchQuery}
            data={candidateNames}
            style={{ flex: 1, maxWidth: 200 }}
            rightSection={
              searchQuery
                ? <IconX size={12} style={{ cursor: 'pointer', color: '#aaa' }} onClick={() => setSearchQuery('')} />
                : null
            }
          />
        </Box>
        <Box
          flex="1 1 0"
          style={{
            border: '1px solid #dee2e6', borderTop: 0, margin: '0 4px 4px', overflow: 'hidden', display: 'flex',
          }}
        >
          <RankingView
            candidates={augmentedCandidates}
            rankingCols={allRankingCols}
            compressed={compressed}
            searchedId={searchedId}
            colFairnessMap={colFairnessMap}
            groupLabels={groupLabels}
            groupColors={groupColors}
            onReorder={handleConsensusReorder}
            onGroupHover={setHoveredGroup}
            pinnedCols={pinnedCols}
            onPinToggle={handlePinToggle}
            onDeleteConsensus={handleDeleteConsensus}
            highlightedCols={highlightedCols}
            selectedId={selectedId}
            onSelect={handleSelect}
          />
        </Box>
      </Box>
    </Box>
  );
}

export function FairFuseAppWrapper(props: StimulusParams<[], ProvenanceStateModel>) {
  return (
    <SharedStateProvider provenanceState={props.provenanceState} setProvenance={props.setProvenance}>
      <FairFuseApp {...props} />
    </SharedStateProvider>
  );
}

export default FairFuseAppWrapper;
