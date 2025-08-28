import { OrganizationRepository } from "@/lib/repositories/organization.repository";
import { PromptRepository } from "@/lib/repositories/prompt.repository";
import { ResourceRepository } from "@/lib/repositories/resource.repository";
import { UserRepository } from "@/lib/repositories/user.repository";
import { OrganizationService } from "@/lib/services/organization.service";
import { PromptService } from "@/lib/services/prompt.service";
import { ResourceService } from "@/lib/services/resource.service";
import { TestingService } from "@/lib/services/testing.service";
import { UserService } from "@/lib/services/user.service";

export class ServiceFactory {
  private static userRepository: UserRepository;
  private static organizationRepository: OrganizationRepository;
  private static promptRepository: PromptRepository;
  private static resourceRepository: ResourceRepository;

  private static userService: UserService;
  private static organizationService: OrganizationService;
  private static promptService: PromptService;
  private static resourceService: ResourceService;
  private static testingService: TestingService;

  static getUserRepository(): UserRepository {
    if (!this.userRepository) {
      this.userRepository = new UserRepository();
    }
    return this.userRepository;
  }

  static getOrganizationRepository(): OrganizationRepository {
    if (!this.organizationRepository) {
      this.organizationRepository = new OrganizationRepository();
    }
    return this.organizationRepository;
  }

  static getPromptRepository(): PromptRepository {
    if (!this.promptRepository) {
      this.promptRepository = new PromptRepository();
    }
    return this.promptRepository;
  }

  static getResourceRepository(): ResourceRepository {
    if (!this.resourceRepository) {
      this.resourceRepository = new ResourceRepository();
    }
    return this.resourceRepository;
  }

  static getUserService(): UserService {
    if (!this.userService) {
      this.userService = new UserService(
        this.getUserRepository(),
        this.getOrganizationRepository()
      );
    }
    return this.userService;
  }

  static getOrganizationService(): OrganizationService {
    if (!this.organizationService) {
      this.organizationService = new OrganizationService(
        this.getOrganizationRepository(),
        this.getUserRepository()
      );
    }
    return this.organizationService;
  }

  static getPromptService(): PromptService {
    if (!this.promptService) {
      this.promptService = new PromptService(
        this.getPromptRepository(),
        this.getOrganizationRepository()
      );
    }
    return this.promptService;
  }

  static getResourceService(): ResourceService {
    if (!this.resourceService) {
      this.resourceService = new ResourceService(
        this.getResourceRepository(),
        this.getOrganizationRepository()
      );
    }
    return this.resourceService;
  }

  static getTestingService(): TestingService {
    if (!this.testingService) {
      this.testingService = new TestingService();
    }
    return this.testingService;
  }
}
