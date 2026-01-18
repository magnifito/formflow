import { DataSource, EntityManager } from 'typeorm';
import { User, Organization, Form, Submission, OrganizationIntegration } from '@formflow/shared/entities';

/**
 * Creates a mock DataSource with all necessary manager methods
 */
export function createMockDataSource(): jest.Mocked<DataSource> {
  const mockManager = createMockManager();
  
  return {
    manager: mockManager,
    initialize: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn().mockResolvedValue(undefined),
    isInitialized: true,
  } as unknown as jest.Mocked<DataSource>;
}

/**
 * Creates a mock EntityManager with common methods
 */
export function createMockManager(): jest.Mocked<EntityManager> {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    remove: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
    query: jest.fn(),
  } as unknown as jest.Mocked<EntityManager>;
}

/**
 * Helper to create mock manager with specific return values
 */
export function createMockManagerWithData(data: {
  findOne?: any;
  find?: any[];
  findAndCount?: [any[], number];
  count?: number;
  save?: any;
  create?: any;
}) {
  const manager = createMockManager();
  
  if (data.findOne !== undefined) {
    manager.findOne = jest.fn().mockResolvedValue(data.findOne);
  }
  
  if (data.find !== undefined) {
    manager.find = jest.fn().mockResolvedValue(data.find);
  }
  
  if (data.findAndCount !== undefined) {
    manager.findAndCount = jest.fn().mockResolvedValue(data.findAndCount);
  }
  
  if (data.count !== undefined) {
    manager.count = jest.fn().mockResolvedValue(data.count);
  }
  
  if (data.save !== undefined) {
    manager.save = jest.fn().mockResolvedValue(data.save);
  }
  
  if (data.create !== undefined) {
    manager.create = jest.fn().mockReturnValue(data.create);
  }
  
  return manager;
}

/**
 * Mock QueryBuilder for complex queries
 */
export function createMockQueryBuilder() {
  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getCount: jest.fn(),
    getMany: jest.fn(),
    getManyAndCount: jest.fn(),
    getOne: jest.fn(),
  };
  
  return mockQueryBuilder;
}
