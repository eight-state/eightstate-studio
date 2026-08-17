import { Button } from '@mastra/playground-ui/components/Button';
import { toast } from '@mastra/playground-ui/utils/toast';
import { RotateCcw, Square } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useDatasetExperiment } from '@/domains/datasets/hooks/use-dataset-experiments';
import { useExperimentControls } from './use-experiment-controls';

export function ExperimentActions({
  datasetId,
  experimentId,
  status,
}: {
  datasetId: string;
  experimentId: string;
  status: string;
}) {
  const navigate = useNavigate();
  const controls = useExperimentControls();
  const { data: experiment } = useDatasetExperiment(datasetId, experimentId);
  const isActive = status === 'pending' || status === 'running';
  const canCancel = isActive && experiment?.targetType === 'agent';

  const cancel = async () => {
    try {
      await controls.cancel.mutateAsync({ datasetId, experimentId });
      toast.success('Experiment cancellation requested');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to cancel experiment');
    }
  };

  const rerun = async () => {
    try {
      const result = await controls.rerun.mutateAsync({ datasetId, experimentId });
      toast.success('Experiment rerun started');
      void navigate(`/datasets/${datasetId}/experiments/${result.experimentId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to rerun experiment');
    }
  };

  return (
    <div className="mb-4 flex justify-end gap-2" aria-label="Experiment actions">
      {canCancel && (
        <Button data-testid="experiment-cancel" onClick={() => void cancel()} disabled={controls.cancel.isPending}>
          <Square />
          {controls.cancel.isPending ? 'Cancelling…' : 'Cancel run'}
        </Button>
      )}
      {isActive && experiment && experiment.targetType !== 'agent' && (
        <p className="text-ui-sm text-neutral3">Cancellation is only available for agent experiments.</p>
      )}
      {!isActive && (
        <Button data-testid="experiment-rerun" variant="primary" onClick={() => void rerun()} disabled={controls.rerun.isPending}>
          <RotateCcw />
          {controls.rerun.isPending ? 'Starting…' : 'Rerun experiment'}
        </Button>
      )}
    </div>
  );
}
