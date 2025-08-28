import type { UserJSON } from "@clerk/nextjs/server";
import { OrganizationRepository } from "@/lib/repositories/organization.repository";
import { UserRepository } from "@/lib/repositories/user.repository";

export class UserService {
  constructor(
    private userRepo: UserRepository,
    private orgRepo: OrganizationRepository
  ) {}

  async getUserWithOrganizations(clerkId: string) {
    const user = await this.userRepo.findByClerkId(clerkId);
    if (!user) {
      return null;
    }

    const memberships = await this.userRepo.getUserOrganizations(user.id);

    return {
      user,
      memberships,
    };
  }

  async getUserById(userId: string) {
    return await this.userRepo.findById(userId);
  }

  async getUserByClerkId(clerkId: string) {
    return await this.userRepo.findByClerkId(clerkId);
  }

  async handleUserUpsert(userData: UserJSON) {
    await this.userRepo.upsertUser(userData);
  }

  async handleUserDeletion(clerkId: string) {
    const user = await this.userRepo.findByClerkId(clerkId);
    if (user) {
      await this.userRepo.softDeleteUser(clerkId);
    }
  }

  async createUserFromMembership(userData: {
    clerkId: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    imageUrl?: string | null;
  }) {
    return await this.userRepo.createUser(userData);
  }
}
