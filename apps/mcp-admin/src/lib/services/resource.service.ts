import { OrganizationRepository } from "@/lib/repositories/organization.repository";
import { ResourceRepository } from "@/lib/repositories/resource.repository";

export class ResourceService {
  constructor(
    private resourceRepo: ResourceRepository,
    private orgRepo: OrganizationRepository
  ) {}

  /**
   * Get organization resources with their MCP server info
   */
  async getOrganizationResources(organizationId: string) {
    return await this.resourceRepo.getOrganizationResources(organizationId);
  }

  /**
   * Get default resources for reference
   */
  async getDefaultResources() {
    return await this.resourceRepo.getDefaultResources();
  }

  /**
   * Get all MCP servers for dropdown options
   */
  async getMcpServers() {
    return await this.resourceRepo.getMcpServers();
  }

  /**
   * Get resources data for a page (organization + defaults + servers)
   */
  async getResourcesPageData(organizationId: string) {
    const [resources, defaultResources, mcpServers] = await Promise.all([
      this.resourceRepo.getOrganizationResources(organizationId),
      this.resourceRepo.getDefaultResources(),
      this.resourceRepo.getMcpServers(),
    ]);

    return {
      resources,
      defaultResources,
      mcpServers,
    };
  }

  /**
   * Create organization resource
   */
  async createResource(data: {
    organizationId: string;
    mcpServerId: string;
    uri: string;
    name: string;
    description: string;
    mimeType?: string;
    metadata?: Record<string, unknown>;
    createdBy?: string;
  }) {
    return await this.resourceRepo.createResource(data);
  }

  /**
   * Update organization resource
   */
  async updateResource(
    resourceId: string,
    data: {
      uri?: string;
      name?: string;
      description?: string;
      mimeType?: string;
      metadata?: Record<string, unknown>;
      isActive?: boolean;
    }
  ) {
    return await this.resourceRepo.updateResource(resourceId, data);
  }

  /**
   * Delete organization resource (soft delete)
   */
  async deleteResource(resourceId: string) {
    return await this.resourceRepo.deleteResource(resourceId);
  }
}
