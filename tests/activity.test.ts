import { expect, test } from 'bun:test';
import { activityPresentation } from '../src/ui/activity';
import type { ThreadMessage, ToolCallMessagePart } from '@assistant-ui/react';

const tool = (toolCallId: string, toolName: string, result?: unknown): ToolCallMessagePart => ({ type: 'tool-call', toolCallId, toolName, args: {}, argsText: '{}', ...(result === undefined ? {} : { result }) });

test('one group keeps all steps and intermediate commentary while leaving the final answer visible', () => {
  const parts: ThreadMessage['content'] = [
    { type: 'text', text: 'Voy a revisar tus notas.' }, tool('a', 'read_file', { ok: true }),
    { type: 'text', text: 'Ahora preparo el registro.' }, tool('b', 'build_plugin', { ok: true }),
    { type: 'text', text: 'Ya puedes registrar una sesión.' },
  ];
  const presentation = activityPresentation(parts, { type: 'complete', reason: 'stop' });
  expect(presentation.activityIndices).toEqual([0, 1, 2, 3]);
  expect(presentation.answerIndices).toEqual([4]);
  expect(presentation.label).toContain('2 acciones');
  expect(presentation.running).toBe(false);
});

test('concurrent tools are counted and the active action drives the single live label', () => {
  const result = activityPresentation([tool('a', 'read_file'), tool('b', 'build_plugin')], { type: 'running' });
  expect(result.label).toBe('Preparando plugin · 2 acciones en curso');
  expect(result.running).toBe(true);
  expect(activityPresentation([tool('a', 'read_file', { ok: true })], { type: 'running' }).label).toBe('Pensando');
});

test('nested compilation failures and execution errors stay discoverable after a repair', () => {
  const result = activityPresentation([
    tool('a', 'build_plugin', { ok: true, result: { ok: false, errors: ['bad import'] } }),
    { ...tool('b', 'execute_obsidian'), isError: true }, tool('c', 'build_plugin', { ok: true }),
  ], { type: 'complete', reason: 'stop' });
  expect(result.failures).toBe(2);
  expect(result.label).toContain('2 incidencias');
  expect(result.activityIndices).toEqual([0, 1, 2]);
});

test('cancellation never leaves the summary shimmering or calls unfinished work complete', () => {
  const result = activityPresentation([tool('a', 'build_plugin')], { type: 'incomplete', reason: 'cancelled' });
  expect(result.running).toBe(false);
  expect(result.label).toContain('Detenido');
});
