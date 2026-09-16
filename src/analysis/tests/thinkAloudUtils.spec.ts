import {
  expect, test, beforeEach, describe, afterEach,
} from 'vitest';
import { ParticipantMetadata, StudyConfig } from '../../parser/types';
import testConfigSimple from '../../storage/tests/testConfigSimple.json';
import { generateSequenceArray } from '../../utils/handleRandomSequences';
import { LocalStorageEngine } from '../../storage/engines/LocalStorageEngine';
import { StorageEngine } from '../../storage/engines/types';
import { Tag, TaglessEditedText, TimelineTagRegion } from '../individualStudy/thinkAloud/types';

const studyId = 'test-study-think-aloud';
const configSimple = testConfigSimple as StudyConfig;
const participantMetadata: ParticipantMetadata = {
  userAgent: 'test-user-agent',
  resolution: { width: 1920, height: 1080 },
  language: 'en-US',
  ip: '122.122.122.122',
};
const ownerKey = 'analysis-user-key';

describe.each([
  { TestEngine: LocalStorageEngine },
])('think-aloud db tests for $TestEngine', ({ TestEngine }) => {
  let storageEngine: StorageEngine;

  beforeEach(async () => {
    storageEngine = new TestEngine(true);
    await storageEngine.connect();
    await storageEngine.initializeStudyDb(studyId);
    const sequenceArray = await generateSequenceArray(configSimple);
    await storageEngine.setSequenceArray(sequenceArray);
  });

  afterEach(async () => {
    // @ts-expect-error using protected method for testing
    await storageEngine._testingReset(studyId);
  });

  test('get participant/task tag defaults', async () => {
    const participant = await storageEngine.initializeParticipantSession({}, configSimple, participantMetadata);

    const initial = await storageEngine.getAllParticipantAndTaskTags(ownerKey, participant.participantId);
    expect(initial).toEqual({ participantTags: [], taskTags: {} });
  });

  test('participant/task tag reads only create storage records when requested', async () => {
    const participant = await storageEngine.initializeParticipantSession({}, configSimple, participantMetadata);
    const storagePath = `audio/transcriptAndTags/${ownerKey}/${participant.participantId}`;

    const readOnlyDefault = await storageEngine.getParticipantAndTaskTags(ownerKey, participant.participantId);
    expect(readOnlyDefault).toEqual({ participantTags: [], taskTags: {} });

    // @ts-expect-error using protected method for testing
    const afterReadOnlyDefault = await storageEngine._getFromStorage(storagePath, 'participantTags');
    expect(afterReadOnlyDefault).toBeNull();

    const createIfMissingDefault = await storageEngine.getParticipantAndTaskTags(ownerKey, participant.participantId, true);
    expect(createIfMissingDefault).toEqual({ participantTags: [], taskTags: {} });

    // @ts-expect-error using protected method for testing
    const afterCreateIfMissing = await storageEngine._getFromStorage(storagePath, 'participantTags');
    expect(afterCreateIfMissing).toEqual({ participantTags: [], taskTags: {} });
  });

  test('get participant/task tag defaults is stable across repeated reads', async () => {
    const participant = await storageEngine.initializeParticipantSession({}, configSimple, participantMetadata);

    const firstRead = await storageEngine.getAllParticipantAndTaskTags(ownerKey, participant.participantId);
    const secondRead = await storageEngine.getAllParticipantAndTaskTags(ownerKey, participant.participantId);

    expect(firstRead).toEqual({ participantTags: [], taskTags: {} });
    expect(secondRead).toEqual({ participantTags: [], taskTags: {} });
  });

  test('add/remove participant tags', async () => {
    const participant = await storageEngine.initializeParticipantSession({}, configSimple, participantMetadata);
    const { participantId } = participant;

    const participantTag1: Tag = { id: 'p-1', name: 'Hesitation', color: '#FF0000' };
    const participantTag2: Tag = { id: 'p-2', name: 'Confidence', color: '#00AA00' };

    await storageEngine.saveAllParticipantAndTaskTags(ownerKey, participantId, {
      participantTags: [participantTag1, participantTag2],
      taskTags: {},
    });

    const afterAdd = await storageEngine.getAllParticipantAndTaskTags(ownerKey, participantId);
    expect(afterAdd.participantTags).toEqual([participantTag1, participantTag2]);

    await storageEngine.saveAllParticipantAndTaskTags(ownerKey, participantId, {
      participantTags: [participantTag2],
      taskTags: {},
    });

    const afterRemove = await storageEngine.getAllParticipantAndTaskTags(ownerKey, participantId);
    expect(afterRemove.participantTags).toEqual([participantTag2]);
  });

  test('add/remove task tags', async () => {
    const participant = await storageEngine.initializeParticipantSession({}, configSimple, participantMetadata);
    const { participantId } = participant;

    const participantTag: Tag = { id: 'p-1', name: 'Hesitation', color: '#FF0000' };
    const taskTag1: Tag = { id: 't-1', name: 'Interpretation', color: '#0000FF' };
    const taskTag2: Tag = { id: 't-2', name: 'Error', color: '#AA00AA' };

    await storageEngine.saveAllParticipantAndTaskTags(ownerKey, participantId, {
      participantTags: [participantTag],
      taskTags: {
        taskA: [taskTag1, taskTag2],
      },
    });

    const afterAdd = await storageEngine.getAllParticipantAndTaskTags(ownerKey, participantId);
    expect(afterAdd.taskTags.taskA).toEqual([taskTag1, taskTag2]);

    await storageEngine.saveAllParticipantAndTaskTags(ownerKey, participantId, {
      participantTags: [participantTag],
      taskTags: {
        taskA: [taskTag1],
      },
    });

    const afterRemove = await storageEngine.getAllParticipantAndTaskTags(ownerKey, participantId);
    expect(afterRemove.taskTags.taskA).toEqual([taskTag1]);
  });

  test('add/update/remove timeline tag regions', async () => {
    const participant = await storageEngine.initializeParticipantSession({}, configSimple, participantMetadata);
    const { participantId } = participant;

    const regionA: TimelineTagRegion = {
      id: 'r-1', tagId: 'tl-1', start: 2, duration: 3, end: 5, comment: '',
    };
    const regionB: TimelineTagRegion = {
      id: 'r-2', tagId: 'tl-2', start: 4, duration: 4, end: 8, comment: 'overlaps A',
    };

    await storageEngine.saveAllParticipantAndTaskTags(ownerKey, participantId, {
      participantTags: [],
      taskTags: {},
      timelineTags: { taskA: [regionA, regionB] },
    });

    const afterAdd = await storageEngine.getAllParticipantAndTaskTags(ownerKey, participantId);
    expect(afterAdd.timelineTags?.taskA).toEqual([regionA, regionB]);

    // Annotating a region keeps its bounds intact.
    await storageEngine.saveAllParticipantAndTaskTags(ownerKey, participantId, {
      participantTags: [],
      taskTags: {},
      timelineTags: { taskA: [{ ...regionA, comment: 'a note' }, regionB] },
    });

    const afterComment = await storageEngine.getAllParticipantAndTaskTags(ownerKey, participantId);
    expect(afterComment.timelineTags?.taskA[0]).toEqual({ ...regionA, comment: 'a note' });

    // Deleting down to an empty list must persist, not silently keep the old value.
    await storageEngine.saveAllParticipantAndTaskTags(ownerKey, participantId, {
      participantTags: [],
      taskTags: {},
      timelineTags: { taskA: [] },
    });

    const afterDelete = await storageEngine.getAllParticipantAndTaskTags(ownerKey, participantId);
    expect(afterDelete.timelineTags?.taskA).toEqual([]);
  });

  test('timeline tag regions are scoped per task', async () => {
    const participant = await storageEngine.initializeParticipantSession({}, configSimple, participantMetadata);
    const { participantId } = participant;

    const regionA: TimelineTagRegion = {
      id: 'r-1', tagId: 'tl-1', start: 0, duration: 1, end: 1, comment: '',
    };
    const regionB: TimelineTagRegion = {
      id: 'r-2', tagId: 'tl-1', start: 9, duration: 1, end: 10, comment: '',
    };

    await storageEngine.saveAllParticipantAndTaskTags(ownerKey, participantId, {
      participantTags: [],
      taskTags: {},
      timelineTags: { taskA: [regionA], taskB: [regionB] },
    });

    const saved = await storageEngine.getAllParticipantAndTaskTags(ownerKey, participantId);
    expect(saved.timelineTags?.taskA).toEqual([regionA]);
    expect(saved.timelineTags?.taskB).toEqual([regionB]);
  });

  test('documents saved before timeline tagging load without timelineTags', async () => {
    const participant = await storageEngine.initializeParticipantSession({}, configSimple, participantMetadata);
    const { participantId } = participant;

    // A legacy document, written before the timelineTags field existed.
    await storageEngine.saveAllParticipantAndTaskTags(ownerKey, participantId, {
      participantTags: [{ id: 'p-1', name: 'Hesitation', color: '#FF0000' } as Tag],
      taskTags: {},
    });

    const loaded = await storageEngine.getAllParticipantAndTaskTags(ownerKey, participantId);
    expect(loaded.timelineTags).toBeUndefined();
    expect(loaded.timelineTags?.taskA ?? []).toEqual([]);
  });

  test('participant/task tags are isolated per participant', async () => {
    const participantA = await storageEngine.initializeParticipantSession({}, configSimple, participantMetadata);
    await storageEngine.clearCurrentParticipantId();
    const participantB = await storageEngine.initializeParticipantSession({}, configSimple, participantMetadata);

    const participantTagA: Tag = { id: 'p-a', name: 'Participant A Tag', color: '#111111' };
    const taskTagA: Tag = { id: 't-a', name: 'Task A Tag', color: '#222222' };

    await storageEngine.saveAllParticipantAndTaskTags(ownerKey, participantA.participantId, {
      participantTags: [participantTagA],
      taskTags: { taskA: [taskTagA] },
    });

    const participantATags = await storageEngine.getAllParticipantAndTaskTags(ownerKey, participantA.participantId);
    const participantBTags = await storageEngine.getAllParticipantAndTaskTags(ownerKey, participantB.participantId);

    expect(participantATags.participantTags).toEqual([participantTagA]);
    expect(participantATags.taskTags.taskA).toEqual([taskTagA]);
    expect(participantBTags).toEqual({ participantTags: [], taskTags: {} });
  });

  test('task tags are isolated per task key', async () => {
    const participant = await storageEngine.initializeParticipantSession({}, configSimple, participantMetadata);
    const { participantId } = participant;

    const taskATag: Tag = { id: 't-a', name: 'Task A', color: '#123456' };
    const taskBTag: Tag = { id: 't-b', name: 'Task B', color: '#654321' };

    await storageEngine.saveAllParticipantAndTaskTags(ownerKey, participantId, {
      participantTags: [],
      taskTags: {
        taskA: [taskATag],
        taskB: [taskBTag],
      },
    });

    const result = await storageEngine.getAllParticipantAndTaskTags(ownerKey, participantId);
    expect(result.taskTags.taskA).toEqual([taskATag]);
    expect(result.taskTags.taskB).toEqual([taskBTag]);
  });

  test('text tags can be added and removed', async () => {
    const textTag1: Tag = { id: 'txt-1', name: 'Insight', color: '#112233' };
    const textTag2: Tag = { id: 'txt-2', name: 'Question', color: '#AABBCC' };

    const initialTextTags = await storageEngine.getTags('text');
    expect(initialTextTags).toBeNull();

    await storageEngine.saveTags([textTag1, textTag2], 'text');
    const afterAdd = await storageEngine.getTags('text');
    expect(afterAdd).toEqual([textTag1, textTag2]);

    await storageEngine.saveTags([textTag2], 'text');
    const afterRemove = await storageEngine.getTags('text');
    expect(afterRemove).toEqual([textTag2]);
  });

  test('save transcript', async () => {
    const participant = await storageEngine.initializeParticipantSession({}, configSimple, participantMetadata);
    const { participantId } = participant;
    const taskName = 'taskA';

    const textTag: Tag = { id: 'txt-1', name: 'Insight', color: '#112233' };
    const transcript: TaglessEditedText[] = [
      {
        transcriptMappingStart: 0,
        transcriptMappingEnd: 0,
        text: 'First sentence',
        selectedTags: [textTag],
        annotation: 'note-1',
      },
      {
        transcriptMappingStart: 1,
        transcriptMappingEnd: 1,
        text: 'Second sentence',
        selectedTags: [],
        annotation: '',
      },
    ];

    // @ts-expect-error using protected method for testing
    await storageEngine._pushToStorage(`audio/transcriptAndTags/${ownerKey}/${participantId}/${taskName}`, 'editedText', transcript);
    // @ts-expect-error using protected method for testing
    const storedTranscript = await storageEngine._getFromStorage(`audio/transcriptAndTags/${ownerKey}/${participantId}/${taskName}`, 'editedText');

    expect(storedTranscript).toEqual(transcript);
  });

  test('saving transcript overwrites same task and keeps other task transcript intact', async () => {
    const participant = await storageEngine.initializeParticipantSession({}, configSimple, participantMetadata);
    const { participantId } = participant;

    const taskATranscriptV1: TaglessEditedText[] = [
      {
        transcriptMappingStart: 0,
        transcriptMappingEnd: 0,
        text: 'Task A v1',
        selectedTags: [],
        annotation: '',
      },
    ];
    const taskATranscriptV2: TaglessEditedText[] = [
      {
        transcriptMappingStart: 0,
        transcriptMappingEnd: 0,
        text: 'Task A v2',
        selectedTags: [],
        annotation: 'updated',
      },
    ];
    const taskBTranscript: TaglessEditedText[] = [
      {
        transcriptMappingStart: 0,
        transcriptMappingEnd: 0,
        text: 'Task B v1',
        selectedTags: [],
        annotation: '',
      },
    ];

    // @ts-expect-error using protected method for testing
    await storageEngine._pushToStorage(`audio/transcriptAndTags/${ownerKey}/${participantId}/taskA`, 'editedText', taskATranscriptV1);
    // @ts-expect-error using protected method for testing
    await storageEngine._pushToStorage(`audio/transcriptAndTags/${ownerKey}/${participantId}/taskB`, 'editedText', taskBTranscript);
    // @ts-expect-error using protected method for testing
    await storageEngine._pushToStorage(`audio/transcriptAndTags/${ownerKey}/${participantId}/taskA`, 'editedText', taskATranscriptV2);

    // @ts-expect-error using protected method for testing
    const storedTaskA = await storageEngine._getFromStorage(`audio/transcriptAndTags/${ownerKey}/${participantId}/taskA`, 'editedText');
    // @ts-expect-error using protected method for testing
    const storedTaskB = await storageEngine._getFromStorage(`audio/transcriptAndTags/${ownerKey}/${participantId}/taskB`, 'editedText');

    expect(storedTaskA).toEqual(taskATranscriptV2);
    expect(storedTaskB).toEqual(taskBTranscript);
  });
});
