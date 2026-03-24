interface VersionData {
    version: string;
    last_updated: string;
}

interface GitHubTreeItem {
    path: string;
    mode: string;
    type: string;
    sha: string;
    size?: number;
    url: string;
}

export interface SyncProgress {
    total: number;
    current: number;
    currentFile: string;
    status: 'checking' | 'downloading' | 'completed' | 'error' | 'up-to-date';
}

export class GitHubSyncService {
    private owner = 'MinaHawarei';
    private repo = 'Hos_Eroaf';
    private branch = 'main';
    private contentPath = 'storage/content'; // Directory inside the repository where the JSONs are located

    public onProgress?: (progress: SyncProgress) => void;

    /**
     * Checks if a new version is available on GitHub.
     */
    async checkForUpdates(): Promise<boolean> {
        this.emitProgress({ total: 0, current: 0, currentFile: '', status: 'checking' });

        try {
            const rawUrl = `https://raw.githubusercontent.com/${this.owner}/${this.repo}/${this.branch}/version.json?timestamp=${new Date().getTime()}`;
            const response = await fetch(rawUrl, { cache: 'no-store' });

            if (!response.ok) {
                // If the file doesn't exist remotely, it will return 404. We shouldn't throw to avoid crashing the UI, just return false.
                return false;
            }

            const remoteVersion: VersionData = await response.json();
            const localVersionStr = localStorage.getItem('app_content_version');
            const localVersion = localVersionStr ? (JSON.parse(localVersionStr) as VersionData) : null;

            if (!localVersion || this.isNewer(remoteVersion.version, localVersion.version)) {
                return true;
            }

            this.emitProgress({ total: 0, current: 0, currentFile: '', status: 'up-to-date' });
            return false;
        } catch (error) {
            console.error('Update check failed:', error);
            this.emitProgress({ total: 0, current: 0, currentFile: '', status: 'error' });
            throw error;
        }
    }

    /**
     * Executes the sync process, comparing hashes and downloading new/modified files.
     */
    async performSync(): Promise<VersionData> {
        // Fetch remote version data
        const rawUrl = `https://raw.githubusercontent.com/${this.owner}/${this.repo}/${this.branch}/version.json?t=${Date.now()}`;
        const resVersion = await fetch(rawUrl, { cache: 'no-store' });
        const remoteVersion: VersionData = await resVersion.json();

        // Fetch repository tree recursively using Data API
        const treeUrl = `https://api.github.com/repos/${this.owner}/${this.repo}/git/trees/${this.branch}?recursive=1`;
        const resTree = await fetch(treeUrl);
        const treeData = await resTree.json();

        if (!treeData.tree) {
            throw new Error('Could not fetch repository tree from GitHub.');
        }

        // Filter out files that target our content path
        const contentFiles: GitHubTreeItem[] = treeData.tree.filter((item: GitHubTreeItem) =>
            item.type === 'blob' && item.path.startsWith(this.contentPath + '/')
        );

        // Load local tracking hashes to compare changes
        const localHashesStr = localStorage.getItem('app_content_hashes');
        const localHashes: Record<string, string> = localHashesStr ? JSON.parse(localHashesStr) : {};

        // Compare SHA hashes to find differing or new files
        const filesToDownload = contentFiles.filter(item => localHashes[item.path] !== item.sha);

        if (filesToDownload.length > 0) {
            let current = 0;
            const updatedHashes = { ...localHashes };

            for (const file of filesToDownload) {
                current++;
                this.emitProgress({
                    total: filesToDownload.length,
                    current,
                    currentFile: file.path,
                    status: 'downloading'
                });

                const fileRawUrl = `https://raw.githubusercontent.com/${this.owner}/${this.repo}/${this.branch}/${file.path}?t=${Date.now()}`;
                const fileRes = await fetch(fileRawUrl, { cache: 'no-store' });

                if (fileRes.ok) {
                    const content = await fileRes.text();

                    // Route the file data to the persistent file system integration layer
                    await this.saveFileLocally(file.path, content);

                    // Track the new hash upon successful save
                    updatedHashes[file.path] = file.sha;
                } else {
                    console.error(`Failed to download ${file.path}`);
                }
            }

            // Persist the new state tracking
            localStorage.setItem('app_content_hashes', JSON.stringify(updatedHashes));
        }

        // Update successful version state
        localStorage.setItem('app_content_version', JSON.stringify(remoteVersion));

        this.emitProgress({
            total: filesToDownload.length,
            current: filesToDownload.length,
            currentFile: '',
            status: 'completed'
        });

        return remoteVersion;
    }

    /**
     * Helper to safely emit progress states
     */
    private emitProgress(progress: SyncProgress) {
        if (this.onProgress) {
            this.onProgress(progress);
        }
    }

    /**
     * Determines if the remote version string is higher/newer than the local version string.
     */
    private isNewer(remote: string, local: string): boolean {
        const v1 = remote.split('.').map(Number);
        const v2 = local.split('.').map(Number);

        for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
            const n1 = v1[i] || 0;
            const n2 = v2[i] || 0;
            if (n1 > n2) return true;
            if (n1 < n2) return false;
        }
        return false;
    }


    /**
     * Abstraction to handle saving files to the physical or emulated filesystem.
     */
    private async saveFileLocally(path: string, content: string): Promise<void> {
        // [1] Check for Electron JS
        if (typeof window !== 'undefined' && (window as any).electronFS) {
            await (window as any).electronFS.writeFile(path, content);
            return;
        }

        // [2] Check for Capacitor (Mobile)
        if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform()) {
            try {
                // Dynamic import لحل مشكلة الـ Vite في الويب
                const filesystem = await import('@capacitor/filesystem');

                await filesystem.Filesystem.writeFile({
                    path: path,
                    data: content,
                    directory: filesystem.Directory.Data,
                    // الحل الصحيح لمشكلة الـ Type Error:
                    encoding: filesystem.Encoding.UTF8
                });
                return;
            } catch (error) {
                console.error('Capacitor Filesystem Error:', error);
                throw error;
            }
        }

        // [3] Fallback for Web / Local Development
        // في مرحلة التطوير على المتصفح، ممكن تخزن في الـ LocalStorage أو تبعت للارفل
        console.log(`[GitHubSyncService] Web Mode: Simulating save for ${path}`);

        // اختيارياً: لو عايز تجرب الـ flow كامل في الويب، ابعتها للارفل يحفظها في مجلد content
        /*
        await fetch('/api/content/sync-file', {
             method: 'POST',
             headers: {
                 'Content-Type': 'application/json',
                 'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as any)?.content
             },
             body: JSON.stringify({ path, content })
        });
        */

        return Promise.resolve();
    }
}
