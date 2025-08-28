import { OrganizationRepository } from "@/lib/repositories/organization.repository";
import { PromptRepository } from "@/lib/repositories/prompt.repository";

export class PromptService {
  constructor(
    private promptRepo: PromptRepository,
    private orgRepo: OrganizationRepository
  ) {}

  async getOrganizationPrompts(organizationId: string) {
    return await this.promptRepo.getOrganizationPrompts(organizationId);
  }

  async getDefaultPrompts() {
    return await this.promptRepo.getDefaultPrompts();
  }

  async getMcpServers() {
    return await this.promptRepo.getMcpServers();
  }

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

  async deletePrompt(promptId: string) {
    return await this.promptRepo.deletePrompt(promptId);
  }
}
