import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useStreamingOptimization } from '../useStreamingOptimization';
import { useAuthStore } from '../../stores/authStore';
import { io } from 'socket.io-client';

// Mock socket.io-client
vi.mock('socket.io-client', () => {
  return {
    io: vi.fn(),
    Socket: vi.fn(),
  };
});

// Mock authStore
vi.mock('../../stores/authStore', () => ({
  useAuthStore: vi.fn(),
}));

describe('useStreamingOptimization', () => {
  const mockUser = { id: 'test-user-id' };
  let mockSocket: any;
  let handlers: Record<string, any> = {};

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuthStore as any).mockReturnValue({ user: mockUser });

    handlers = {};
    mockSocket = {
      on: vi.fn((event, handler) => {
        handlers[event] = handler;
      }),
      emit: vi.fn(),
      disconnect: vi.fn(),
      connect: vi.fn(() => {
        if (handlers.connect) handlers.connect();
      }),
      connected: false,
    };
    (io as any).mockReturnValue(mockSocket);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useStreamingOptimization());

    expect(result.current.content).toBe('');
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should start streaming when optimize is called', async () => {
    const { result } = renderHook(() => useStreamingOptimization());

    await act(async () => {
      result.current.optimize('Test resume content');
    });

    expect(result.current.isStreaming).toBe(true);

    // Simulate connection
    if (handlers.connect) {
      await act(async () => {
        handlers.connect();
      });
    }

    expect(mockSocket.emit).toHaveBeenCalledWith('optimize', {
      content: 'Test resume content',
      userId: mockUser.id,
      language: 'zh-CN',
    });
  });

  it('should update content when chunk is received', async () => {
    const { result } = renderHook(() => useStreamingOptimization());

    await act(async () => {
      result.current.optimize('Test content');
    });

    await act(async () => {
      if (handlers.chunk) {
        handlers.chunk({ type: 'chunk', content: 'First chunk' });
      }
    });

    expect(result.current.content).toBe('First chunk');

    await act(async () => {
      if (handlers.chunk) {
        handlers.chunk({ type: 'chunk', content: ' Second chunk' });
      }
    });

    expect(result.current.content).toBe('First chunk Second chunk');
  });

  it('should stop streaming when done is received', async () => {
    const { result } = renderHook(() => useStreamingOptimization());

    await act(async () => {
      result.current.optimize('Test content');
    });

    expect(result.current.isStreaming).toBe(true);

    await act(async () => {
      if (handlers.done) {
        handlers.done();
      }
    });

    expect(result.current.isStreaming).toBe(false);
  });

  it('should handle errors', async () => {
    const { result } = renderHook(() => useStreamingOptimization());

    await act(async () => {
      result.current.optimize('Test content');
    });

    await act(async () => {
      if (handlers.error) {
        handlers.error({ type: 'error', message: 'Test error message' });
      }
    });

    expect(result.current.error).toBe('Test error message');
    expect(result.current.isStreaming).toBe(false);
  });

  it('should call cancel when cancel is called', async () => {
    const { result } = renderHook(() => useStreamingOptimization());

    await act(async () => {
      result.current.optimize('Test content');
    });

    await act(async () => {
      result.current.cancel();
    });

    expect(mockSocket.emit).toHaveBeenCalledWith('cancel');
  });

  it('should reset state when reset is called', async () => {
    const { result } = renderHook(() => useStreamingOptimization());

    await act(async () => {
      result.current.optimize('Test content');
    });

    await act(async () => {
      result.current.reset();
    });

    expect(result.current.content).toBe('');
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.error).toBe(null);
  });
});
