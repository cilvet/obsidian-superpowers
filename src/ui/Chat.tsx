import { useEffect, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { useAISDKRuntime } from '@assistant-ui/react-ai-sdk';
import { AssistantRuntimeProvider, ThreadPrimitive, MessagePrimitive, ComposerPrimitive, AuiIf, useAui, useAuiState } from '@assistant-ui/react';
import type { ToolCallMessagePartComponent } from '@assistant-ui/react';
import { MarkdownTextPrimitive } from '@assistant-ui/react-markdown';
import type { ChatSession } from '../adapters/ai/session';
import { Icon } from './Icon';
import { ActivityGroup } from './ActivityGroup';
import { activityLabels, activityPresentation, failedResult } from './activity';

const ToolActivity: ToolCallMessagePartComponent<unknown, unknown> = ({ toolName, args, result, status, isError }) => {
  const failed = isError || failedResult(result);
  const pending = result === undefined && !failed;
  const stopped = status.type === 'incomplete';
  return <details className="sp-tool" data-status={failed ? 'failed' : status.type}>
    <summary><Icon name={failed ? 'circle-alert' : pending ? (stopped ? 'square' : 'loader-circle') : 'check'} />{activityLabels[toolName] ?? 'Realizando una acción'}<span className="sp-tool-status">{failed ? 'Error' : pending ? stopped ? 'Detenido' : 'En curso' : 'Listo'}</span></summary>
    <pre>{JSON.stringify({ input: args, result }, null, 2)}</pre>
  </details>;
};

function MarkdownText() { return <MarkdownTextPrimitive />; }

function AssistantMessage() {
  const message = useAuiState((state) => state.message);
  const activity = activityPresentation(message.content, message.status ?? { type: 'complete', reason: 'unknown' });
  const components = { Text: MarkdownText, tools: { Fallback: ToolActivity } };
  return <MessagePrimitive.Root className="sp-message sp-assistant"><div className="sp-author"><Icon name="sparkles" /> Superpowers</div>
    {activity.hasActivity && <ActivityGroup label={activity.label} running={activity.running}>
      {activity.activityIndices.length ? activity.activityIndices.map((index) => <MessagePrimitive.PartByIndex key={index} index={index} components={components} />) : undefined}
    </ActivityGroup>}
    {activity.answerIndices.map((index) => <MessagePrimitive.PartByIndex key={index} index={index} components={components} />)}
  </MessagePrimitive.Root>;
}

function UserMessage() {
  return <MessagePrimitive.Root className="sp-message sp-user"><MessagePrimitive.Parts components={{ Text: MarkdownText }} /></MessagePrimitive.Root>;
}

function Dictation({ transcribe }: { transcribe: (blob: Blob, signal: AbortSignal) => Promise<string> }) {
  const aui = useAui();
  const [state, setState] = useState<'idle' | 'recording' | 'transcribing'>('idle');
  const [error, setError] = useState('');
  const recorder = useRef<MediaRecorder | null>(null);
  const controller = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  useEffect(() => () => {
    mounted.current = false;
    controller.current?.abort();
    if (recorder.current?.state === 'recording') recorder.current.stop();
    recorder.current?.stream.getTracks().forEach((track) => track.stop());
  }, []);

  async function record() {
    if (state === 'recording') { recorder.current?.stop(); return; }
    setError('');
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') throw new Error('La grabación no está disponible en este dispositivo. Puedes usar el dictado del teclado.');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) { stream.getTracks().forEach((track) => track.stop()); return; }
      const mimeType = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find((mime) => MediaRecorder.isTypeSupported(mime));
      const current = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorder.current = current;
      const chunks: Blob[] = [];
      current.ondataavailable = ({ data }) => { if (data.size) chunks.push(data); };
      current.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        if (!mounted.current) return;
        setState('transcribing');
        const request = new AbortController();
        controller.current = request;
        try {
          const text = await transcribe(new Blob(chunks, { type: current.mimeType }), request.signal);
          if (mounted.current) aui.composer.setText(text);
        } catch (failure) {
          if (mounted.current) setError(failure instanceof Error ? failure.message : String(failure));
        } finally { if (mounted.current) setState('idle'); }
      };
      current.start();
      setState('recording');
    } catch (failure) { setError(failure instanceof Error ? failure.message : String(failure)); setState('idle'); }
  }

  return <><button type="button" className="sp-icon-button" disabled={state === 'transcribing'} aria-label={state === 'recording' ? 'Terminar dictado' : state === 'transcribing' ? 'Transcribiendo dictado' : 'Dictar mensaje'} onClick={() => void record()}><Icon name={state === 'recording' ? 'square' : state === 'transcribing' ? 'loader-circle' : 'mic'} /></button>{error && <span className="sp-error" role="alert">{error}</span>}</>;
}

type Props = {
  session: ChatSession;
  modelLabel: string;
  openSettings: () => void;
  transcribe: (audio: Blob, signal: AbortSignal) => Promise<string>;
};

export function ChatView({ session, modelLabel, openSettings, transcribe }: Props) {
  const chat = useChat({ chat: session.chat });
  const runtime = useAISDKRuntime(chat);
  useEffect(() => { session.scheduleSave(); }, [session, chat.messages]);
  useEffect(() => () => { void session.stop(); }, [session]);
  const running = chat.status === 'submitted' || chat.status === 'streaming';
  return <AssistantRuntimeProvider runtime={runtime}>
    <ThreadPrimitive.Root className="sp-chat">
      <header className="sp-header"><span className="sp-brand"><Icon name="sparkles" /> Superpowers</span><div className="sp-header-actions"><button type="button" onClick={() => void session.clear()} disabled={running} aria-label="Nueva conversación"><Icon name="plus" /></button><button type="button" onClick={openSettings} aria-label="Ajustes de Superpowers"><Icon name="settings" /></button></div></header>
      <ThreadPrimitive.Viewport className="sp-viewport">
        <AuiIf condition={(state) => state.thread.isEmpty}><section className="sp-welcome"><span className="sp-mark"><Icon name="sparkles" /></span><h2>Tu Obsidian.<br />Tus superpoderes.</h2><p>Describe qué necesitas. Puedo trabajar con tus notas y construir nuevas funcionalidades para ti.</p><div className="sp-examples"><button onClick={() => void chat.sendMessage({ text: 'Explora mi vault y dime qué estructuras y herramientas tengo disponibles.' })}>Explorar mi vault <Icon name="arrow-up-right" /></button><button onClick={() => void chat.sendMessage({ text: 'Quiero crear una nueva funcionalidad para Obsidian. Ayúdame a concretarla.' })}>Construir algo nuevo <Icon name="arrow-up-right" /></button></div></section></AuiIf>
        <ThreadPrimitive.Messages>{({ message }) => message.role === 'user' ? <UserMessage /> : message.role === 'assistant' ? <AssistantMessage /> : null}</ThreadPrimitive.Messages>
      </ThreadPrimitive.Viewport>
      <footer className="sp-footer">
        {chat.error && <div className="sp-error" role="alert">{chat.error.message}<button type="button" onClick={() => chat.clearError()}>Cerrar</button></div>}
        <ComposerPrimitive.Root className="sp-composer"><ComposerPrimitive.Input className="sp-input" placeholder="¿Qué quieres que haga Obsidian?" aria-label="Mensaje para Superpowers" /><div className="sp-composer-actions"><Dictation transcribe={transcribe} /><button type="button" className="sp-model" onClick={openSettings}>{modelLabel}</button>{running ? <ComposerPrimitive.Cancel className="sp-send" aria-label="Detener agente"><Icon name="square" /></ComposerPrimitive.Cancel> : <ComposerPrimitive.Send className="sp-send" aria-label="Enviar mensaje"><Icon name="arrow-up" /></ComposerPrimitive.Send>}</div></ComposerPrimitive.Root>
        <p className="sp-caption">En tu vault · Con tu API key</p>
      </footer>
    </ThreadPrimitive.Root>
  </AssistantRuntimeProvider>;
}
