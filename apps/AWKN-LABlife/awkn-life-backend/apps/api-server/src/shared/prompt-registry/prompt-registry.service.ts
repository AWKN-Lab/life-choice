import { Injectable, Logger } from '@nestjs/common';

export interface PromptVersion {
  version: string;
  label: string;
  description: string;
  isDefault: boolean;
}

@Injectable()
export class PromptRegistryService {
  private readonly logger = new Logger(PromptRegistryService.name);
  private readonly defaultVersion: string;

  constructor() {
    this.defaultVersion = process.env.LLM_PROMPT_VERSION || 'v1';
    this.logger.log(`PromptRegistry initialized | defaultVersion=${this.defaultVersion}`);
  }

  resolveVersion(requestedVersion?: string): string {
    if (requestedVersion && this.isValidVersion(requestedVersion)) {
      return requestedVersion;
    }
    return this.defaultVersion;
  }

  getDefaultVersion(): string {
    return this.defaultVersion;
  }

  getAvailableVersions(): PromptVersion[] {
    return [
      {
        version: 'v1',
        label: '稳定版 (v1)',
        description: '当前线上版本，经过充分验证',
        isDefault: this.defaultVersion === 'v1',
      },
      {
        version: 'v2',
        label: '增强版 (v2)',
        description: '优化后的Prompt，包含few-shot示例和自然叙述增强',
        isDefault: this.defaultVersion === 'v2',
      },
    ];
  }

  private isValidVersion(version: string): boolean {
    return this.getAvailableVersions().some((v) => v.version === version);
  }
}