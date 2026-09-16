import {
  Button, CloseButton, ColorSwatch, Group, Stack, Text, Textarea, Tooltip,
} from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { Tag, TimelineTagRegion } from '../types';
import { TagEditor } from './TagEditor';
import { youtubeReadableDuration } from '../../../../utils/humanReadableDuration';

/**
 * Body of the popover used to attach a tag to a timeline region and annotate it.
 * A region carries a single tag, so this is a single-select rather than the
 * multi-select TagSelector used for participant and task tags.
 */
export function TimelineTagEditor({
  tags,
  region,
  onSelectTag,
  onCommentChange,
  onDelete,
  createTagCallback,
  onClose,
}: {
  tags: Tag[];
  region: TimelineTagRegion;
  onSelectTag: (tagId: string) => void;
  onCommentChange: (comment: string) => void;
  onDelete: () => void;
  createTagCallback: (tag: Tag) => void | Promise<void>;
  onClose?: () => void;
}) {
  const [comment, setComment] = useState(region.comment);

  // Switching to a different region should show that region's own note.
  useEffect(() => {
    setComment(region.comment);
  }, [region.id, region.comment]);

  return (
    <Stack gap="xs" style={{ width: 260 }}>
      <Group justify="space-between" wrap="nowrap" gap="xs">
        <Text size="xs" c="dimmed" ff="monospace">
          {`${youtubeReadableDuration(region.start * 1000)} – ${youtubeReadableDuration(region.end * 1000)} (${region.duration.toFixed(2)}s)`}
        </Text>
        {onClose && <CloseButton size="sm" aria-label="Close timeline tag editor" onClick={onClose} />}
      </Group>

      <Stack gap={2} style={{ maxHeight: 180, overflowY: 'auto' }}>
        {tags.length === 0
          ? <Text size="sm" c="dimmed">No timeline tags yet</Text>
          : tags.filter((tag) => tag !== undefined).map((tag) => (
            <Button
              key={tag.id}
              size="compact-sm"
              justify="flex-start"
              variant={tag.id === region.tagId ? 'filled' : 'subtle'}
              color={tag.id === region.tagId ? undefined : 'gray'}
              onClick={() => onSelectTag(tag.id)}
              leftSection={<ColorSwatch size={10} color={tag.color} />}
            >
              <Text size="sm" truncate="end">{tag.name}</Text>
            </Button>
          ))}
      </Stack>

      <TagEditor createTagCallback={createTagCallback} tags={tags} />

      <Textarea
        label="Note"
        placeholder="Add a note"
        autosize
        minRows={2}
        maxRows={5}
        value={comment}
        onChange={(e) => {
          setComment(e.currentTarget.value);
          onCommentChange(e.currentTarget.value);
        }}
      />

      <Group justify="flex-end">
        <Tooltip label="Delete region">
          <Button
            size="compact-sm"
            color="red"
            variant="light"
            leftSection={<IconTrash size={14} />}
            onClick={onDelete}
          >
            Delete
          </Button>
        </Tooltip>
      </Group>
    </Stack>
  );
}
