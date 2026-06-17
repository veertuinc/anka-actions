export declare class Runner {
    private client;
    private owner;
    private repo;
    constructor(ghPAT: string, ghBaseUrl: string, owner: string, repo: string);
    private runnersPath;
    getRunnerByName(name: string): Promise<number | null>;
    createToken(): Promise<string>;
    delete(runnerId: number): Promise<void>;
}
