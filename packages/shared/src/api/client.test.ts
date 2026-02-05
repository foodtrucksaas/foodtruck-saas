import { describe, it, expect } from 'vitest';
import { ApiError, handleResponse, handleOptionalResponse } from './client';

describe('API Client', () => {
  describe('ApiError', () => {
    it('should create error with message only', () => {
      const error = new ApiError('Something went wrong');

      expect(error.message).toBe('Something went wrong');
      expect(error.name).toBe('ApiError');
      expect(error.code).toBeUndefined();
      expect(error.details).toBeUndefined();
    });

    it('should create error with message and code', () => {
      const error = new ApiError('Not found', '404');

      expect(error.message).toBe('Not found');
      expect(error.code).toBe('404');
      expect(error.details).toBeUndefined();
    });

    it('should create error with message, code, and details', () => {
      const details = { field: 'email', reason: 'invalid format' };
      const error = new ApiError('Validation failed', 'VALIDATION_ERROR', details);

      expect(error.message).toBe('Validation failed');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.details).toEqual(details);
    });

    it('should be an instance of Error', () => {
      const error = new ApiError('Test error');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ApiError);
    });
  });

  describe('handleResponse', () => {
    it('should return data when no error', () => {
      const data = { id: '123', name: 'Test' };
      const result = handleResponse(data, null);

      expect(result).toEqual(data);
    });

    it('should throw ApiError when error is provided', () => {
      const error = { message: 'Database error', code: 'DB_ERROR' };

      expect(() => handleResponse(null, error)).toThrow(ApiError);
      expect(() => handleResponse(null, error)).toThrow('Database error');
    });

    it('should include error code in ApiError', () => {
      const error = { message: 'Not found', code: '404', details: { table: 'users' } };

      try {
        handleResponse(null, error);
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(ApiError);
        expect((e as ApiError).code).toBe('404');
        expect((e as ApiError).details).toEqual({ table: 'users' });
      }
    });

    it('should throw ApiError when data is null and no error', () => {
      expect(() => handleResponse(null, null)).toThrow(ApiError);
      expect(() => handleResponse(null, null)).toThrow('No data returned');
    });

    it('should return data even if it is an empty array', () => {
      const result = handleResponse([], null);
      expect(result).toEqual([]);
    });

    it('should return data even if it is an empty object', () => {
      const result = handleResponse({}, null);
      expect(result).toEqual({});
    });

    it('should return primitive data types', () => {
      expect(handleResponse(42, null)).toBe(42);
      expect(handleResponse('test', null)).toBe('test');
      expect(handleResponse(true, null)).toBe(true);
    });
  });

  describe('handleOptionalResponse', () => {
    it('should return data when present', () => {
      const data = { id: '123', name: 'Test' };
      const result = handleOptionalResponse(data, null);

      expect(result).toEqual(data);
    });

    it('should return null when data is null and no error', () => {
      const result = handleOptionalResponse(null, null);

      expect(result).toBeNull();
    });

    it('should throw ApiError when error is provided', () => {
      const error = { message: 'Database error' };

      expect(() => handleOptionalResponse(null, error)).toThrow(ApiError);
      expect(() => handleOptionalResponse(null, error)).toThrow('Database error');
    });

    it('should include error details in ApiError', () => {
      const error = {
        message: 'Constraint violation',
        code: '23505',
        details: { constraint: 'unique_email' },
      };

      try {
        handleOptionalResponse(null, error);
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(ApiError);
        expect((e as ApiError).code).toBe('23505');
        expect((e as ApiError).details).toEqual({ constraint: 'unique_email' });
      }
    });

    it('should return empty array as valid data', () => {
      const result = handleOptionalResponse([], null);
      expect(result).toEqual([]);
    });

    it('should return empty object as valid data', () => {
      const result = handleOptionalResponse({}, null);
      expect(result).toEqual({});
    });
  });
});
