import type { ComponentProps } from 'react';
import { ExperimentPageTabs as UpstreamExperimentPageTabs } from '@eightstate/upstream-experiment-page-tabs';
import { ExperimentActions } from './experiment-actions';

type ExperimentPageTabsProps = ComponentProps<typeof UpstreamExperimentPageTabs>;

export function ExperimentPageTabs(props: ExperimentPageTabsProps) {
  return (
    <>
      <ExperimentActions
        datasetId={props.datasetId}
        experimentId={props.experimentId}
        status={props.experimentStatus}
      />
      <UpstreamExperimentPageTabs {...props} />
    </>
  );
}
