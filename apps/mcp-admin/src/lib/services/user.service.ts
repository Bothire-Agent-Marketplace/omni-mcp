import type { UserJSON } from "@clerk/nextjs/server";
import { OrganizationRepository } from "@/lib/repositories/organization.repository";
import { UserRepository } from "@/lib/repositories/user.repository";

export class UserService {
  constructor(
    private userRepo: UserRepository,
    private orgRepo: OrganizationRepository
  ) {}

  /**
   * Get user with their organizations by Clerk ID
   * This is the main method used by the app pages
   */
  async getUserWithOrganizations(clerkId: string) {
    // First find the user by Clerk ID
    const user = await this.userRepo.findByClerkId(clerkId);
    if (!user) {
      return null;
    }

    // Get their organization memberships
    const memberships = await this.userRepo.getUserOrganizations(user.id);

    return {
      user,
      memberships,
    };
  }

  /**
   * Get user by database ID
   */
  async getUserById(userId: string) {
    return await this.userRepo.findById(userId);
  }

  /**
   * Get user by Clerk ID
   */
  async getUserByClerkId(clerkId: string) {
    return await this.userRepo.findByClerkId(clerkId);
  }

  /**
   * Handle user creation/update from Clerk webhook
   */
  async handleUserUpsert(userData: UserJSON) {
    await this.userRepo.upsertUser(userData);
  }

  /**
   * Handle user deletion from Clerk webhook
   */
  async handleUserDeletion(clerkId: string) {
    const user = await this.userRepo.findByClerkId(clerkId);
    if (user) {
      await this.userRepo.softDeleteUser(clerkId);
    }
  }

  /**
   * Create a user record directly (used for webhook race conditions)
   */
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
