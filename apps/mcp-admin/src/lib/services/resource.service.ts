import { OrganizationRepository } from "@/lib/repositories/organization.repository";
import { ResourceRepository } from "@/lib/repositories/resource.repository";

export class ResourceService {
  constructor(
    private resourceRepo: ResourceRepository,
    private orgRepo: OrganizationRepository
  ) {}

  async getOrganizationResources(organizationId: string) {
    return await this.resourceRepo.getOrganizationResources(organizationId);
  }

  async getDefaultResources() {
    return await this.resourceRepo.getDefaultResources();
  }

  async getMcpServers() {
    return await this.resourceRepo.getMcpServers();
  }

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

  async deleteResource(resourceId: string) {
    return await this.resourceRepo.deleteResource(resourceId);
  }
}
