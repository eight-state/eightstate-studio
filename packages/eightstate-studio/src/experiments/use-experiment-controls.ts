import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useStudioConfig } from '@eightstate/upstream-studio-config';
import { createExperimentApi } from './experiment-api';
import type { StartExperimentInput } from './experiment-api';

export function useExperimentControls() {
  const config = useStudioConfig();
  const queryClient = useQueryClient();
  const api = useMemo(
    () => createExperimentApi({ baseUrl: config.baseUrl, headers: config.headers }),
    [config.baseUrl, config.headers],
  );

  const invalidateExperimentQueries = (datasetId: string, experimentId?: string) => {
    void queryClient.invalidateQueries({ queryKey: ['dataset-experiments', datasetId] });
    void queryClient.invalidateQueries({ queryKey: ['experiments'] });
    if (experimentId) {
      void queryClient.invalidateQueries({ queryKey: ['dataset-experiment', datasetId, experimentId] });
      void queryClient.invalidateQueries({ queryKey: ['experiment-results', experimentId] });
    }
  };

  const start = useMutation({
    mutationFn: (input: StartExperimentInput) => api.start(input),
    onSuccess: (result, input) => invalidateExperimentQueries(input.datasetId, result.experimentId),
  });

  const cancel = useMutation({
    mutationFn: ({ datasetId, experimentId }: { datasetId: string; experimentId: string }) =>
      api.cancel(datasetId, experimentId),
    onSuccess: (_, input) => invalidateExperimentQueries(input.datasetId, input.experimentId),
  });

  const rerun = useMutation({
    mutationFn: ({ datasetId, experimentId }: { datasetId: string; experimentId: string }) =>
      api.rerun(datasetId, experimentId),
    onSuccess: (result, input) => invalidateExperimentQueries(input.datasetId, result.experimentId),
  });

  return { start, cancel, rerun };
}
