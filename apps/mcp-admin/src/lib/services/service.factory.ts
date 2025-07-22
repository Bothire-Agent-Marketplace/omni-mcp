import { OrganizationRepository } from "@/lib/repositories/organization.repository";
import { PromptRepository } from "@/lib/repositories/prompt.repository";
import { ResourceRepository } from "@/lib/repositories/resource.repository";
import { UserRepository } from "@/lib/repositories/user.repository";
import { OrganizationService } from "@/lib/services/organization.service";
import { PromptService } from "@/lib/services/prompt.service";
import { ResourceService } from "@/lib/services/resource.service";
import { UserService } from "@/lib/services/user.service";

/**
 * Service factory for dependency injection
 * Centralized place to manage all service and repository dependencies
 */
export class ServiceFactory {
  // Repository instances
  private static userRepository: UserRepository;
  private static organizationRepository: OrganizationRepository;
  private static promptRepository: PromptRepository;
  private static resourceRepository: ResourceRepository;

  // Service instances
  private static userService: UserService;
  private static organizationService: OrganizationService;
  private static promptService: PromptService;
  private static resourceService: ResourceService;

  /**
   * Get UserRepository instance (singleton)
   */
  static getUserRepository(): UserRepository {
    if (!this.userRepository) {
      this.userRepository = new UserRepository();
    }
    return this.userRepository;
  }

  /**
   * Get OrganizationRepository instance (singleton)
   */
  static getOrganizationRepository(): OrganizationRepository {
    if (!this.organizationRepository) {
      this.organizationRepository = new OrganizationRepository();
    }
    return this.organizationRepository;
  }

  /**
   * Get PromptRepository instance (singleton)
   */
  static getPromptRepository(): PromptRepository {
    if (!this.promptRepository) {
      this.promptRepository = new PromptRepository();
    }
    return this.promptRepository;
  }

  /**
   * Get ResourceRepository instance (singleton)
   */
  static getResourceRepository(): ResourceRepository {
    if (!this.resourceRepository) {
      this.resourceRepository = new ResourceRepository();
    }
    return this.resourceRepository;
  }

  /**
   * Get UserService instance (singleton)
   */
  static getUserService(): UserService {
    if (!this.userService) {
      this.userService = new UserService(
        this.getUserRepository(),
        this.getOrganizationRepository()
      );
    }
    return this.userService;
  }

  /**
   * Get OrganizationService instance (singleton)
   */
  static getOrganizationService(): OrganizationService {
    if (!this.organizationService) {
      this.organizationService = new OrganizationService(
        this.getOrganizationRepository(),
        this.getUserRepository()
      );
    }
    return this.organizationService;
  }

  /**
   * Get PromptService instance (singleton)
   */
  static getPromptService(): PromptService {
    if (!this.promptService) {
      this.promptService = new PromptService(
        this.getPromptRepository(),
        this.getOrganizationRepository()
      );
    }
    return this.promptService;
  }

  /**
   * Get ResourceService instance (singleton)
   */
  static getResourceService(): ResourceService {
    if (!this.resourceService) {
      this.resourceService = new ResourceService(
        this.getResourceRepository(),
        this.getOrganizationRepository()
      );
    }
    return this.resourceService;
  }
}
