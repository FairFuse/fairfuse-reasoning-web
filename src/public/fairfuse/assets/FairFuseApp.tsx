import {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import {
  Autocomplete, Box, Button, SegmentedControl, Slider,
} from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import { CSV_URL } from './constants';
import type { Candidate, ColFairness, GeneratedRanking } from './types';
import { generateGroupColors, parseCsv } from './utils';
import RankingView from './components/RankingView';
import SimilarityHeatmap from './components/SimilarityHeatmap';

function FairFuseApp() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [rankingCols, setRankingCols] = useState<string[]>([]);
  const [protectedAttr, setProtectedAttr] = useState('Group');
  const [compressed, setCompressed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [arpThreshold, setArpThreshold] = useState(0.5);
  const [maxArp, setMaxArp] = useState<number | null>(null);
  const [generatedRankings, setGeneratedRankings] = useState<GeneratedRanking[]>([]);
  const [generating, setGenerating] = useState(false);
  const [similarityMatrix, setSimilarityMatrix] = useState<number[][] | null>(null);
  const [colFairnessMap, setColFairnessMap] = useState<Record<string, ColFairness>>({});
  const consensusCountRef = useRef(0);

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
      return [...candidates].sort((a, b) => a.rankings[col] - b.rankings[col]).map((c) => c.id);
    });

    const sortedCandidates = [...candidates].sort((a, b) => a.id - b.id);
    const uniqueRegions = [...new Set(sortedCandidates.map((c) => c.region))];
    const regionToGroupId = Object.fromEntries(uniqueRegions.map((r, i) => [r, i]));
    const groups = [
      sortedCandidates.map((c) => c.id),
      sortedCandidates.map((c) => regionToGroupId[c.region]),
    ];

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

    const rankings = rankingCols.map((col) => [...candidates].sort((a, b) => a.rankings[col] - b.rankings[col]).map((c) => c.id));
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
      const rankings = rankingCols.map((col) => [...candidates].sort((a, b) => a.rankings[col] - b.rankings[col]).map((c) => c.id));
      const sortedCandidates = [...candidates].sort((a, b) => a.id - b.id);
      const uniqueRegions = [...new Set(sortedCandidates.map((c) => c.region))];
      const regionToGroupId = Object.fromEntries(uniqueRegions.map((r, i) => [r, i]));
      const groups = [
        sortedCandidates.map((c) => c.id),
        sortedCandidates.map((c) => regionToGroupId[c.region]),
      ];
      const res = await fetch('http://localhost:8001/consensus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rankings, groups, arpThreshold: maxArp === null ? 1 : arpThreshold }),
      });
      const data = await res.json();
      const rankById: Record<number, number> = {};
      (data.ranking as number[]).forEach((id, idx) => { rankById[id] = idx + 1; });
      consensusCountRef.current += 1;
      const n = consensusCountRef.current;
      const colName = `#FAIR_${n}`;
      setGeneratedRankings((prev) => [...prev, { colName, rankById }]);
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

  const heatmapLabels = useMemo(() => [
    ...rankingCols.map((_, i) => `R${i + 1}`),
    ...generatedRankings.map((_, i) => `C${i + 1}`),
  ], [rankingCols, generatedRankings]);

  const searchedId = searchQuery.trim()
    ? (candidates.find((c) => c.name.toLowerCase().includes(searchQuery.trim().toLowerCase()))?.id ?? null)
    : null;

  return (
    <Box h="calc(100vh - 80px)" style={{ display: 'flex' }}>
      {/* Sidebar */}
      <Box
        w={300}
        style={{
          display: 'flex', flexDirection: 'column', gap: 16, padding: '12px 10px', borderRight: '1px solid #dee2e6', flexShrink: 0,
        }}
      >
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
              onChange={(v) => ((1 - v) < maxArp ? setArpThreshold(1 - v) : (1 - maxArp))}
              size="md"
              marks={[
                { value: parseFloat((1 - maxArp).toFixed(2)), label: 'Min' },
                { value: 1, label: 'Max' },
              ]}
              mb="sm"
            />
          </div>
        )}
        <Button
          size="xs"
          loading={generating}
          disabled={candidates.length === 0}
          onClick={handleGenerateConsensus}
        >
          {maxArp !== null ? 'Generate Fair Consensus Ranking' : 'Generate Consensus Ranking'}
        </Button>
        {similarityMatrix && (
          <div>
            <div style={{
              fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 6,
            }}
            >
              Similarity
            </div>
            <SimilarityHeatmap matrix={similarityMatrix} labels={heatmapLabels} />
          </div>
        )}

        {groupLabels.length > 0 && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 8 }}>
              {protectedAttr}
            </div>
            {groupLabels.map((label) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                <div style={{
                  width: 18, height: 18, borderRadius: 3, flexShrink: 0, backgroundColor: groupColors[label] ?? '#999',
                }}
                />
                <span style={{ fontSize: 13, color: '#333' }}>{label}</span>
              </div>
            ))}
          </div>
        )}
      </Box>

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
            data={candidates.map((c) => c.name)}
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
          />
        </Box>
      </Box>
    </Box>
  );
}

export default FairFuseApp;
