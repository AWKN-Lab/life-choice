import { AtomTool, ToolCombo, ToolExecutionResult } from './types';

export class ToolRegistry {
  private tools = new Map<string, AtomTool>();
  private combos = new Map<string, ToolCombo>();

  register(tool: AtomTool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`[ToolRegistry] tool already registered: ${tool.name}`);
    }
    this.tools.set(tool.name, tool);
  }

  registerCombo(combo: ToolCombo): void {
    if (this.combos.has(combo.name)) {
      throw new Error(`[ToolRegistry] combo already registered: ${combo.name}`);
    }
    for (const toolName of combo.toolNames) {
      if (!this.tools.has(toolName)) {
        throw new Error(`[ToolRegistry] combo "${combo.name}" references unregistered tool: ${toolName}`);
      }
    }
    this.combos.set(combo.name, combo);
  }

  get(name: string): AtomTool | undefined {
    return this.tools.get(name);
  }

  getCombo(name: string): ToolCombo | undefined {
    return this.combos.get(name);
  }

  getByCategory(category: string): AtomTool[] {
    const result: AtomTool[] = [];
    this.tools.forEach((tool) => {
      if (tool.category === category) {
        result.push(tool);
      }
    });
    return result;
  }

  listAll(): string[] {
    return Array.from(this.tools.keys());
  }

  listCombos(): string[] {
    return Array.from(this.combos.keys());
  }

  async execute<TInput, TOutput>(
    toolName: string,
    input: TInput,
  ): Promise<ToolExecutionResult<TOutput>> {
    const tool = this.tools.get(toolName) as AtomTool<TInput, TOutput> | undefined;
    if (!tool) {
      return {
        toolName,
        success: false,
        error: `tool not found: ${toolName}`,
        durationMs: 0,
      };
    }

    const start = Date.now();
    try {
      const output = await tool.execute(input);
      return {
        toolName,
        success: true,
        output,
        durationMs: Date.now() - start,
      };
    } catch (err) {
      return {
        toolName,
        success: false,
        error: (err as Error).message,
        durationMs: Date.now() - start,
      };
    }
  }

  async executeCombo(
    comboName: string,
    inputs: Record<string, any>,
  ): Promise<ToolExecutionResult[]> {
    const combo = this.combos.get(comboName);
    if (!combo) {
      return [{
        toolName: comboName,
        success: false,
        error: `combo not found: ${comboName}`,
        durationMs: 0,
      }];
    }

    const results: ToolExecutionResult[] = [];
    for (const toolName of combo.toolNames) {
      const input = inputs[toolName];
      const result = await this.execute(toolName, input);
      results.push(result);
    }
    return results;
  }
}

export const globalRegistry = new ToolRegistry();

export { AtomTool, ToolExecutionResult, ToolCombo } from './types';
