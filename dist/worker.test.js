import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Worker } from 'bullmq';
import * as errorUtils from './utils/errorUtils.js';
import logger from './logger.js';
import { config } from './config.js';
// Mock dependencies
vi.mock('worker_threads', () => ({ isMainThread: false }));
vi.mock('bullmq');
vi.mock('./config.js', () => ({
    config: {
        TASK_QUEUE_NAME: 'async-tasks',
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379,
        REDIS_PASSWORD: '',
        NODE_ENV: 'test',
        LOG_LEVEL: 'info',
        AUTH_TOKEN: 'test-token',
        HTTP_STREAM_ENDPOINT: '/stream',
        HEALTH_CHECK_PATH: '/health',
        PORT: 3000,
    },
}));
vi.mock('./logger.js', () => {
    const mockLogFn = vi.fn((_obj, _msg, ..._args) => { });
    const mockChildLogger = {
        info: mockLogFn,
        warn: mockLogFn,
        error: mockLogFn,
        fatal: mockLogFn,
        debug: mockLogFn,
        trace: mockLogFn,
        silent: mockLogFn,
        level: 'info',
    };
    return {
        default: {
            ...mockChildLogger,
            child: vi.fn(() => mockChildLogger),
        },
    };
});
vi.mock('./queue.js', () => ({
    initQueues: vi.fn(() => ({
        taskQueue: {
            events: { on: vi.fn() },
            defaultJobOptions: { attempts: 3 },
        },
        deadLetterQueue: { add: vi.fn() },
        redisConnection: {},
    })),
}));
vi.mock('./utils/asyncToolHelper.js', () => ({
    enqueueTask: vi.fn().mockResolvedValue('mock-job-id'),
}));
vi.mock('./tools/toolProcessors', () => ({
    toolProcessors: {
        asynchronousTaskSimulatorEnhanced: vi.fn(),
    },
}));
describe('Worker Initialization', () => {
    let workerModule;
    let mockWorkerInstance;
    let jobLogSpy;
    let sigtermHandler;
    let sigintHandler;
    beforeEach(async () => {
        // Reset mocks before each test
        vi.clearAllMocks();
        // Dynamically import modules to use mocks
        workerModule = await import('./worker.js');
        const webhookUtilsActual = await import('./utils/webhookUtils.js');
        vi.spyOn(webhookUtilsActual, 'sendWebhook');
        vi.spyOn(errorUtils, 'getErrDetails');
        mockWorkerInstance = {
            on: vi.fn(),
            close: vi.fn().mockResolvedValue(undefined),
            opts: { concurrency: 5 },
        };
        vi.mocked(Worker).mockImplementation(() => mockWorkerInstance);
        jobLogSpy = {
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            fatal: vi.fn(),
            debug: vi.fn(),
            trace: vi.fn(),
            silent: vi.fn(),
            level: 'info',
        };
        vi.spyOn(logger, 'child').mockReturnValue(jobLogSpy);
        vi.spyOn(process, 'on').mockImplementation((event, handler) => {
            if (event === 'SIGTERM')
                sigtermHandler = handler;
            if (event === 'SIGINT')
                sigintHandler = handler;
            return process;
        });
        await workerModule.initWorker(logger, config);
    });
    afterEach(() => {
        vi.restoreAllMocks();
    });
    it('should create a BullMQ Worker with correct parameters', () => {
        expect(Worker).toHaveBeenCalledWith('async-tasks', expect.any(Function), {
            connection: {},
            concurrency: 5,
        });
    });
    it('should log that the worker has started', () => {
        expect(jobLogSpy.info).toHaveBeenCalledWith(`Worker pour la file d'attente 'async-tasks' démarré avec une concurrence de 5. Prêt à traiter les tâches.`);
    });
    it('should register all event listeners on the worker', () => {
        expect(mockWorkerInstance.on).toHaveBeenCalledWith('completed', expect.any(Function));
        expect(mockWorkerInstance.on).toHaveBeenCalledWith('failed', expect.any(Function));
        expect(mockWorkerInstance.on).toHaveBeenCalledWith('error', expect.any(Function));
    });
    it('should register graceful shutdown listeners', () => {
        expect(sigtermHandler).toBeDefined();
        expect(sigintHandler).toBeDefined();
    });
});
//# sourceMappingURL=worker.test.js.map