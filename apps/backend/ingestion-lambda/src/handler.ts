import type { ScheduledEvent } from 'aws-lambda';

export const handler = async (event: ScheduledEvent): Promise<void> => {
  console.log(`Ingestion lambda triggered at ${event.time}`, event);
};
