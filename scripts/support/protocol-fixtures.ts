export type Reply = { tool: string; input: unknown } | { text: string };

/** Provider-shaped recorded responses for transport/tool-loop tests, not model-quality evals. */
export function openaiEvents(reply: Reply) {
  const id = crypto.randomUUID();
  const events: unknown[] = [{ type: 'response.created', response: { id: `resp_${id}`, created_at: 1, model: 'fixture' } }];
  if ('tool' in reply) {
    const item = { type: 'function_call', id: `fc_${id}`, call_id: `call_${id}`, name: reply.tool, arguments: JSON.stringify(reply.input), status: 'completed' };
    events.push(
      { type: 'response.output_item.added', output_index: 0, item: { ...item, arguments: '' } },
      { type: 'response.function_call_arguments.delta', output_index: 0, item_id: item.id, delta: item.arguments },
      { type: 'response.function_call_arguments.done', output_index: 0, item_id: item.id, arguments: item.arguments },
      { type: 'response.output_item.done', output_index: 0, item },
    );
  } else {
    const item = { type: 'message', id: `msg_${id}`, role: 'assistant', status: 'completed', content: [{ type: 'output_text', text: reply.text, annotations: [] }] };
    events.push(
      { type: 'response.output_item.added', output_index: 0, item: { ...item, content: [] } },
      { type: 'response.output_text.delta', output_index: 0, item_id: item.id, delta: reply.text },
      { type: 'response.output_item.done', output_index: 0, item },
    );
  }
  events.push({ type: 'response.completed', response: { usage: { input_tokens: 20, output_tokens: 10, total_tokens: 30 } } });
  return events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join('');
}

export function anthropicEvents(reply: Reply) {
  const events: Array<{ type: string; [key: string]: unknown }> = [
    { type: 'message_start', message: { id: crypto.randomUUID(), type: 'message', role: 'assistant', model: 'fixture', content: [], usage: { input_tokens: 20, output_tokens: 0 } } },
  ];
  if ('tool' in reply) events.push(
    { type: 'content_block_start', index: 0, content_block: { type: 'tool_use', id: crypto.randomUUID(), name: reply.tool, input: {} } },
    { type: 'content_block_delta', index: 0, delta: { type: 'input_json_delta', partial_json: JSON.stringify(reply.input) } },
  );
  else events.push(
    { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
    { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: reply.text } },
  );
  events.push(
    { type: 'content_block_stop', index: 0 },
    { type: 'message_delta', delta: { stop_reason: 'tool' in reply ? 'tool_use' : 'end_turn', stop_sequence: null }, usage: { output_tokens: 10 } },
    { type: 'message_stop' },
  );
  return events.map((event) => `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`).join('');
}

export function googleEvents(reply: Reply) {
  const part = 'tool' in reply ? { functionCall: { name: reply.tool, args: reply.input } } : { text: reply.text };
  return `data: ${JSON.stringify({ candidates: [{ content: { role: 'model', parts: [part] }, finishReason: 'STOP', index: 0 }], usageMetadata: { promptTokenCount: 20, candidatesTokenCount: 10, totalTokenCount: 30 } })}\n\n`;
}
