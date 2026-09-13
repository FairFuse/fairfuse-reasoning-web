import {
  useEffect, useMemo, useRef, useState,
} from 'react';
import { useSearchParams } from 'react-router';
import { Flex } from '@mantine/core';
import { IconPlayerPlayFilled, IconPlayerPauseFilled } from '@tabler/icons-react';
import { useStorageEngine } from '../../storage/storageEngineHooks';
import {
  useStoreActions,
  useStoreDispatch,
  useStoreSelector,
} from '../../store/store';
import { useCurrentIdentifier } from '../../routes/utils';
import { useIsAnalysis } from '../../store/hooks/useIsAnalysis';
import { useReplayContext } from '../../store/hooks/useReplay';

export function ScreenRecordingReplay() {
  const [searchParams] = useSearchParams();
  const participantId = useMemo(
    () => searchParams.get('participantId') || undefined,
    [searchParams],
  );

  const {
    videoRef, updateReplayRef, isPlaying, setIsPlaying,
  } = useReplayContext();

  const [showIcon, setShowIcon] = useState(false);
  const hideIconTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasMounted = useRef(false);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return () => { };
    }
    setShowIcon(true);
    if (hideIconTimeout.current) clearTimeout(hideIconTimeout.current);
    hideIconTimeout.current = setTimeout(() => setShowIcon(false), 500);
    return () => {
      if (hideIconTimeout.current) clearTimeout(hideIconTimeout.current);
    };
  }, [isPlaying]);

  useEffect(() => {
    updateReplayRef();
  }, [updateReplayRef]);

  const analysisCanPlayScreenRecording = useStoreSelector((state) => state.analysisCanPlayScreenRecording);

  const { storageEngine } = useStorageEngine();

  const { setAnalysisHasScreenRecording, setAnalysisCanPlayScreenRecording } = useStoreActions();

  const storeDispatch = useStoreDispatch();

  const isAnalysis = useIsAnalysis();

  const identifier = useCurrentIdentifier();

  // Load and show the video
  useEffect(
    () => {
      async function getVideoURL() {
        if (isAnalysis && identifier && storageEngine) {
          try {
            if (!participantId) {
              throw new Error('Participant ID is required to load audio');
            }
            const url = await storageEngine.getScreenRecording(identifier, participantId);
            if (!url) {
              storeDispatch(setAnalysisHasScreenRecording(false));
              storeDispatch(setAnalysisCanPlayScreenRecording(false));
              return;
            }
            storeDispatch(setAnalysisHasScreenRecording(true));
            if (videoRef.current) {
              const video = videoRef.current;
              video.preload = 'metadata';
              if (url) {
                videoRef.current.src = url;
                updateReplayRef();
              }
            }
          } catch (error) {
            storeDispatch(setAnalysisHasScreenRecording(false));
            storeDispatch(setAnalysisCanPlayScreenRecording(false));
            throw new Error(error as string);
          }
        } else {
          storeDispatch(setAnalysisHasScreenRecording(false));
          storeDispatch(setAnalysisCanPlayScreenRecording(false));
        }
      }

      getVideoURL();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      isAnalysis,
      identifier,
      storageEngine,
      participantId,
      storeDispatch,
      setAnalysisHasScreenRecording,
      setAnalysisCanPlayScreenRecording,
    ],
  );

  return (
    <Flex
      pos="relative"
      flex={1}
      ml="calc(0px - var(--app-shell-padding))"
      mr="calc(0px - var(--app-shell-padding))"
      mt="calc(0px - var(--app-shell-padding))"
      mb="calc(0px - var(--app-shell-padding))"
    >
      {analysisCanPlayScreenRecording && (
      <>
        <video
          ref={videoRef}
          width="100%"
          onClick={() => setIsPlaying(!isPlaying)}
          style={{
            background: `${isPlaying ? '#000' : '#222'}`,
            position: 'absolute',
            height: '100%',
            width: '100%',
            cursor: 'pointer',
          }}
        >
          <source type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        <Flex
          pos="absolute"
          style={{
            top: '50%',
            left: '50%',
            transform: `translate(-50%, -50%) scale(${showIcon ? 1 : 1.2})`,
            filter: `blur(${showIcon ? 0 : 2}px)`,
            background: 'rgba(0,0,0,0.5)',
            borderRadius: '50%',
            padding: '16px',
            pointerEvents: 'none',
            zIndex: 10,
            opacity: showIcon ? 1 : 0,
            transition: 'opacity 0.5s ease, transform 0.5s ease, filter 0.5s ease',
          }}
        >
          {isPlaying
            ? <IconPlayerPlayFilled size={48} color="white" />
            : <IconPlayerPauseFilled size={48} color="white" />}
        </Flex>
      </>
      )}
    </Flex>
  );
}
