import { Button } from '@mastra/playground-ui/components/Button';
import { CodeEditor } from '@mastra/playground-ui/components/CodeEditor';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mastra/playground-ui/components/Dialog';
import { Label } from '@mastra/playground-ui/components/Label';
import { Spinner } from '@mastra/playground-ui/components/Spinner';
import { toast } from '@mastra/playground-ui/utils/toast';
import { useMemo, useRef, useState } from 'react';
import { DynamicForm } from '@/lib/form';
import { jsonSchemaToZodRuntime } from '@/lib/form/json-schema-to-zod-runtime';
import { ScorerSelector } from '@/domains/datasets/components/experiment-trigger/scorer-selector';
import { TargetSelector } from '@/domains/datasets/components/experiment-trigger/target-selector';
import type { ExperimentTargetType } from './experiment-api';
import { useExperimentControls } from './use-experiment-controls';

export interface ExperimentTriggerDialogProps {
  datasetId: string;
  version?: number;
  requestContextSchema?: Record<string, unknown>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (experimentId: string) => void;
}

export function ExperimentTriggerDialog({
  datasetId,
  version,
  requestContextSchema,
  open,
  onOpenChange,
  onSuccess,
}: ExperimentTriggerDialogProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [targetType, setTargetType] = useState<ExperimentTargetType | ''>('');
  const [targetId, setTargetId] = useState('');
  const [selectedScorers, setSelectedScorers] = useState<string[]>([]);
  const [requestContextValues, setRequestContextValues] = useState<Record<string, unknown>>({});
  const [requestContextRaw, setRequestContextRaw] = useState('');
  const { start } = useExperimentControls();

  const hasSchema = Boolean(requestContextSchema && Object.keys(requestContextSchema).length > 0);
  const canRun = Boolean(targetType && targetId);

  const reset = () => {
    setTargetType('');
    setTargetId('');
    setSelectedScorers([]);
    setRequestContextValues({});
    setRequestContextRaw('');
  };

  const close = () => {
    if (start.isPending) return;
    onOpenChange(false);
    reset();
  };

  const run = async () => {
    if (!targetType || !targetId) return;
    try {
      const requestContext = resolveRequestContext({ hasSchema, requestContextValues, requestContextRaw });
      const result = await start.mutateAsync({
        datasetId,
        targetType,
        targetId,
        ...(selectedScorers.length > 0 ? { scorers: selectedScorers } : {}),
        ...(version ? { version } : {}),
        ...(requestContext ? { requestContext } : {}),
      });
      toast.success('Experiment started');
      onOpenChange(false);
      onSuccess?.(result.experimentId);
      reset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to start experiment');
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent ref={contentRef}>
        <DialogHeader>
          <DialogTitle>Run Experiment</DialogTitle>
          <DialogDescription>
            {version
              ? `Execute dataset version v${version} against a target.`
              : 'Execute all items in this dataset against an agent, workflow, or scorer.'}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="grid gap-6">
          <TargetSelector
            targetType={targetType}
            setTargetType={setTargetType}
            targetId={targetId}
            setTargetId={setTargetId}
            container={contentRef}
          />
          {targetType && targetType !== 'scorer' && (
            <ScorerSelector
              selectedScorers={selectedScorers}
              setSelectedScorers={setSelectedScorers}
              disabled={start.isPending}
              container={contentRef}
            />
          )}
          {hasSchema ? (
            <RequestContextForm requestContextSchema={requestContextSchema!} onChange={setRequestContextValues} />
          ) : (
            <div className="space-y-2">
              <Label>Request Context (JSON, optional)</Label>
              <CodeEditor
                value={requestContextRaw}
                onChange={setRequestContextRaw}
                showCopyButton={false}
                className="min-h-[80px]"
              />
            </div>
          )}
        </DialogBody>

        <DialogFooter className="px-6 pt-4">
          <Button onClick={close} disabled={start.isPending}>Cancel</Button>
          <Button data-testid="experiment-run" variant="primary" onClick={() => void run()} disabled={!canRun || start.isPending}>
            {start.isPending ? <><Spinner className="h-4 w-4" />Starting…</> : 'Run'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RequestContextForm({
  requestContextSchema,
  onChange,
}: {
  requestContextSchema: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
}) {
  const schema = useMemo(() => {
    try {
      return jsonSchemaToZodRuntime(requestContextSchema as Parameters<typeof jsonSchemaToZodRuntime>[0]);
    } catch {
      return null;
    }
  }, [requestContextSchema]);

  if (!schema) return <p className="text-destructive text-sm">Failed to parse request context schema</p>;
  return (
    <div className="space-y-2">
      <Label>Request Context</Label>
      <DynamicForm schema={schema} onValuesChange={onChange} className="[&_button[type=submit]]:hidden" />
    </div>
  );
}

function resolveRequestContext({
  hasSchema,
  requestContextValues,
  requestContextRaw,
}: {
  hasSchema: boolean;
  requestContextValues: Record<string, unknown>;
  requestContextRaw: string;
}): Record<string, unknown> | undefined {
  if (hasSchema) {
    const entries = Object.entries(requestContextValues).filter(([, value]) => value !== undefined && value !== '');
    return entries.length > 0 ? Object.fromEntries(entries) : undefined;
  }
  if (!requestContextRaw.trim()) return undefined;

  const parsed: unknown = JSON.parse(requestContextRaw);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Request Context must be a JSON object');
  }
  return parsed as Record<string, unknown>;
}
