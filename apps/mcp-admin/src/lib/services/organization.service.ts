import { OrganizationJSON } from "@clerk/nextjs/server";
import { OrganizationRepository } from "@/lib/repositories/organization.repository";
import { UserRepository } from "@/lib/repositories/user.repository";

export class OrganizationService {
  constructor(
    private orgRepo: OrganizationRepository,
    private userRepo: UserRepository
  ) {}

  /**
   * Get organization by Clerk ID
   */
  async getOrganizationByClerkId(clerkId: string) {
    return await this.orgRepo.findByClerkId(clerkId);
  }

  /**
   * Get organization by database ID
   */
  async getOrganizationById(organizationId: string) {
    return await this.orgRepo.findById(organizationId);
  }

  /**
   * Get organization members
   */
  async getOrganizationMembers(organizationId: string) {
    return await this.orgRepo.getMembers(organizationId);
  }

  /**
   * Handle organization creation from Clerk webhook
   */
  async handleOrganizationUpsert(orgData: OrganizationJSON) {
    await this.orgRepo.upsertOrganization(orgData);
  }

  /**
   * Handle organization deletion from Clerk webhook
   */
  async handleOrganizationDeletion(clerkId: string) {
    await this.orgRepo.softDeleteOrganization(clerkId);
  }
}
