import type { ThreadMessage, MessageStatus } from '@assistant-ui/react';

export const activityLabels: Record<string, string> = {
  inspect_environment: 'Revisando tu espacio', lookup_reference: 'Consultando guías',
  list_files: 'Explorando tus notas', read_file: 'Leyendo una nota', write_file: 'Guardando cambios',
  execute_obsidian: 'Aplicando y comprobando cambios', read_project: 'Revisando el plugin', build_plugin: 'Preparando plugin',
};

export function failedResult(value: unknown): boolean {
  return !!value && typeof value === 'object' && (('ok' in value && value.ok === false) || ('result' in value && failedResult(value.result)));
}

/** Keep the whole tool workflow together, including commentary between steps. */
export function activityPresentation(content: ThreadMessage['content'], status: MessageStatus) {
  const lastAction = content.flatMap((part, index) => part.type === 'tool-call' || part.type === 'reasoning' ? [index] : []).at(-1) ?? -1;
  const tools = content.filter((part) => part.type === 'tool-call');
  const pending = tools.filter((part) => part.result === undefined && !part.isError);
  const failures = tools.filter((part) => part.isError || failedResult(part.result)).length;
  const running = status.type === 'running';
  const latest = pending.at(-1);
  const finished = status.type === 'incomplete' ? (status.reason === 'cancelled' ? 'Detenido' : 'Proceso interrumpido') : 'Proceso finalizado';
  const label = running
    ? latest ? `${activityLabels[latest.toolName] ?? 'Realizando una acción'}${pending.length > 1 ? ` · ${pending.length} acciones en curso` : ''}` : 'Pensando'
    : `${finished}${tools.length ? ` · ${tools.length} ${tools.length === 1 ? 'acción' : 'acciones'}` : ''}${failures ? ` · ${failures} ${failures === 1 ? 'incidencia' : 'incidencias'}` : ''}`;
  return {
    running, label, failures,
    hasActivity: lastAction >= 0 || running,
    activityIndices: content.flatMap((part, index) => index <= lastAction && part.type !== 'reasoning' ? [index] : []),
    answerIndices: content.flatMap((_part, index) => index > lastAction ? [index] : []),
  };
}
