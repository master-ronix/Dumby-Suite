export interface JobPayload {
  [key: string]: unknown;
}

export abstract class BaseProcessor<TPayload extends JobPayload = JobPayload> {
  abstract process(job: { data: TPayload; id?: string }): Promise<void>;
}

export abstract class BaseTask {
  abstract execute(): Promise<void>;
  abstract cron: string;
  abstract name: string;
}
