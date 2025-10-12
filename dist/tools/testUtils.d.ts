export declare const createMockContext: () => {
    session: {
        id: string;
        type: string;
        authenticatedAt: number;
        clientIp: string;
    };
    log: {
        info: import("vitest").Mock<(...args: any[]) => any>;
        warn: import("vitest").Mock<(...args: any[]) => any>;
        error: import("vitest").Mock<(...args: any[]) => any>;
        debug: import("vitest").Mock<(...args: any[]) => any>;
        fatal: import("vitest").Mock<(...args: any[]) => any>;
        trace: import("vitest").Mock<(...args: any[]) => any>;
        silent: import("vitest").Mock<(...args: any[]) => any>;
        level: string;
    };
    reportProgress: import("vitest").Mock<(...args: any[]) => any>;
    streamContent: import("vitest").Mock<(...args: any[]) => any>;
};
