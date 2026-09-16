interface TranscribedAudioSnippet {
    alternatives: {confidence: number, transcript: string}[]
    languageCode: string;
    resultEndTime: string | number;
}

export interface TranscribedAudio {
    results: TranscribedAudioSnippet[]
}

export interface Tag {
    color: string,
    name: string,
    id: string
}

export interface TimelineTagRegion {
    /** Unique id for this region, independent of the tag it points at. */
    id: string,
    /** Id of the Tag in the 'timeline' tag vocabulary. */
    tagId: string,
    /** Seconds from the start of the task. */
    start: number,
    /** Length of the region in seconds. */
    duration: number,
    /** Seconds from the start of the task, equal to start + duration. */
    end: number,
    comment: string
}

export interface ParticipantTags {
    participantTags: Tag[],
    taskTags: Record<string, Tag[]>,
    /** Tagged time ranges on the replay timeline, keyed by trial identifier. */
    timelineTags?: Record<string, TimelineTagRegion[]>
}

export interface EditedText {
    transcriptMappingStart: number;
    transcriptMappingEnd: number;
    text: string;
    selectedTags: Tag[];
    annotation: string;
}

export interface TaglessEditedText {
    transcriptMappingStart: number;
    transcriptMappingEnd: number;
    text: string;
    selectedTags: Tag[];
    annotation: string;
}

export interface TranscriptLinesWithTimes {
    start: number,
    end: number,
    lineStart: number,
    lineEnd: number,
    tags: Tag[][]
}
