import { OrganizationJSON } from "@clerk/nextjs/server";
import { OrganizationRepository } from "@/lib/repositories/organization.repository";
import { UserRepository } from "@/lib/repositories/user.repository";

export class OrganizationService {
  constructor(
    private orgRepo: OrganizationRepository,
    private userRepo: UserRepository
  ) {}

  async getOrganizationByClerkId(clerkId: string) {
    return await this.orgRepo.findByClerkId(clerkId);
  }

  async getOrganizationById(organizationId: string) {
    return await this.orgRepo.findById(organizationId);
  }

  async getOrganizationMembers(organizationId: string) {
    return await this.orgRepo.getMembers(organizationId);
  }

  async handleOrganizationUpsert(orgData: OrganizationJSON) {
    await this.orgRepo.upsertOrganization(orgData);
  }

  async handleOrganizationDeletion(clerkId: string) {
    await this.orgRepo.softDeleteOrganization(clerkId);
  }
}
