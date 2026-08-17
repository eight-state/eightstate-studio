import { renderStartupError } from '@eightstate/upstream-startup-error';

try {
  const { startStudio } = await import('./main');
  startStudio();
} catch (error) {
  console.error('EightState Studio failed to start', error);
  renderStartupError(error);
}
