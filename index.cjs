// index.cjs — 插件管家 / Plugin Manager: main-process half.
//
// The renderer can list mods and flip their enabled flag through the app's own
// bridge (window.electron.mods), but the bridge has no delete call. This entry
// supplies one, restricted to the per-user mods folder, plus a scan that maps
// each mod id to the folder it was actually discovered in. Everything that
// touches the disk is re-checked here: the renderer only ever sends a mod id.
'use strict';

const fs = require('fs');
const path = require('path');

const MOD_ID = 'plugin-manager';
const MOD_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

const describeError = (error) => {
    if (!error) {
        return 'unknown error';
    }
    if (typeof error.message === 'string' && error.message) {
        return error.message;
    }
    return String(error);
};

const normalizePath = (value) => {
    const resolved = path.resolve(value);
    return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
};

// Strict containment: the child must be below the parent, never the parent itself.
const isStrictlyInside = (parent, child) => {
    const relative = path.relative(normalizePath(parent), normalizePath(child));
    return relative !== ''
        && relative !== '..'
        && !relative.startsWith(`..${path.sep}`)
        && !path.isAbsolute(relative);
};

const realpath = (value) => {
    if (typeof fs.realpathSync.native === 'function') {
        return fs.realpathSync.native(value);
    }
    return fs.realpathSync(value);
};

const readJson = (filePath) => {
    try {
        return { value: JSON.parse(fs.readFileSync(filePath, 'utf8')), error: null };
    } catch (error) {
        return { value: null, error: describeError(error) };
    }
};

/*
 * The same lookup rule the loader uses (electron/modSystem/discovery.cjs): a
 * mod root has mod.json in the directory itself, or in exactly one plain
 * subdirectory. Hand-extracted zips often leave that extra folder.
 */
const resolveModRoot = (entryDirectory) => {
    if (fs.existsSync(path.join(entryDirectory, 'mod.json'))) {
        return entryDirectory;
    }
    let children = [];
    try {
        children = fs.readdirSync(entryDirectory, { withFileTypes: true });
    } catch {
        return entryDirectory;
    }
    const candidates = children
        .filter((child) => child.isDirectory() && !child.name.startsWith('.'))
        .map((child) => path.join(entryDirectory, child.name))
        .filter((childDirectory) => fs.existsSync(path.join(childDirectory, 'mod.json')));
    return candidates.length === 1 ? candidates[0] : entryDirectory;
};

const createModTools = () => {
    const { app } = require('electron');
    const userData = app.getPath('userData');
    const userModsDir = path.join(userData, 'mods');

    // Mirrors electron/modSystem/discovery.cjs#getModsDirectories. The order
    // matters: the first copy of a mod id is the one the loader uses.
    const getRoots = () => {
        const roots = [];
        if (!app.isPackaged) {
            roots.push({ dir: path.join(app.getAppPath(), 'mods'), source: 'dev' });
        }
        roots.push({ dir: userModsDir, source: 'user' });
        if (process.resourcesPath) {
            roots.push({ dir: path.join(process.resourcesPath, 'mods'), source: 'resources' });
        }
        return roots;
    };

    const scan = () => {
        const roots = getRoots();
        const entries = [];
        const seenIds = new Set();

        roots.forEach((root) => {
            let dirents = [];
            try {
                dirents = fs.readdirSync(root.dir, { withFileTypes: true });
            } catch {
                return; // Missing folder: nothing discovered here.
            }
            dirents
                .filter((dirent) => dirent.isDirectory() && !dirent.name.startsWith('.'))
                .forEach((dirent) => {
                    const entryDirectory = path.join(root.dir, dirent.name);
                    const dirPath = resolveModRoot(entryDirectory);
                    const manifestPath = path.join(dirPath, 'mod.json');
                    const read = readJson(manifestPath);
                    const manifest = read.value && typeof read.value === 'object' && !Array.isArray(read.value)
                        ? read.value
                        : null;
                    const id = manifest && typeof manifest.id === 'string' && MOD_ID_PATTERN.test(manifest.id)
                        ? manifest.id
                        : null;
                    const hasName = Boolean(manifest
                        && typeof manifest.name === 'string'
                        && manifest.name.trim().length > 0
                        && manifest.name.length <= 64);
                    const hasVersion = Boolean(manifest
                        && typeof manifest.version === 'string'
                        && /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(manifest.version));
                    const mainOk = !manifest || manifest.main === null || manifest.main === undefined
                        || (typeof manifest.main === 'string'
                            && !/[\\/]/.test(manifest.main)
                            && /\.c?js$/.test(manifest.main));
                    const clientOk = !manifest || manifest.client === null || manifest.client === undefined
                        || (typeof manifest.client === 'string' && /\.m?js$/.test(manifest.client));
                    const hasEntry = Boolean(manifest && (manifest.main || manifest.client));
                    // A close copy of the loader's manifest gate, for the fields that decide
                    // whether a valid id key or a folder-name key wins during discovery.
                    const valid = Boolean(manifest
                        && manifest.folium === 1
                        && id
                        && hasName
                        && hasVersion
                        && mainOk
                        && clientOk
                        && hasEntry);

                    let hostId;
                    let duplicate = false;
                    if (!valid) {
                        // Broken discovery is keyed by its folder name, exactly as the loader reports it.
                        hostId = dirent.name;
                    } else if (seenIds.has(id)) {
                        // The loader keeps a duplicate visible under its discovery key.
                        hostId = `${dirent.name}-duplicate-${id}`;
                        duplicate = true;
                    } else {
                        seenIds.add(id);
                        hostId = id;
                    }

                    let symlink = false;
                    try {
                        symlink = fs.lstatSync(entryDirectory).isSymbolicLink();
                    } catch {
                        // The entry can vanish between readdir and lstat; report it as-is below.
                    }

                    entries.push({
                        hostId,
                        id,
                        name: manifest && typeof manifest.name === 'string' ? manifest.name : dirent.name,
                        version: manifest && typeof manifest.version === 'string' ? manifest.version : null,
                        author: manifest && typeof manifest.author === 'string' ? manifest.author : null,
                        description: manifest && typeof manifest.description === 'string' ? manifest.description : null,
                        dirPath,
                        entryPath: entryDirectory,
                        folderName: dirent.name,
                        source: root.source,
                        valid,
                        duplicate,
                        symlink,
                        ambiguous: false,
                        readable: Boolean(manifest),
                        error: read.error,
                    });
                });
        });

        /*
         * Discovery keys a broken mod by its folder name and a valid mod by its
         * manifest id. The two namespaces can collide (a folder named like some
         * other mod's id). The loader's map then keeps one of them; refuse to
         * delete either copy rather than risk removing the folder the user did
         * not mean. Same for two folders that end up under one key.
         */
        const hostKeyCounts = new Map();
        entries.forEach((entry) => {
            hostKeyCounts.set(entry.hostId, (hostKeyCounts.get(entry.hostId) || 0) + 1);
        });
        const validIds = new Set(entries.filter((entry) => entry.valid).map((entry) => entry.id));
        const brokenFolderNames = new Set(entries
            .filter((entry) => !entry.valid)
            .map((entry) => path.basename(entry.entryPath)));
        entries.forEach((entry) => {
            if (hostKeyCounts.get(entry.hostId) > 1) {
                entry.ambiguous = true;
            }
            const folderName = path.basename(entry.entryPath);
            if (!entry.valid && validIds.has(folderName)) {
                entry.ambiguous = true;
            }
            if (entry.valid && brokenFolderNames.has(entry.hostId)) {
                entry.ambiguous = true;
            }
        });

        return {
            userModsDir,
            roots: roots.map((root) => ({ dir: root.dir, source: root.source })),
            entries,
        };
    };

    const removeDataDirs = async (modId) => {
        const targets = [
            path.join(userData, 'mods-data', modId),
            path.join(userData, 'mods-cache', modId),
        ];
        let skipped = null;
        for (const target of targets) {
            if (!isStrictlyInside(userData, target)) {
                skipped = 'outside-user-data';
                continue;
            }
            try {
                await fs.promises.rm(target, { recursive: true, force: true, maxRetries: 3, retryDelay: 120 });
            } catch (error) {
                skipped = `data-${describeError(error)}`;
            }
        }
        return skipped;
    };

    /*
     * Delete one mod. The renderer sends only `{ id }`; the folder is looked up
     * again here and must be a real directory under userData/mods. Bundled
     * (resources) and repository (dev) mods are refused: they are not the
     * user's to remove and would come back on the next update.
     */
    const remove = async (payload) => {
        const request = payload && typeof payload === 'object' ? payload : {};
        const id = typeof request.id === 'string' ? request.id : '';
        const purgeData = request.purgeData === true;

        if (!id) {
            return { ok: false, error: 'invalid-id' };
        }
        if (id === MOD_ID) {
            return { ok: false, error: 'self-protected' };
        }

        const entry = scan().entries.find((candidate) => candidate.hostId === id);
        if (!entry) {
            return { ok: false, error: 'not-found' };
        }
        if (entry.source !== 'user') {
            return { ok: false, error: `protected-source:${entry.source}` };
        }
        if (entry.symlink) {
            return { ok: false, error: 'symlink-refused' };
        }
        if (entry.ambiguous) {
            return { ok: false, error: 'ambiguous-entry' };
        }

        let userRootReal;
        let entryReal;
        try {
            userRootReal = realpath(userModsDir);
            entryReal = realpath(entry.entryPath);
        } catch (error) {
            return { ok: false, error: `resolve-failed:${describeError(error)}` };
        }
        if (!isStrictlyInside(userRootReal, entryReal)) {
            return { ok: false, error: 'outside-user-mods' };
        }

        try {
            await fs.promises.rm(entry.entryPath, {
                recursive: true,
                force: true,
                maxRetries: 3,
                retryDelay: 120,
            });
        } catch (error) {
            return { ok: false, error: `delete-failed:${describeError(error)}` };
        }

        let removedData = false;
        let dataSkipped = null;
        if (purgeData) {
            // A duplicate id shares its mods-data folder with the copy the loader
            // uses; only the primary copy may purge it.
            if (!entry.id || !MOD_ID_PATTERN.test(entry.id) || entry.hostId !== entry.id) {
                dataSkipped = 'shared-or-unknown-id';
            } else {
                dataSkipped = await removeDataDirs(entry.id);
                removedData = dataSkipped === null;
            }
        }

        return { ok: true, id, removedData, dataSkipped };
    };

    return { scan, remove };
};

/* ------------------------------------------------------------ mod market */

const CATALOG_ORIGIN = 'https://folium-compound.cielaniska.top';
const CATALOG_URL = `${CATALOG_ORIGIN}/catalog.json`;
const CATALOG_FORMAT = 'folium-market-catalog';
const MARKET_MAX_BYTES = 64 * 1024 * 1024;
const CATALOG_TIMEOUT_MS = 9000;
const DOWNLOAD_TIMEOUT_MS = 120000;
const CATALOG_TTL_MS = 10 * 60 * 1000;
const PACKAGE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;

const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const readJsonFile = (file) => {
    try {
        const text = fs.readFileSync(file, 'utf8');
        return JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);
    } catch {
        return null;
    }
};

const writeJsonFile = (file, value) => {
    const temp = `${file}.tmp`;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(temp, JSON.stringify(value), 'utf8');
    try {
        fs.rmSync(file, { force: true });
    } catch {
        // The rename below still works when the old file is already gone.
    }
    fs.renameSync(temp, file);
};

/*
 * The market is a network feature, so every attempt is retried once. An abort
 * (the caller's timeout or the mod being disabled) is never retried.
 */
const fetchWithRetry = async (url, init, attempts = 2) => {
    let lastError = null;
    for (let index = 0; index < attempts; index += 1) {
        try {
            return await fetch(url, init);
        } catch (error) {
            lastError = error;
            if (init && init.signal && init.signal.aborted) {
                break;
            }
            if (index < attempts - 1) {
                await new Promise((resolve) => setTimeout(resolve, 1500));
            }
        }
    }
    throw lastError;
};

/*
 * Only https URLs on the official market host. A tampered catalog therefore
 * cannot point downloads or previews at another origin.
 */
const resolveCatalogUrl = (raw, { pathPrefix = null } = {}) => {
    if (typeof raw !== 'string' || raw.length === 0) {
        return null;
    }
    let url;
    try {
        url = new URL(raw, CATALOG_ORIGIN);
    } catch {
        return null;
    }
    if (url.protocol !== 'https:' || url.origin !== CATALOG_ORIGIN) {
        return null;
    }
    if (pathPrefix && !url.pathname.startsWith(pathPrefix)) {
        return null;
    }
    return url.toString();
};

const normalizeMarketEntry = (entry) => {
    if (!isPlainObject(entry) || !MOD_ID_PATTERN.test(String(entry.id ?? ''))) {
        return null;
    }
    const download = isPlainObject(entry.download) ? entry.download : null;
    const downloadUrl = resolveCatalogUrl(download && download.url, { pathPrefix: '/downloads/' });
    const sha256 = String(download && download.sha256 ? download.sha256 : '').toLowerCase();
    if (!downloadUrl || !SHA256_PATTERN.test(sha256)) {
        return null;
    }
    const preview = isPlainObject(entry.preview) ? entry.preview : null;
    const previewUrl = resolveCatalogUrl(preview && preview.url);
    const source = typeof entry.source === 'string' && /^https:\/\//i.test(entry.source)
        ? entry.source.slice(0, 500)
        : '';
    const id = String(entry.id);
    return {
        id,
        name: String(entry.name ?? id).slice(0, 120),
        version: String(entry.version ?? '0.0.0').slice(0, 64),
        author: entry.author ? String(entry.author).slice(0, 120) : '',
        description: String(entry.description ?? '').slice(0, 4000),
        origin: entry.origin === 'official' ? 'official' : 'community',
        channel: entry.channel === 'beta' ? 'beta' : 'release',
        keyLabel: entry.keyLabel ? String(entry.keyLabel).slice(0, 120) : '',
        keyId: entry.keyId ? String(entry.keyId).slice(0, 120) : '',
        signedAt: entry.signedAt ? String(entry.signedAt).slice(0, 64) : '',
        permissions: Array.isArray(entry.permissions) ? entry.permissions.filter((item) => typeof item === 'string') : [],
        experimental: Array.isArray(entry.experimental) ? entry.experimental.filter((item) => typeof item === 'string') : [],
        depends: Array.isArray(entry.depends) ? entry.depends.filter((item) => typeof item === 'string') : [],
        embedOrigins: Array.isArray(entry.embedOrigins) ? entry.embedOrigins.filter((item) => typeof item === 'string') : [],
        folia: entry.folia ? String(entry.folia).slice(0, 120) : null,
        hasMain: entry.hasMain === true,
        owners: Array.isArray(entry.owners) ? entry.owners.filter((name) => typeof name === 'string') : [],
        source,
        download: {
            url: downloadUrl,
            fileName: download.fileName ? String(download.fileName).slice(0, 200) : `${id}-${entry.version}.zip`,
            size: Number(download.size) || 0,
            sha256,
        },
        preview: previewUrl
            ? { url: previewUrl, width: Number(preview.width) || 0, height: Number(preview.height) || 0 }
            : null,
        page: `${CATALOG_ORIGIN}/#mod-${id}`,
    };
};

const sha256Of = (buffer) => require('crypto').createHash('sha256').update(buffer).digest('hex');

/*
 * The market half: catalog fetch/cache, package download with SHA-256
 * verification, and cache cleanup. The actual extraction stays with the host's
 * installModFromZip; this code never writes into mods/.
 *
 * Cache folder: api.storage.paths.cache (permission filesystem.data).
 */
const createMarket = (api) => {
    let cacheDir = null;
    let pruned = false;
    const inflight = new Set();

    const ensureCache = () => {
        if (!cacheDir) {
            cacheDir = api.storage.paths.cache;
        }
        if (!pruned) {
            pruned = true;
            try {
                prunePackages();
            } catch {
                // Cache cleanup is best effort.
            }
        }
        return cacheDir;
    };

    const catalogCacheFile = () => path.join(ensureCache(), 'catalog.json');
    const packagesDir = () => path.join(ensureCache(), 'packages');

    const packagePath = (id, version) => {
        const safeVersion = String(version || '0').replace(/[^0-9A-Za-z.+_-]/g, '_').slice(0, 48) || '0';
        return path.join(packagesDir(), `${id}-${safeVersion}.zip`);
    };

    const track = (controller) => {
        inflight.add(controller);
        return () => inflight.delete(controller);
    };

    const readCachedCatalog = () => {
        const cached = readJsonFile(catalogCacheFile());
        if (!isPlainObject(cached) || !isPlainObject(cached.catalog) || !Array.isArray(cached.catalog.mods)) {
            return null;
        }
        return {
            catalog: cached.catalog,
            etag: typeof cached.etag === 'string' ? cached.etag : '',
            fetchedAt: Number(cached.fetchedAt) || 0,
        };
    };

    const shapeCatalog = (catalog, extra) => ({
        ok: true,
        format: String(catalog.format ?? ''),
        version: Number(catalog.version) || 0,
        commit: catalog.commit ? String(catalog.commit) : '',
        repository: catalog.repository ? String(catalog.repository) : '',
        mods: catalog.mods.map(normalizeMarketEntry).filter(Boolean),
        ...extra,
    });

    const fetchCatalog = async ({ force } = {}) => {
        const cached = readCachedCatalog();
        const fresh = cached && !force && Date.now() - cached.fetchedAt < CATALOG_TTL_MS;
        if (fresh) {
            return shapeCatalog(cached.catalog, {
                source: 'cache',
                stale: false,
                fetchedAt: cached.fetchedAt,
                etag: cached.etag,
            });
        }

        const controller = new AbortController();
        const untrack = track(controller);
        const timer = setTimeout(() => controller.abort(), CATALOG_TIMEOUT_MS);
        try {
            const headers = { accept: 'application/json' };
            if (cached && cached.etag) {
                headers['if-none-match'] = cached.etag;
            }
            const response = await fetchWithRetry(CATALOG_URL, {
                headers,
                signal: controller.signal,
                cache: 'no-store',
            });

            if (response.status === 304 && cached) {
                writeJsonFile(catalogCacheFile(), { ...cached, fetchedAt: Date.now() });
                return shapeCatalog(cached.catalog, {
                    source: 'cache',
                    stale: false,
                    fetchedAt: Date.now(),
                    etag: cached.etag,
                });
            }
            if (!response.ok) {
                throw new Error(`catalog-http-${response.status}`);
            }

            const text = await response.text();
            let parsed;
            try {
                parsed = JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);
            } catch {
                throw new Error('catalog-not-json');
            }
            if (!isPlainObject(parsed) || parsed.format !== CATALOG_FORMAT || !Array.isArray(parsed.mods)) {
                throw new Error('catalog-unexpected-format');
            }

            const etag = response.headers.get('etag') || '';
            const fetchedAt = Date.now();
            writeJsonFile(catalogCacheFile(), { catalog: parsed, etag, fetchedAt });
            return shapeCatalog(parsed, { source: 'network', stale: false, fetchedAt, etag });
        } catch (error) {
            const code = controller.signal.aborted ? 'catalog-timeout' : describeError(error);
            api.log.warn(`[plugin-manager] catalog fetch failed: ${code}`);
            if (cached) {
                return shapeCatalog(cached.catalog, {
                    source: 'cache',
                    stale: true,
                    fetchedAt: cached.fetchedAt,
                    etag: cached.etag,
                    error: code,
                });
            }
            return { ok: false, error: code, mods: [] };
        } finally {
            clearTimeout(timer);
            untrack();
        }
    };

    /*
     * Stream the zip instead of buffering an unbounded response. The catalog
     * hash is verified before the file is renamed into place; a mismatch never
     * leaves a usable package behind.
     */
    const downloadPackage = async (request) => {
        const id = typeof request.id === 'string' ? request.id : '';
        if (!MOD_ID_PATTERN.test(id)) {
            return { ok: false, error: 'market-bad-id' };
        }
        const target = resolveCatalogUrl(request.url, { pathPrefix: '/downloads/' });
        if (!target) {
            return { ok: false, error: 'market-bad-url' };
        }
        const expected = String(request.sha256 ?? '').toLowerCase();
        if (!SHA256_PATTERN.test(expected)) {
            return { ok: false, error: 'market-no-checksum' };
        }

        const file = packagePath(id, request.version);
        try {
            const stat = fs.statSync(file);
            if (stat.size > 0 && stat.size <= MARKET_MAX_BYTES) {
                const existing = fs.readFileSync(file);
                if (sha256Of(existing) === expected) {
                    return { ok: true, path: file, size: existing.length, cached: true };
                }
            }
        } catch {
            // No cached copy yet.
        }

        const controller = new AbortController();
        const untrack = track(controller);
        const timer = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
        try {
            const response = await fetch(target, {
                headers: { accept: 'application/zip,application/octet-stream' },
                signal: controller.signal,
                redirect: 'follow',
            });
            if (!response.ok) {
                return { ok: false, error: `download-http-${response.status}` };
            }
            if (response.url) {
                const finalUrl = new URL(response.url);
                if (finalUrl.protocol !== 'https:' || finalUrl.origin !== CATALOG_ORIGIN) {
                    return { ok: false, error: 'download-bad-origin' };
                }
            }
            const declared = Number(response.headers.get('content-length'));
            if (Number.isFinite(declared) && declared > MARKET_MAX_BYTES) {
                return { ok: false, error: 'install-too-large' };
            }

            const chunks = [];
            let total = 0;
            if (response.body) {
                const reader = response.body.getReader();
                for (;;) {
                    // eslint-disable-next-line no-await-in-loop
                    const { done, value } = await reader.read();
                    if (done) {
                        break;
                    }
                    total += value.length;
                    if (total > MARKET_MAX_BYTES) {
                        await reader.cancel();
                        return { ok: false, error: 'install-too-large' };
                    }
                    chunks.push(Buffer.from(value));
                }
            } else {
                const buffer = Buffer.from(await response.arrayBuffer());
                total = buffer.length;
                chunks.push(buffer);
            }
            if (total === 0) {
                return { ok: false, error: 'download-empty' };
            }
            const buffer = Buffer.concat(chunks, total);
            if (sha256Of(buffer) !== expected) {
                api.log.warn(`[plugin-manager] checksum mismatch for ${id}`);
                return { ok: false, error: 'download-checksum-mismatch' };
            }

            fs.mkdirSync(path.dirname(file), { recursive: true });
            const temp = `${file}.part`;
            fs.writeFileSync(temp, buffer);
            try {
                fs.rmSync(file, { force: true });
            } catch {
                // The rename replaces the old package.
            }
            fs.renameSync(temp, file);
            api.log.info(`[plugin-manager] downloaded ${id} v${request.version} (${total} bytes)`);
            return { ok: true, path: file, size: total, cached: false };
        } catch (error) {
            try {
                fs.rmSync(`${file}.part`, { force: true });
            } catch {
                // Nothing to clean.
            }
            return {
                ok: false,
                error: controller.signal.aborted ? 'download-timeout' : describeError(error),
            };
        } finally {
            clearTimeout(timer);
            untrack();
        }
    };

    const dropPackage = (request) => {
        const file = request && typeof request.path === 'string' ? request.path : '';
        if (!file.toLowerCase().endsWith('.zip')) {
            return { ok: false, error: 'market-bad-path' };
        }
        if (!isStrictlyInside(packagesDir(), file)) {
            return { ok: false, error: 'market-outside-cache' };
        }
        try {
            fs.rmSync(file, { force: true });
            return { ok: true };
        } catch {
            return { ok: false, error: 'market-drop-failed' };
        }
    };

    const prunePackages = () => {
        let entries = [];
        try {
            entries = fs.readdirSync(packagesDir(), { withFileTypes: true });
        } catch {
            return { ok: true, removed: 0 };
        }
        const cutoff = Date.now() - PACKAGE_TTL_MS;
        let removed = 0;
        entries.forEach((entry) => {
            if (!entry.isFile()) {
                return;
            }
            const full = path.join(packagesDir(), entry.name);
            try {
                if (fs.statSync(full).mtimeMs < cutoff) {
                    fs.rmSync(full, { force: true });
                    removed += 1;
                }
            } catch {
                // Best effort.
            }
        });
        return { ok: true, removed };
    };

    const guarded = (run) => async (...args) => {
        try {
            return await run(...args);
        } catch (error) {
            return { ok: false, error: describeError(error) };
        }
    };

    api.rpc.handle('market.catalog', guarded((options) => fetchCatalog({
        force: Boolean(options && options.force),
    })));
    api.rpc.handle('market.download', guarded((request) => downloadPackage(
        request && typeof request === 'object' ? request : {},
    )));
    api.rpc.handle('market.dropPackage', guarded((request) => dropPackage(request || {})));
    api.rpc.handle('market.prune', guarded(() => prunePackages()));

    if (typeof api.onDispose === 'function') {
        api.onDispose(() => {
            inflight.forEach((controller) => {
                try {
                    controller.abort();
                } catch {
                    // Already finished.
                }
            });
            inflight.clear();
        });
    }
};

module.exports = function activate(api) {
    const tools = createModTools();
    api.rpc.handle('manager.scan', () => tools.scan());
    api.rpc.handle('manager.delete', (payload) => tools.remove(payload));
    createMarket(api);
};