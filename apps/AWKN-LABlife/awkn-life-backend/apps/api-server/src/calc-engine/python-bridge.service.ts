import { Injectable, Logger } from '@nestjs/common';

const PYTHON_SERVICE_URL = process.env.DIVINATION_SERVICE_URL || 'http://127.0.0.1:5001';

interface DivinationRequest<T = Record<string, unknown>> {
  path: string;
  body: T;
}

@Injectable()
export class PythonBridgeService {
  private readonly logger = new Logger(PythonBridgeService.name);

  async callDivinationService<TReq, TRes>(req: DivinationRequest<TReq>): Promise<TRes> {
    const url = `${PYTHON_SERVICE_URL}${req.path}`;
    this.logger.log(`[PythonBridge] Calling ${req.path}`);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        const text = await response.text();
        let detail = text;
        try {
          const json = JSON.parse(text);
          detail = json.detail || text;
        } catch { /* ignore */ }
        this.logger.error(`[PythonBridge] Error ${response.status}: ${detail}`);
        throw new Error(`Divination service error (${response.status}): ${detail}`);
      }

      const json = await response.json() as { data: TRes; error: string | null };
      if (json.error) {
        this.logger.error(`[PythonBridge] Service returned error: ${json.error}`);
        throw new Error(`Divination service error: ${json.error}`);
      }

      this.logger.log(`[PythonBridge] ${req.path} completed successfully`);
      return json.data;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        this.logger.error(`[PythonBridge] Cannot connect to Python service at ${PYTHON_SERVICE_URL}`);
        throw new Error(`Python divination service unavailable at ${PYTHON_SERVICE_URL}`);
      }
      throw error;
    }
  }

  async healthCheck(): Promise<{ status: string; service: string }> {
    try {
      const response = await fetch(`${PYTHON_SERVICE_URL}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      return await response.json() as { status: string; service: string };
    } catch {
      return { status: 'unavailable', service: 'divination-engine' };
    }
  }
}
