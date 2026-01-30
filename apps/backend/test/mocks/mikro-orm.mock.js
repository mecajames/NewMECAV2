"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMockEntityManager = createMockEntityManager;
exports.createMockRepository = createMockRepository;
exports.resetMockEntityManager = resetMockEntityManager;
/**
 * Creates a mock EntityManager for testing
 */
function createMockEntityManager() {
    const mockEm = {
        find: jest.fn().mockResolvedValue([]),
        findOne: jest.fn().mockResolvedValue(null),
        findOneOrFail: jest.fn(),
        create: jest.fn((entityClass, data) => ({ ...data })),
        persist: jest.fn().mockReturnThis(),
        persistAndFlush: jest.fn().mockResolvedValue(undefined),
        flush: jest.fn().mockResolvedValue(undefined),
        remove: jest.fn().mockReturnThis(),
        removeAndFlush: jest.fn().mockResolvedValue(undefined),
        fork: jest.fn(),
        getRepository: jest.fn(),
        transactional: jest.fn(),
        nativeUpdate: jest.fn().mockResolvedValue(1),
        nativeDelete: jest.fn().mockResolvedValue(1),
        count: jest.fn().mockResolvedValue(0),
        assign: jest.fn((entity, data) => Object.assign(entity, data)),
        getReference: jest.fn(),
        clear: jest.fn(),
        refresh: jest.fn().mockResolvedValue(undefined),
    };
    // Setup fork to return itself for nested operations
    mockEm.fork.mockReturnValue(mockEm);
    // Setup transactional to execute the callback
    mockEm.transactional.mockImplementation(async (callback) => {
        return callback(mockEm);
    });
    return mockEm;
}
/**
 * Creates a mock EntityRepository for testing
 */
function createMockRepository() {
    return {
        find: jest.fn().mockResolvedValue([]),
        findOne: jest.fn().mockResolvedValue(null),
        findOneOrFail: jest.fn(),
        findAll: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        persist: jest.fn(),
        persistAndFlush: jest.fn().mockResolvedValue(undefined),
        flush: jest.fn().mockResolvedValue(undefined),
        remove: jest.fn(),
        removeAndFlush: jest.fn().mockResolvedValue(undefined),
        count: jest.fn().mockResolvedValue(0),
        nativeUpdate: jest.fn().mockResolvedValue(1),
        nativeDelete: jest.fn().mockResolvedValue(1),
        assign: jest.fn(),
        getReference: jest.fn(),
    };
}
/**
 * Helper to reset all mock functions on an EntityManager
 */
function resetMockEntityManager(em) {
    Object.values(em).forEach((value) => {
        if (typeof value === 'function' && 'mockReset' in value) {
            value.mockReset();
        }
    });
    // Re-setup default implementations
    em.fork.mockReturnValue(em);
    em.transactional.mockImplementation(async (callback) => callback(em));
    em.find.mockResolvedValue([]);
    em.findOne.mockResolvedValue(null);
    em.persistAndFlush.mockResolvedValue(undefined);
    em.flush.mockResolvedValue(undefined);
    em.removeAndFlush.mockResolvedValue(undefined);
}
//# sourceMappingURL=mikro-orm.mock.js.map