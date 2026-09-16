import { write } from "firebase-functions/logger";

type OperationalSeverity = "INFO" | "WARNING" | "ERROR" | "CRITICAL";

type OperationalLogInput = {
  severity: OperationalSeverity;
  message: string;
  eventType: string;
  data: Record<string, unknown>;
};

export function writeOperationalLog(input: OperationalLogInput): void {
  write({
    severity: input.severity,
    message: input.message,
    kgmMonitoring: {
      schemaVersion: 1,
      eventType: input.eventType,
      ...input.data,
    },
  });
}
