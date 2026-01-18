import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../src/middleware/auth';
import { OrgContextRequest } from '../../src/middleware/orgContext';

/**
 * Creates a mock Express Request
 */
export function createMockRequest(overrides: Partial<Request> = {}): Partial<Request> {
  return {
    headers: {},
    query: {},
    params: {},
    body: {},
    user: undefined,
    ...overrides,
  } as Partial<Request>;
}

/**
 * Creates a mock Express Response
 */
export function createMockResponse(): Partial<Response> {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
  };
  return res;
}

/**
 * Creates a mock NextFunction
 */
export function createMockNext(): jest.Mock<NextFunction> {
  return jest.fn();
}

/**
 * Creates a mock AuthRequest with authentication
 */
export function createMockAuthRequest(userId: number, overrides: Partial<AuthRequest> = {}): Partial<AuthRequest> {
  return {
    ...createMockRequest(overrides),
    headers: {
      authorization: `Bearer mock-token-${userId}`,
      ...overrides.headers,
    },
    user: {
      userId,
    },
    ...overrides,
  } as Partial<AuthRequest>;
}

/**
 * Creates a mock OrgContextRequest with organization context
 */
export function createMockOrgContextRequest(
  user: any,
  organization: any,
  overrides: Partial<OrgContextRequest> = {}
): Partial<OrgContextRequest> {
  return {
    ...createMockAuthRequest(user.id, overrides),
    orgUser: user,
    organization,
    ...overrides,
  } as Partial<OrgContextRequest>;
}
