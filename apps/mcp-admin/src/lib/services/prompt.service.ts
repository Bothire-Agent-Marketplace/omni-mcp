import { OrganizationRepository } from "@/lib/repositories/organization.repository";
import { PromptRepository } from "@/lib/repositories/prompt.repository";

export class PromptService {
  constructor(
    private promptRepo: PromptRepository,
    private orgRepo: OrganizationRepository
  ) {}

  /**
   * Get organization prompts with their MCP server info
   */
  async getOrganizationPrompts(organizationId: string) {
    return await this.promptRepo.getOrganizationPrompts(organizationId);
  }

  /**
   * Get default prompts for reference
   */
  async getDefaultPrompts() {
    return await this.promptRepo.getDefaultPrompts();
  }

  /**
   * Get all MCP servers for dropdown options
   */
  async getMcpServers() {
    return await this.promptRepo.getMcpServers();
  }

  /**
   * Get prompts data for a page (organization + defaults + servers)
   */
  async getPromptsPageData(organizationId: string) {
    const [prompts, defaultPrompts, mcpServers] = await Promise.all([
      this.promptRepo.getOrganizationPrompts(organizationId),
      this.promptRepo.getDefaultPrompts(),
      this.promptRepo.getMcpServers(),
    ]);

    return {
      prompts,
      defaultPrompts,
      mcpServers,
    };
  }

  /**
   * Create organization prompt
   */
  async createPrompt(data: {
    organizationId: string;
    mcpServerId: string;
    name: string;
    description: string;
    template:
      | Record<string, unknown>
      | Array<{ role: "user" | "system" | "assistant"; content: string }>;
    arguments: Record<string, unknown>;
    createdBy?: string;
  }) {
    return await this.promptRepo.createPrompt(data);
  }

  /**
   * Update organization prompt
   */
  async updatePrompt(
    promptId: string,
    data: {
      name?: string;
      description?: string;
      template?:
        | Record<string, unknown>
        | Array<{ role: "user" | "system" | "assistant"; content: string }>;
      arguments?: Record<string, unknown>;
      isActive?: boolean;
    }
  ) {
    return await this.promptRepo.updatePrompt(promptId, data);
  }

  /**
   * Delete organization prompt (soft delete)
   */
  async deletePrompt(promptId: string) {
    return await this.promptRepo.deletePrompt(promptId);
  }
}
