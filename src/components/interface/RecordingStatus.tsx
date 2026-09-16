import {
  ActionIcon, Group, Text, Tooltip,
} from '@mantine/core';
import { IconMicrophone, IconMicrophoneOff } from '@tabler/icons-react';
import { useCurrentComponent } from '../../routes/utils';
import { useRecordingContext } from '../../store/hooks/useRecording';
import { RecordingAudioWaveform } from './RecordingAudioWaveform';
import classes from './AppHeader.module.css';

export function RecordingStatus() {
  const currentComponent = useCurrentComponent();
  const {
    isScreenRecording,
    setIsMuted,
    isMuted,
    clickToRecord,
    showMutedWarning,
    screenRecordingError,
    audioRecordingError,
    currentComponentHasAudioRecording,
    isAudioRecording,
    audioStatus,
  } = useRecordingContext();

  const isScreenRecordingPermission = currentComponent === '$screen-recording.components.screenRecordingPermission';
  const showAudioStatus = currentComponentHasAudioRecording
    || isAudioRecording
    || (isScreenRecordingPermission && audioStatus !== 'idle');
  const showRecordingStatus = showAudioStatus || isScreenRecording || !!screenRecordingError;
  const isAudioActivelyRecording = audioStatus === 'recording' && !isMuted;

  let recordingLabel = '';
  if (isScreenRecording && isAudioActivelyRecording) {
    recordingLabel = 'Recording screen and audio';
  } else if (isScreenRecording) {
    recordingLabel = 'Recording screen';
  } else if (isAudioActivelyRecording) {
    recordingLabel = 'Recording audio';
  }

  if (!showRecordingStatus) {
    return null;
  }

  return (
    <Group ml="xl" gap={20} wrap="nowrap">
      {recordingLabel && <Text c="red" size="sm">{recordingLabel}</Text>}
      {screenRecordingError && <Text c="red" size="sm" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{screenRecordingError}</Text>}
      {audioStatus === 'denied' && audioRecordingError && <Text c="red" size="sm" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{audioRecordingError}</Text>}
      {audioStatus === 'recording' && !isMuted && <RecordingAudioWaveform />}
      {clickToRecord && showAudioStatus && (audioStatus === 'denied' ? (
        <ActionIcon color="red" variant="light" size="md" aria-label="Microphone error" data-disabled aria-disabled tabIndex={-1}>
          <IconMicrophoneOff style={{ width: '70%', height: '70%' }} stroke={1.5} />
        </ActionIcon>
      ) : audioStatus === 'pending' ? (
        <Tooltip label="Microphone not enabled yet">
          <ActionIcon color="gray" variant="light" size="md" aria-label="Microphone pending" data-disabled aria-disabled tabIndex={-1}>
            <IconMicrophoneOff style={{ width: '70%', height: '70%' }} stroke={1.5} />
          </ActionIcon>
        </Tooltip>
      ) : (
        <Tooltip label={showMutedWarning ? 'You are still muted. Press and hold to unmute.' : 'Press and hold to unmute.'} opened={showMutedWarning || undefined}>
          <ActionIcon className={showMutedWarning ? classes.micBlink : undefined} color="blue" variant="light" size="md" aria-label="Click and hold to unmute microphone" onMouseDown={() => setIsMuted(false)} onMouseUp={() => setIsMuted(true)} onTouchStart={() => setIsMuted(false)} onTouchEnd={() => setIsMuted(true)}>
            {isMuted ? <IconMicrophoneOff style={{ width: '70%', height: '70%' }} stroke={1.5} /> : <IconMicrophone style={{ width: '70%', height: '70%' }} stroke={1.5} />}
          </ActionIcon>
        </Tooltip>
      ))}
    </Group>
  );
}
