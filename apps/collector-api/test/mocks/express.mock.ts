import { Request, Response, NextFunction } from 'express';

/**
 * Creates a mock Express Request
 */
export function createMockRequest(overrides: Partial<Request> = {}): Partial<Request> {
  return {
    headers: {},
    query: {},
    params: {},
    body: {},
    socket: {
      remoteAddress: '127.0.0.1',
    },
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
