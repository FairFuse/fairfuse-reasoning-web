import { MantineProvider } from '@mantine/core';
import {
  cleanup, fireEvent, render, screen,
} from '@testing-library/react';
import {
  afterAll, afterEach, beforeAll, describe, expect, test, vi,
} from 'vitest';
import { TimelineTagEditor } from '../TimelineTagEditor';
import { Tag, TimelineTagRegion } from '../../types';

class ResizeObserverMock {
  observe() {}

  unobserve() {}

  disconnect() {}
}

beforeAll(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverMock);
  // Mantine's autosize Textarea subscribes to document.fonts, which jsdom omits.
  Object.defineProperty(document, 'fonts', {
    configurable: true,
    value: { addEventListener: vi.fn(), removeEventListener: vi.fn() },
  });
  vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })));
});

afterEach(() => {
  cleanup();
});

afterAll(() => {
  vi.unstubAllGlobals();
});

const tags: Tag[] = [
  { id: 'tl-1', name: 'Confusion', color: '#fa5252' },
  { id: 'tl-2', name: 'Insight', color: '#40c057' },
];

const region: TimelineTagRegion = {
  id: 'r-1', tagId: 'tl-1', start: 5, duration: 10, end: 15, comment: 'existing note',
};

function renderEditor(overrides: Partial<Parameters<typeof TimelineTagEditor>[0]> = {}) {
  const props = {
    tags,
    region,
    onSelectTag: vi.fn(),
    onCommentChange: vi.fn(),
    onDelete: vi.fn(),
    createTagCallback: vi.fn(),
    ...overrides,
  };

  render(
    <MantineProvider>
      <TimelineTagEditor {...props} />
    </MantineProvider>,
  );

  return props;
}

describe('TimelineTagEditor', () => {
  test('lists the available timeline tags', () => {
    renderEditor();

    expect(screen.getByText('Confusion')).toBeDefined();
    expect(screen.getByText('Insight')).toBeDefined();
  });

  test('shows the bounds and duration of the region', () => {
    renderEditor();

    expect(screen.getByText(/0:05/)).toBeDefined();
    expect(screen.getByText(/0:15/)).toBeDefined();
    expect(screen.getByText(/10\.00s/)).toBeDefined();
  });

  test('reports the tag chosen by the user', () => {
    const { onSelectTag } = renderEditor();

    fireEvent.click(screen.getByText('Insight'));

    expect(onSelectTag).toHaveBeenCalledWith('tl-2');
  });

  test('shows the existing note and reports edits', () => {
    const { onCommentChange } = renderEditor();

    const textarea = screen.getByPlaceholderText('Add a note') as HTMLTextAreaElement;
    expect(textarea.value).toBe('existing note');

    fireEvent.change(textarea, { target: { value: 'updated note' } });

    expect(onCommentChange).toHaveBeenCalledWith('updated note');
  });

  test('reports a delete', () => {
    const { onDelete } = renderEditor();

    fireEvent.click(screen.getByText('Delete'));

    expect(onDelete).toHaveBeenCalled();
  });

  test('tells the user when no timeline tags exist yet', () => {
    renderEditor({ tags: [] });

    expect(screen.getByText('No timeline tags yet')).toBeDefined();
  });

  test('still offers tag creation when the vocabulary is empty', () => {
    renderEditor({ tags: [] });

    expect(screen.getByText('Create new tag')).toBeDefined();
  });
});
