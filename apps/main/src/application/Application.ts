import { bootstrap } from '../bootstrap/bootstrap.js';

export class Application {
  private started = false;

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;
    await bootstrap();
  }

  isRunning(): boolean {
    return this.started;
  }
}
