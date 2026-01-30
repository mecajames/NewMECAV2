import { EntityManager, EntityRepository } from '@mikro-orm/core';
/**
 * Creates a mock EntityManager for testing
 */
export declare function createMockEntityManager(): jest.Mocked<EntityManager>;
/**
 * Creates a mock EntityRepository for testing
 */
export declare function createMockRepository<T extends object>(): jest.Mocked<EntityRepository<T>>;
/**
 * Helper to reset all mock functions on an EntityManager
 */
export declare function resetMockEntityManager(em: jest.Mocked<EntityManager>): void;
//# sourceMappingURL=mikro-orm.mock.d.ts.map