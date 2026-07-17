export interface AtomTool<TInput = any, TOutput = any> {
  name: string;
  description: string;
  category: 'bazi' | 'ziwei' | 'decision';
  execute(input: TInput): Promise<TOutput>;
  toPromptOutput(output: TOutput): string;
}

export interface ToolExecutionResult<TOutput = any> {
  toolName: string;
  success: boolean;
  output?: TOutput;
  error?: string;
  durationMs: number;
}

export interface ToolCombo {
  name: string;
  description: string;
  category: string;
  toolNames: string[];
}
