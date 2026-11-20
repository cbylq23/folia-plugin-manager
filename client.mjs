// client.mjs — 插件管家 / Plugin Manager: renderer half.
//
// A full home page that lists every Folium mod the host discovered. Enabling
// and disabling goes through the app's own bridge (window.electron.mods), so
// the loader keeps its native confirmation dialog and content binding. Delete
// has no bridge call; it goes through this mod's main entry, which only ever
// removes folders under userData/mods.
//
// The page is plain DOM inside the host-owned ShadowRoot container. No imports:
// Folium clients may only import relative files, and one file is enough here.

const HOST_TAB_ID = 'manager';

const ICONS = {
    blocks: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="7.2" height="7.2" rx="1.9"/><rect x="13.8" y="3" width="7.2" height="7.2" rx="1.9"/><rect x="3" y="13.8" width="7.2" height="7.2" rx="1.9"/><rect x="13.8" y="13.8" width="7.2" height="7.2" rx="1.9"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.4-3.4"/></svg>',
    refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8 8 0 1 0-2.35 5.65"/><path d="M20 4v7h-7"/></svg>',
    folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h4l2 2h7A2.5 2.5 0 0 1 21 9.5v8A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5v-10Z"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>',
    power: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 3v9"/><path d="M7.1 6.6a8 8 0 1 0 9.8 0"/></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4.2" height="16" rx="1.2"/><rect x="13.8" y="4" width="4.2" height="16" rx="1.2"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><path d="m6 7 1 13h10l1-13"/><path d="M10 11v5M14 11v5"/></svg>',
    alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 2.5 20h19L12 3Z"/><path d="M12 9v5"/><circle cx="12" cy="17.4" r=".9" fill="currentColor" stroke="none"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3l7 3v5c0 4.5-3 7.5-7 10-4-2.5-7-5.5-7-10V6l7-3Z"/><path d="m9 12 2 2 4-4" stroke-linecap="round"/></svg>',
    flask: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6"/><path d="M10 3v5l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3"/><path d="M7.4 15h9.2"/></svg>',
    inbox: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 13h4l2 3h4l2-3h4"/><path d="M5 5h14l1 8v6H4v-6l1-8Z"/></svg>',
    monitor: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
    store: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10v9h16v-9"/><path d="M3 5h18l1 5a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0l1-5Z"/><path d="M9 19v-5h6v5"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.1 0l-2 2A5 5 0 0 0 12 20.1l1.1-1.1"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m7 11 5 5 5-5"/><path d="M4 20h16"/></svg>',
};

const TEXT = {
    zh: {
        title: '插件管家',
        subtitle: '管理已安装的 Folium 插件',
        stats: { total: '共 {n} 个', enabled: '已启用 {n}', disabled: '已停用 {n}', abnormal: '异常 {n}' },
        search: '搜索名称、ID、作者…',
        clearSearch: '清除搜索',
        selectAll: '全选',
        clearSelectAll: '取消全选',
        refresh: '刷新',
        openDir: '打开插件目录',
        loading: '正在读取插件…',
        emptyTitle: '还没有安装插件',
        emptyBody: '把插件文件夹或 .zip 放进插件目录，然后在「设置 → 模组」中启用模组系统。',
        noMatch: '没有匹配的插件',
        noMatchBody: '换个关键词试试，或清除搜索条件。',
        bridgeMissing: '仅 Folia 桌面版可用',
        bridgeMissingBody: '当前环境没有 Folia 的模组桥接，无法管理插件。',
        selected: '已选 {n} 项',
        actionSummary: '可启用 {enable} · 可关闭 {disable} · 可删除 {delete}',
        skippedBuiltin: '内置/仓库插件会被跳过',
        enable: '启用',
        disable: '关闭',
        delete: '删除',
        clear: '清除选择',
        badgeSelf: '本插件',
        badgeVerified: '官方认证',
        badgeBeta: '先行测试',
        badgeInvalid: '签名异常',
        badgeUnsigned: '未验证',
        badgeDev: '仓库',
        badgeBuiltin: '内置',
        badgeDuplicate: '重复 ID',
        statusEnabled: '已启用',
        statusDisabled: '已停用',
        statusError: '加载出错',
        statusDependency: '依赖缺失',
        statusSkipped: '本次未加载',
        statusStale: '需重新确认',
        statusBroken: '文件损坏',
        statusAmbiguous: '位置冲突',
        selfHint: '插件管家不能停用或删除自己',
        brokenHint: '插件文件不完整，无法启用',
        sourceDev: '仓库目录',
        sourceResources: '内置目录',
        busyEnable: '正在启用 {i}/{n}：{name}',
        busyDisable: '正在关闭 {i}/{n}：{name}',
        busyDelete: '正在删除 {i}/{n}：{name}',
        busyWait: '等待系统确认…',
        confirmTitle: '删除插件',
        confirmBody: '以下插件将从用户插件目录中移除，操作不可撤销。',
        confirmSkipped: '以下插件无法删除，将被跳过：',
        purgeLabel: '同时删除插件数据与缓存',
        purgeHint: '包括该插件的设置、密钥与缓存文件；删除后无法恢复。',
        cancel: '取消',
        confirmDelete: '删除 {n} 项',
        reasonSelf: '插件管家自身',
        reasonBuiltin: '内置插件',
        reasonRepo: '仓库中的开发插件',
        reasonUnknown: '无法确定安装位置',
        reasonSymlink: '符号链接',
        reasonAmbiguous: '安装位置与其他插件冲突',
        noticeEnableStart: '启用未验证的插件时，Folia 会为每个插件弹出一次原生确认窗口。',
        noticeEnableDone: '已启用 {n} 个插件。',
        noticeDisableDone: '已关闭 {n} 个插件。',
        noticeDeleteDone: '已删除 {n} 个插件。',
        noticeDeleteDoneData: '已删除 {n} 个插件，并清理了数据与缓存。',
        noticePartial: '{done} 项完成，{failed} 项未完成。',
        noticeNothing: '没有可执行此操作的选中项。',
        noticeRefreshFailed: '刷新失败：{message}',
        noticeScanFailed: '插件目录扫描失败，删除功能暂不可用。',
        noticeDeleteNone: '选中的插件都不能在这里删除。',
        noticeDeclined: '已取消启用。',
        noticeDataSkipped: '{n} 个插件的数据因与其他副本共用或位置未知而未清理。',
        marketTab: '社区市场',
        installedTab: '已安装',
        marketSearch: '搜索社区模组、作者、ID…',
        marketRefresh: '刷新目录',
        marketUpdateAll: '全部更新',
        marketUpdateAllCount: '全部更新 ({n})',
        marketFilterAll: '全部',
        marketFilterOfficial: '官方',
        marketFilterCommunity: '社区',
        marketFilterBeta: 'Beta',
        marketFilterUpdates: '可更新',
        marketFilterInstalled: '已安装',
        marketLoading: '正在读取模组社区…',
        marketEmpty: '模组社区暂时没有内容',
        marketEmptyHint: '目录里还没有可安装的模组。',
        marketNoMatch: '没有匹配的模组',
        marketNoMatchHint: '换个关键词或筛选条件试试。',
        marketUnavailable: '模组社区暂时不可用',
        marketRetry: '重试',
        marketCacheBanner: '当前显示的是 {age} 的缓存。{error}',
        marketRefreshFailed: '刷新目录失败：{message}',
        marketAgeJustNow: '刚刚',
        marketAgeMinutes: '{n} 分钟前',
        marketAgeHours: '{n} 小时前',
        marketAgeDays: '{n} 天前',
        marketCounts: '目录 {total} 个 · 已安装 {installed} · 可更新 {updates}',
        marketCacheSuffix: '（缓存）',
        marketNotInstalled: '未安装',
        marketInstalled: '已安装',
        marketInstalledVersion: '已安装 v{version}',
        marketBuiltinVersion: '内置 · v{version}',
        marketRepoVersion: '仓库版本',
        marketLockedHint: '当前加载的是仓库版本，市场安装不会生效。',
        marketUpdate: '更新',
        marketInstall: '安装',
        marketEnable: '启用',
        marketEnabled: '已启用',
        marketUpdateBadge: '可更新',
        marketJobDownload: '下载中…',
        marketJobInstall: '安装中…',
        marketJobEnable: '等待确认…',
        marketStartUpdateAll: '开始更新 {n} 个模组',
        marketNoUpdates: '没有可更新的模组',
        marketAllUpdated: '更新流程结束',
        marketDownloadFailed: '「{name}」下载失败：{message}',
        marketInstallFailed: '「{name}」安装失败：{message}',
        marketInstalledEnabled: '「{name}」已安装并启用',
        marketInstalledDeclined: '「{name}」已安装，你取消了启用',
        marketInstalledEnableFailed: '「{name}」已安装，但启用失败：{message}',
        marketEnableFailed: '「{name}」启用失败：{message}',
        marketDetailPermissions: '权限',
        marketDetailNoPermissions: '不需要额外权限',
        marketDetailDepends: '依赖',
        marketDetailNoDepends: '没有依赖',
        marketDetailSource: '源码仓库',
        marketDetailPage: '官网页面',
        marketDetailAuthor: '作者',
        marketDetailOwners: '维护者',
        marketDetailVersion: '版本',
        marketDetailSize: '包大小',
        marketDetailSigned: '签名时间',
        marketDetailChannel: '渠道',
        marketDetailWarning: '模组以完整权限运行，只安装你信任的来源。启用时 Folia 仍会显示原生确认窗口。',
        marketDetailBetaWarning: '这是先行测试模组：只通过了安全审查，功能可能不完整。',
        marketOfficial: '官方',
        marketCommunity: '社区',
        marketBeta: '先行测试',
        marketRelease: '正式',
        marketOpenFailed: '无法打开链接。',
        marketErrorUnknown: '未知错误',
        marketNoDownload: '这个模组没有可下载的安装包。',
        marketBytesB: '{n} B',
        marketBytesKB: '{n} KB',
        marketBytesMB: '{n} MB',
        marketErrors: {
            timeout: '请求超时',
            network: '网络错误：{message}',
            http: '服务器返回 {status}',
            format: '目录格式不正确',
            checksum: '安装包校验失败，已丢弃',
            noChecksum: '目录缺少安装包哈希，已拒绝',
            badUrl: '下载地址不在官方域名下，已拒绝',
            badOrigin: '下载跳转到了非官方域名，已拒绝',
            tooLarge: '安装包超过 64 MB',
            empty: '下载内容为空',
            noBridge: '当前环境没有 Folia 安装桥接',
            install: '宿主的安装器拒绝了安装包：{message}',
            cache: '缓存目录不可用（需要 filesystem.data 权限）',
        },
        errors: {
            bridge: '仅 Folia 桌面版可用',
            systemOff: '模组系统总开关已关闭，请先在「设置 → 模组」中开启',
            notFound: '找不到该插件，可能已被移动或删除',
            unverifiable: '插件文件无法校验，请检查文件是否完整',
            declined: '已取消启用',
            selfProtected: '不能删除插件管家自身',
            builtin: '内置插件不能删除',
            repo: '仓库中的开发插件不能删除',
            outside: '目标不在用户插件目录中，已拒绝',
            symlink: '目标是符号链接，已拒绝删除',
            ambiguous: '安装位置与其他插件冲突，已拒绝删除',
            invalid: '插件 ID 无效',
            deleteFailed: '删除失败：{message}',
            unknown: '未知错误',
        },
    },
    en: {
        title: 'Plugin Manager',
        subtitle: 'Manage the Folium mods installed in Folia',
        stats: { total: '{n} total', enabled: '{n} enabled', disabled: '{n} disabled', abnormal: '{n} issues' },
        search: 'Search name, ID, author…',
        clearSearch: 'Clear search',
        selectAll: 'Select all',
        clearSelectAll: 'Clear selection',
        refresh: 'Refresh',
        openDir: 'Open mods folder',
        loading: 'Reading mods…',
        emptyTitle: 'No mods installed yet',
        emptyBody: 'Drop a mod folder or .zip into the mods folder, then turn on the mod system in Settings → Mods.',
        noMatch: 'No matching mods',
        noMatchBody: 'Try another keyword, or clear the search.',
        bridgeMissing: 'Desktop app only',
        bridgeMissingBody: 'This environment has no Folia mod bridge, so mods cannot be managed here.',
        selected: '{n} selected',
        actionSummary: '{enable} to enable · {disable} to disable · {delete} to delete',
        skippedBuiltin: 'Built-in/repository mods will be skipped',
        enable: 'Enable',
        disable: 'Disable',
        delete: 'Delete',
        clear: 'Clear selection',
        badgeSelf: 'This mod',
        badgeVerified: 'Verified',
        badgeBeta: 'Preview',
        badgeInvalid: 'Bad signature',
        badgeUnsigned: 'Unsigned',
        badgeDev: 'Repo',
        badgeBuiltin: 'Built-in',
        badgeDuplicate: 'Duplicate ID',
        statusEnabled: 'Enabled',
        statusDisabled: 'Disabled',
        statusError: 'Load error',
        statusDependency: 'Missing dependency',
        statusSkipped: 'Skipped this run',
        statusStale: 'Confirm again',
        statusBroken: 'Broken files',
        statusAmbiguous: 'Folder conflict',
        selfHint: 'The Plugin Manager cannot disable or delete itself',
        brokenHint: 'The mod files are incomplete and cannot be enabled',
        sourceDev: 'Repository folder',
        sourceResources: 'Built-in folder',
        busyEnable: 'Enabling {i}/{n}: {name}',
        busyDisable: 'Disabling {i}/{n}: {name}',
        busyDelete: 'Deleting {i}/{n}: {name}',
        busyWait: 'Waiting for the system dialog…',
        confirmTitle: 'Delete mods',
        confirmBody: 'These mods will be removed from the per-user mods folder. This cannot be undone.',
        confirmSkipped: 'These mods cannot be deleted and will be skipped:',
        purgeLabel: 'Also delete mod data and cache',
        purgeHint: 'Settings, secrets and cached files for these mods will be removed permanently.',
        cancel: 'Cancel',
        confirmDelete: 'Delete {n}',
        reasonSelf: 'the Plugin Manager itself',
        reasonBuiltin: 'built-in mod',
        reasonRepo: 'repository mod',
        reasonUnknown: 'installation folder unknown',
        reasonSymlink: 'symbolic link',
        reasonAmbiguous: 'installation folder conflicts with another mod',
        noticeEnableStart: 'Folia asks for a native confirmation once per mod when enabling unsigned mods.',
        noticeEnableDone: 'Enabled {n} mods.',
        noticeDisableDone: 'Disabled {n} mods.',
        noticeDeleteDone: 'Deleted {n} mods.',
        noticeDeleteDoneData: 'Deleted {n} mods and cleaned their data and cache.',
        noticePartial: '{done} done, {failed} not done.',
        noticeNothing: 'Nothing selected can do that.',
        noticeRefreshFailed: 'Refresh failed: {message}',
        noticeScanFailed: 'The mods folder could not be scanned; deleting is unavailable.',
        noticeDeleteNone: 'None of the selected mods can be deleted here.',
        noticeDeclined: 'Enabling was cancelled.',
        noticeDataSkipped: 'Data for {n} mods was kept because it is shared or its location is unknown.',
        marketTab: 'Community',
        installedTab: 'Installed',
        marketSearch: 'Search community mods, authors, IDs…',
        marketRefresh: 'Refresh catalog',
        marketUpdateAll: 'Update all',
        marketUpdateAllCount: 'Update all ({n})',
        marketFilterAll: 'All',
        marketFilterOfficial: 'Official',
        marketFilterCommunity: 'Community',
        marketFilterBeta: 'Beta',
        marketFilterUpdates: 'Updates',
        marketFilterInstalled: 'Installed',
        marketLoading: 'Loading the mod community…',
        marketEmpty: 'The community is empty',
        marketEmptyHint: 'No installable mods in the catalog yet.',
        marketNoMatch: 'No matching mods',
        marketNoMatchHint: 'Try another keyword or filter.',
        marketUnavailable: 'The mod community is unavailable',
        marketRetry: 'Retry',
        marketCacheBanner: 'Showing a cached catalog from {age}. {error}',
        marketRefreshFailed: 'Catalog refresh failed: {message}',
        marketAgeJustNow: 'just now',
        marketAgeMinutes: '{n} min ago',
        marketAgeHours: '{n} h ago',
        marketAgeDays: '{n} d ago',
        marketCounts: '{total} in catalog · {installed} installed · {updates} updates',
        marketCacheSuffix: ' (cached)',
        marketNotInstalled: 'Not installed',
        marketInstalled: 'Installed',
        marketInstalledVersion: 'Installed v{version}',
        marketBuiltinVersion: 'Built-in · v{version}',
        marketRepoVersion: 'Repository copy',
        marketLockedHint: 'The repository copy is active; installing from the market would not take effect.',
        marketUpdate: 'Update',
        marketInstall: 'Install',
        marketEnable: 'Enable',
        marketEnabled: 'Enabled',
        marketUpdateBadge: 'Update',
        marketJobDownload: 'Downloading…',
        marketJobInstall: 'Installing…',
        marketJobEnable: 'Waiting for confirmation…',
        marketStartUpdateAll: 'Updating {n} mods',
        marketNoUpdates: 'No updates available',
        marketAllUpdated: 'Update run finished',
        marketDownloadFailed: '{name}: download failed: {message}',
        marketInstallFailed: '{name}: install failed: {message}',
        marketInstalledEnabled: '{name} installed and enabled',
        marketInstalledDeclined: '{name} installed; enabling was cancelled',
        marketInstalledEnableFailed: '{name} installed but enabling failed: {message}',
        marketEnableFailed: '{name}: enabling failed: {message}',
        marketDetailPermissions: 'Permissions',
        marketDetailNoPermissions: 'No extra permissions',
        marketDetailDepends: 'Dependencies',
        marketDetailNoDepends: 'No dependencies',
        marketDetailSource: 'Source repository',
        marketDetailPage: 'Market page',
        marketDetailAuthor: 'Author',
        marketDetailOwners: 'Maintainers',
        marketDetailVersion: 'Version',
        marketDetailSize: 'Package size',
        marketDetailSigned: 'Signed',
        marketDetailChannel: 'Channel',
        marketDetailWarning: 'Mods run with full privileges; only install sources you trust. Folia still shows its native confirmation when enabling.',
        marketDetailBetaWarning: 'This is a preview mod: it passed the security review only and may be incomplete.',
        marketOfficial: 'Official',
        marketCommunity: 'Community',
        marketBeta: 'Preview',
        marketRelease: 'Release',
        marketOpenFailed: 'Could not open the link.',
        marketErrorUnknown: 'Unknown error',
        marketNoDownload: 'This mod has no downloadable package.',
        marketBytesB: '{n} B',
        marketBytesKB: '{n} KB',
        marketBytesMB: '{n} MB',
        marketErrors: {
            timeout: 'Request timed out',
            network: 'Network error: {message}',
            http: 'Server returned {status}',
            format: 'The catalog format is invalid',
            checksum: 'Package checksum mismatch; discarded',
            noChecksum: 'The catalog has no package checksum; refused',
            badUrl: 'The download URL is not on the official host; refused',
            badOrigin: 'The download redirected off the official host; refused',
            tooLarge: 'The package exceeds 64 MB',
            empty: 'The download was empty',
            noBridge: 'This environment has no Folia install bridge',
            install: 'The host installer rejected the package: {message}',
            cache: 'The cache folder is unavailable (needs filesystem.data)',
        },
        errors: {
            bridge: 'Desktop app only',
            systemOff: 'The mod system is off. Turn it on in Settings → Mods first.',
            notFound: 'Mod not found; it may have been moved or deleted',
            unverifiable: 'The mod files cannot be verified; check that they are complete',
            declined: 'Enabling was cancelled',
            selfProtected: 'The Plugin Manager cannot delete itself',
            builtin: 'Built-in mods cannot be deleted',
            repo: 'Repository mods cannot be deleted',
            outside: 'The target is outside the per-user mods folder; refused',
            symlink: 'The target is a symbolic link; refused',
            ambiguous: 'The installation folder conflicts with another mod; refused',
            invalid: 'Invalid mod id',
            deleteFailed: 'Delete failed: {message}',
            unknown: 'Unknown error',
        },
    },
};

const CSS = `
* { box-sizing: border-box; }
.pm-root {
    --pm-primary: var(--folium-primary, #a78bfa);
    --pm-accent: var(--folium-accent, #f472b6);
    --pm-surface: color-mix(in srgb, var(--folium-bg, #17171d) 86%, transparent);
    --pm-surface-solid: color-mix(in srgb, var(--folium-bg, #17171d) 96%, transparent);
    --pm-line: color-mix(in srgb, currentColor 11%, transparent);
    --pm-line-strong: color-mix(in srgb, currentColor 20%, transparent);
    --pm-hover: color-mix(in srgb, currentColor 5%, transparent);
    --pm-muted: color-mix(in srgb, currentColor 56%, transparent);
    --pm-faint: color-mix(in srgb, currentColor 38%, transparent);
    --pm-ok: color-mix(in srgb, #34d399 55%, currentColor);
    --pm-warn: color-mix(in srgb, #fbbf24 58%, currentColor);
    --pm-danger: color-mix(in srgb, #f87171 60%, currentColor);
    --pm-radius: 18px;
    position: relative;
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    overflow: hidden;
    font: 14px/1.55 var(--folium-font, system-ui, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif);
    -webkit-font-smoothing: antialiased;
}
.pm-root::before {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
        radial-gradient(900px 380px at 88% -12%, color-mix(in srgb, var(--pm-primary) 13%, transparent), transparent 68%),
        radial-gradient(700px 320px at 4% 108%, color-mix(in srgb, var(--pm-accent) 8%, transparent), transparent 72%);
}
.pm-shell {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
}
.pm-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 18px;
    padding: 26px 30px 0;
    flex-wrap: wrap;
}
.pm-heading { display: flex; align-items: flex-start; gap: 15px; min-width: 0; }
.pm-logo {
    width: 46px;
    height: 46px;
    flex: none;
    border-radius: 15px;
    display: grid;
    place-items: center;
    color: #fff;
    background: linear-gradient(135deg, var(--pm-primary), var(--pm-accent));
    box-shadow: 0 10px 26px color-mix(in srgb, var(--pm-primary) 30%, transparent);
}
.pm-logo .pm-icon svg { width: 24px; height: 24px; }
.pm-title { margin: 0; font-size: 23px; line-height: 1.15; font-weight: 750; letter-spacing: -.02em; }
.pm-subtitle {
    margin: 6px 0 0;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px 11px;
    font-size: 12.5px;
    color: var(--pm-muted);
}
.pm-stat { display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; }
.pm-stat-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; opacity: .4; }
.pm-stat-ok .pm-stat-dot { background: var(--pm-ok); opacity: 1; }
.pm-stat-warn .pm-stat-dot { background: var(--pm-warn); opacity: 1; }
.pm-header-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.pm-icon { display: inline-flex; align-items: center; justify-content: center; }
.pm-icon svg { width: 16px; height: 16px; display: block; }
.pm-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 1px solid var(--pm-line);
    background: var(--pm-hover);
    color: inherit;
    border-radius: 999px;
    padding: 7px 13px;
    font: inherit;
    font-size: 12.5px;
    line-height: 1.2;
    cursor: pointer;
    white-space: nowrap;
    transition: background .16s, border-color .16s, transform .16s, opacity .16s;
}
.pm-btn .pm-icon svg { width: 14px; height: 14px; }
.pm-btn:hover:not(:disabled) { background: color-mix(in srgb, currentColor 9%, transparent); border-color: var(--pm-line-strong); }
.pm-btn:active:not(:disabled) { transform: scale(.97); }
.pm-btn:disabled { opacity: .35; cursor: not-allowed; }
.pm-btn-primary {
    color: color-mix(in srgb, var(--pm-primary) 62%, currentColor);
    background: color-mix(in srgb, var(--pm-primary) 16%, transparent);
    border-color: color-mix(in srgb, var(--pm-primary) 42%, transparent);
    font-weight: 650;
}
.pm-btn-primary:hover:not(:disabled) { background: color-mix(in srgb, var(--pm-primary) 24%, transparent); border-color: color-mix(in srgb, var(--pm-primary) 58%, transparent); }
.pm-btn-danger {
    color: var(--pm-danger);
    background: color-mix(in srgb, #ef4444 12%, transparent);
    border-color: color-mix(in srgb, #ef4444 30%, transparent);
}
.pm-btn-danger:hover:not(:disabled) { background: color-mix(in srgb, #ef4444 19%, transparent); border-color: color-mix(in srgb, #ef4444 45%, transparent); }
.pm-btn-danger-solid { background: #ef4444; border-color: transparent; color: #fff; font-weight: 650; }
.pm-btn-danger-solid:hover:not(:disabled) { background: #dc2626; border-color: transparent; }
.pm-count {
    min-width: 17px;
    height: 17px;
    padding: 0 5px;
    border-radius: 999px;
    display: inline-grid;
    place-items: center;
    font-size: 10px;
    font-weight: 700;
    background: color-mix(in srgb, currentColor 12%, transparent);
}
.pm-icon-btn {
    width: 32px;
    height: 32px;
    flex: none;
    display: inline-grid;
    place-items: center;
    border-radius: 9px;
    border: 1px solid transparent;
    background: transparent;
    color: inherit;
    cursor: pointer;
    opacity: .65;
    transition: background .16s, opacity .16s;
}
.pm-icon-btn:hover { background: var(--pm-hover); opacity: 1; }
.pm-icon-btn:disabled { opacity: .25; cursor: not-allowed; }
.pm-toolbar {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 12px;
    padding: 20px 30px 14px;
    flex-wrap: wrap;
}
.pm-search {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1 1 240px;
    max-width: 380px;
    height: 38px;
    padding: 0 12px;
    border-radius: 12px;
    border: 1px solid var(--pm-line);
    background: var(--pm-surface);
    transition: border-color .16s, background .16s;
}
.pm-search:focus-within { border-color: color-mix(in srgb, var(--pm-primary) 55%, transparent); background: var(--pm-surface-solid); }
.pm-search > .pm-icon { opacity: .45; flex: none; }
.pm-search input {
    flex: 1;
    min-width: 0;
    border: 0;
    outline: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: 13px;
}
.pm-search input::placeholder { color: var(--pm-faint); }
.pm-search-clear {
    width: 22px;
    height: 22px;
    flex: none;
    display: grid;
    place-items: center;
    border: 0;
    border-radius: 50%;
    background: color-mix(in srgb, currentColor 9%, transparent);
    color: inherit;
    cursor: pointer;
    opacity: .7;
}
.pm-search-clear .pm-icon svg { width: 11px; height: 11px; }
.pm-search-clear[hidden] { display: none; }
.pm-tools { display: flex; align-items: center; gap: 9px; margin-left: auto; }
.pm-notice {
    margin: 0 30px 10px;
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 9px 12px;
    border-radius: 11px;
    border: 1px solid;
    font-size: 12px;
    line-height: 1.5;
}
.pm-notice[hidden] { display: none; }
.pm-notice .pm-icon { flex: none; margin-top: 1px; }
.pm-notice .pm-icon svg { width: 15px; height: 15px; }
.pm-notice-text { flex: 1; min-width: 0; word-break: break-word; }
.pm-notice-close { border: 0; background: none; color: inherit; opacity: .55; cursor: pointer; padding: 0; display: grid; place-items: center; }
.pm-notice-close:hover { opacity: 1; }
.pm-notice-close .pm-icon svg { width: 13px; height: 13px; }
.pm-notice-ok { color: var(--pm-ok); background: color-mix(in srgb, #34d399 9%, transparent); border-color: color-mix(in srgb, #34d399 24%, transparent); }
.pm-notice-info { color: color-mix(in srgb, var(--pm-primary) 58%, currentColor); background: color-mix(in srgb, var(--pm-primary) 8%, transparent); border-color: color-mix(in srgb, var(--pm-primary) 20%, transparent); }
.pm-notice-warn { color: var(--pm-warn); background: color-mix(in srgb, #fbbf24 9%, transparent); border-color: color-mix(in srgb, #fbbf24 24%, transparent); }
.pm-notice-error { color: var(--pm-danger); background: color-mix(in srgb, #f87171 9%, transparent); border-color: color-mix(in srgb, #f87171 24%, transparent); }
.pm-list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 2px 30px 28px;
    scrollbar-width: thin;
    scrollbar-color: color-mix(in srgb, currentColor 20%, transparent) transparent;
}
.pm-list::-webkit-scrollbar { width: 9px; }
.pm-list::-webkit-scrollbar-thumb { background: color-mix(in srgb, currentColor 16%, transparent); border-radius: 999px; border: 2px solid transparent; background-clip: padding-box; }
.pm-list::-webkit-scrollbar-track { background: transparent; }
.pm-card {
    border: 1px solid var(--pm-line);
    border-radius: var(--pm-radius);
    background: var(--pm-surface);
    backdrop-filter: blur(16px) saturate(1.1);
    overflow: hidden;
}
.pm-row {
    position: relative;
    display: flex;
    align-items: center;
    gap: 13px;
    padding: 13px 15px;
    cursor: pointer;
    transition: background .14s;
}
.pm-row + .pm-row { border-top: 1px solid color-mix(in srgb, currentColor 7%, transparent); }
.pm-row:hover { background: var(--pm-hover); }
.pm-row.is-selected { background: color-mix(in srgb, var(--pm-primary) 10%, transparent); }
.pm-row.is-selected::before {
    content: "";
    position: absolute;
    left: 0;
    top: 10px;
    bottom: 10px;
    width: 2px;
    border-radius: 2px;
    background: var(--pm-primary);
}
.pm-row.is-self { cursor: default; }
.pm-check {
    width: 19px;
    height: 19px;
    flex: none;
    padding: 0;
    position: relative;
    border-radius: 6px;
    border: 1.5px solid color-mix(in srgb, currentColor 28%, transparent);
    background: transparent;
    color: inherit;
    cursor: pointer;
    transition: background .15s, border-color .15s;
}
.pm-check:hover:not(:disabled) { border-color: color-mix(in srgb, var(--pm-primary) 65%, transparent); }
.pm-check[aria-checked="true"] { background: var(--pm-primary); border-color: var(--pm-primary); }
.pm-check[aria-checked="true"]::after {
    content: "";
    position: absolute;
    left: 6px;
    top: 2.5px;
    width: 4px;
    height: 8px;
    border: solid #101014;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
}
.pm-check:disabled { opacity: .2; cursor: not-allowed; }
.pm-avatar {
    width: 38px;
    height: 38px;
    flex: none;
    border-radius: 12px;
    display: grid;
    place-items: center;
    color: #fff;
    font-size: 15px;
    font-weight: 700;
    text-transform: uppercase;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .15);
}
.pm-avatar.is-broken { background: color-mix(in srgb, currentColor 13%, transparent); color: var(--pm-muted); box-shadow: none; }
.pm-content { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.pm-name-row { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
.pm-name { font-size: 14px; font-weight: 650; letter-spacing: -.005em; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pm-meta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-size: 11.5px; color: var(--pm-muted); }
.pm-meta-item { white-space: nowrap; }
.pm-meta-sep { opacity: .3; }
.pm-desc { font-size: 12px; color: var(--pm-faint); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pm-error-line { font-size: 11.5px; color: var(--pm-danger); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; opacity: .9; }
.pm-badge {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 1px 6px;
    border-radius: 5px;
    border: 1px solid transparent;
    font-size: 9.5px;
    line-height: 1.5;
    font-weight: 600;
    letter-spacing: .02em;
    white-space: nowrap;
}
.pm-badge .pm-icon svg { width: 10px; height: 10px; }
.pm-badge-self { color: color-mix(in srgb, var(--pm-accent) 70%, currentColor); background: color-mix(in srgb, var(--pm-accent) 12%, transparent); border-color: color-mix(in srgb, var(--pm-accent) 26%, transparent); }
.pm-badge-verified { color: var(--pm-ok); background: color-mix(in srgb, #34d399 11%, transparent); border-color: color-mix(in srgb, #34d399 24%, transparent); }
.pm-badge-beta { color: color-mix(in srgb, #c084fc 66%, currentColor); background: color-mix(in srgb, #c084fc 12%, transparent); border-color: color-mix(in srgb, #c084fc 24%, transparent); }
.pm-badge-warn { color: var(--pm-warn); background: color-mix(in srgb, #fbbf24 11%, transparent); border-color: color-mix(in srgb, #fbbf24 24%, transparent); }
.pm-badge-muted { color: var(--pm-faint); background: color-mix(in srgb, currentColor 6%, transparent); border-color: color-mix(in srgb, currentColor 10%, transparent); }
.pm-badge-danger { color: var(--pm-danger); background: color-mix(in srgb, #f87171 11%, transparent); border-color: color-mix(in srgb, #f87171 24%, transparent); }
.pm-side { flex: none; display: flex; align-items: center; gap: 12px; }
.pm-pill { display: inline-flex; align-items: center; gap: 5px; padding: 3px 8px; border-radius: 999px; font-size: 11px; white-space: nowrap; }
.pm-pill .pm-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
.pm-pill-ok { color: var(--pm-ok); background: color-mix(in srgb, #34d399 11%, transparent); }
.pm-pill-warn { color: var(--pm-warn); background: color-mix(in srgb, #fbbf24 11%, transparent); }
.pm-pill-danger { color: var(--pm-danger); background: color-mix(in srgb, #f87171 11%, transparent); }
.pm-pill-muted { color: var(--pm-muted); background: color-mix(in srgb, currentColor 6%, transparent); }
.pm-switch {
    width: 42px;
    height: 24px;
    flex: none;
    position: relative;
    padding: 0;
    border-radius: 999px;
    border: 1px solid color-mix(in srgb, currentColor 16%, transparent);
    background: color-mix(in srgb, currentColor 10%, transparent);
    cursor: pointer;
    transition: background .18s, border-color .18s, opacity .18s;
}
.pm-switch::after {
    content: "";
    position: absolute;
    left: 3px;
    top: 2px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 4px rgba(0, 0, 0, .28);
    transition: transform .18s cubic-bezier(.32, .72, 0, 1);
}
.pm-switch[aria-checked="true"] { background: var(--pm-primary); border-color: var(--pm-primary); }
.pm-switch[aria-checked="true"]::after { transform: translateX(18px); }
.pm-switch:disabled { opacity: .28; cursor: not-allowed; }
.pm-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 72px 24px; text-align: center; color: var(--pm-muted); }
.pm-empty-icon {
    width: 56px;
    height: 56px;
    display: grid;
    place-items: center;
    border-radius: 18px;
    border: 1px solid var(--pm-line);
    background: color-mix(in srgb, currentColor 5%, transparent);
}
.pm-empty-icon .pm-icon svg { width: 24px; height: 24px; }
.pm-empty h3 { margin: 0; font-size: 15px; font-weight: 650; color: inherit; }
.pm-empty p { margin: 0; max-width: 430px; font-size: 12.5px; line-height: 1.6; color: var(--pm-faint); }
.pm-skeleton-row { display: flex; align-items: center; gap: 13px; padding: 15px; }
.pm-skeleton-row + .pm-skeleton-row { border-top: 1px solid color-mix(in srgb, currentColor 7%, transparent); }
.pm-skeleton {
    border-radius: 8px;
    background: linear-gradient(90deg, color-mix(in srgb, currentColor 5%, transparent) 25%, color-mix(in srgb, currentColor 10%, transparent) 37%, color-mix(in srgb, currentColor 5%, transparent) 63%);
    background-size: 400% 100%;
    animation: pm-shimmer 1.4s ease infinite;
}
@keyframes pm-shimmer { 0% { background-position: 100% 0; } 100% { background-position: 0 0; } }
.pm-actionbar {
    position: relative;
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
    max-width: 100%;
    padding: 6px 8px 6px 14px;
    border-radius: 12px;
    border: 1px solid var(--pm-line-strong);
    background: var(--pm-surface);
    backdrop-filter: blur(14px) saturate(1.1);
}
.pm-actionbar[hidden] { display: none; }
.pm-actionbar-info { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.pm-actionbar-count { display: flex; align-items: center; gap: 7px; font-size: 12.5px; font-weight: 650; white-space: nowrap; }
.pm-actionbar-sub { font-size: 10.5px; color: var(--pm-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pm-actionbar-actions { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.pm-busy-track { position: absolute; left: 12px; right: 12px; bottom: 0; height: 2px; border-radius: 2px; overflow: hidden; background: color-mix(in srgb, currentColor 10%, transparent); }
.pm-busy-track span { display: block; height: 100%; background: var(--pm-primary); transition: width .25s; }
.pm-spinner { width: 13px; height: 13px; flex: none; border-radius: 50%; border: 2px solid color-mix(in srgb, currentColor 18%, transparent); border-top-color: var(--pm-primary); animation: pm-spin .7s linear infinite; }
@keyframes pm-spin { to { transform: rotate(360deg); } }
.pm-root[data-busy="true"] .pm-row { pointer-events: none; }
.pm-modal {
    position: absolute;
    inset: 0;
    z-index: 60;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: rgba(5, 5, 8, .55);
    backdrop-filter: blur(6px);
}
.pm-modal[hidden] { display: none; }
.pm-modal-card {
    width: min(490px, 100%);
    max-height: min(680px, 100%);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-radius: 22px;
    border: 1px solid var(--pm-line-strong);
    background: var(--pm-surface-solid);
    box-shadow: 0 30px 90px rgba(0, 0, 0, .5);
    outline: none;
}
.pm-modal-head { display: flex; align-items: flex-start; gap: 12px; padding: 20px 20px 12px; }
.pm-modal-icon { width: 38px; height: 38px; flex: none; display: grid; place-items: center; border-radius: 12px; }
.pm-modal-icon.danger { color: var(--pm-danger); background: color-mix(in srgb, #f87171 12%, transparent); }
.pm-modal-head h2 { margin: 0; font-size: 16px; font-weight: 700; }
.pm-modal-head p { margin: 4px 0 0; font-size: 12px; line-height: 1.5; color: var(--pm-muted); }
.pm-modal-head .pm-icon-btn { margin-left: auto; }
.pm-modal-body { padding: 4px 20px 18px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; }
.pm-delete-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 5px; }
.pm-delete-item { display: flex; align-items: center; gap: 9px; padding: 9px 11px; border-radius: 10px; border: 1px solid var(--pm-line); background: color-mix(in srgb, currentColor 4%, transparent); font-size: 12.5px; }
.pm-delete-dot { width: 6px; height: 6px; flex: none; border-radius: 50%; background: var(--pm-danger); }
.pm-delete-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }
.pm-delete-version { flex: none; font-size: 10.5px; color: var(--pm-muted); }
.pm-skip-block { border-radius: 10px; border: 1px solid var(--pm-line); background: color-mix(in srgb, currentColor 3%, transparent); padding: 9px 11px; font-size: 11.5px; color: var(--pm-muted); }
.pm-skip-title { font-weight: 600; margin-bottom: 4px; }
.pm-skip-block ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 3px; }
.pm-skip-block li { display: flex; gap: 6px; }
.pm-skip-reason { color: var(--pm-faint); }
.pm-purge-row { display: flex; align-items: flex-start; gap: 9px; font-size: 12.5px; cursor: pointer; }
.pm-purge-row input { margin: 3px 0 0; accent-color: var(--pm-primary); }
.pm-purge-row span { display: flex; flex-direction: column; gap: 2px; }
.pm-purge-hint { font-size: 11px; color: var(--pm-faint); }
.pm-modal-actions { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 20px 18px; border-top: 1px solid var(--pm-line); }
.pm-tabs { display: flex; align-items: center; gap: 4px; padding: 14px 30px 0; flex-wrap: wrap; }
.pm-tab {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--pm-muted);
    border-radius: 10px;
    padding: 7px 12px;
    font: inherit;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: background .16s, color .16s, border-color .16s;
}
.pm-tab:hover { background: var(--pm-hover); color: inherit; }
.pm-tab.is-active { color: inherit; background: color-mix(in srgb, var(--pm-primary) 13%, transparent); border-color: color-mix(in srgb, var(--pm-primary) 30%, transparent); }
.pm-tab .pm-icon svg { width: 15px; height: 15px; }
.pm-tab-count { min-width: 16px; padding: 1px 6px; border-radius: 999px; background: color-mix(in srgb, currentColor 9%, transparent); color: var(--pm-muted); font-size: 10.5px; font-weight: 700; text-align: center; }
.pm-tab.is-active .pm-tab-count { color: inherit; background: color-mix(in srgb, currentColor 12%, transparent); }
.pm-tab-badge { min-width: 16px; height: 16px; padding: 0 5px; display: inline-grid; place-items: center; border-radius: 999px; background: color-mix(in srgb, #fbbf24 18%, transparent); color: var(--pm-warn); font-size: 9.5px; font-weight: 800; }
.pm-tab-badge[hidden] { display: none; }
.pm-tools[hidden], .pm-market-tools[hidden], .pm-market-filters[hidden] { display: none; }
.pm-market-filters { display: flex; flex-wrap: wrap; gap: 6px; padding: 0 30px 12px; }
.pm-chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    border: 1px solid var(--pm-line);
    background: var(--pm-hover);
    color: var(--pm-muted);
    border-radius: 999px;
    padding: 4px 10px;
    font: inherit;
    font-size: 11.5px;
    cursor: pointer;
    transition: background .14s, border-color .14s, color .14s;
}
.pm-chip:hover { color: inherit; border-color: var(--pm-line-strong); }
.pm-chip.is-active { color: color-mix(in srgb, var(--pm-primary) 60%, currentColor); background: color-mix(in srgb, var(--pm-primary) 14%, transparent); border-color: color-mix(in srgb, var(--pm-primary) 38%, transparent); }
.pm-chip-count { font-size: 9.5px; font-weight: 700; opacity: .65; }
.pm-market-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 14px; padding-bottom: 8px; }
.pm-market-card {
    position: relative;
    display: flex;
    flex-direction: column;
    min-width: 0;
    border: 1px solid var(--pm-line);
    border-radius: 16px;
    background: var(--pm-surface);
    overflow: hidden;
    cursor: pointer;
    transition: transform .16s, border-color .16s, background .16s;
}
.pm-market-card:hover { transform: translateY(-2px); border-color: var(--pm-line-strong); background: var(--pm-surface-solid); }
.pm-market-card.is-busy { border-color: color-mix(in srgb, var(--pm-primary) 45%, transparent); }
.pm-market-cover { position: relative; aspect-ratio: 16 / 9; flex: none; overflow: hidden; background: linear-gradient(135deg, color-mix(in srgb, var(--pm-primary) 24%, transparent), color-mix(in srgb, var(--pm-accent) 14%, transparent)); }
.pm-market-cover img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
.pm-market-cover-letter { position: absolute; inset: 0; display: grid; place-items: center; color: rgba(255, 255, 255, .82); font-size: 42px; font-weight: 800; letter-spacing: -.03em; }
.pm-market-cover-badges { position: absolute; left: 8px; top: 8px; right: 8px; display: flex; flex-wrap: wrap; gap: 5px; }
.pm-badge-overlay { background: rgba(10, 10, 14, .62); border-color: rgba(255, 255, 255, .16); color: #fff; backdrop-filter: blur(8px); }
.pm-badge-community { color: color-mix(in srgb, #60a5fa 66%, currentColor); background: color-mix(in srgb, #60a5fa 11%, transparent); border-color: color-mix(in srgb, #60a5fa 24%, transparent); }
.pm-badge-update { color: var(--pm-warn); background: color-mix(in srgb, #fbbf24 12%, transparent); border-color: color-mix(in srgb, #fbbf24 26%, transparent); }
.pm-market-body { display: flex; flex-direction: column; gap: 5px; flex: 1; min-width: 0; padding: 11px 13px 10px; }
.pm-market-title-row { display: flex; align-items: center; gap: 6px; min-width: 0; }
.pm-market-title { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13.5px; font-weight: 650; }
.pm-market-meta { display: flex; align-items: center; gap: 6px; min-width: 0; color: var(--pm-muted); font-size: 10.5px; }
.pm-market-meta > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pm-market-size { flex: none; margin-left: auto; opacity: .7; }
.pm-market-desc { margin: 0; min-height: 2.9em; color: var(--pm-faint); font-size: 11.5px; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.pm-market-footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 9px 13px; border-top: 1px solid color-mix(in srgb, currentColor 7%, transparent); }
.pm-market-status { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--pm-muted); font-size: 10.5px; }
.pm-market-action { padding: 5px 10px; font-size: 11px; }
.pm-market-action .pm-spinner { width: 11px; height: 11px; }
.pm-market-card.is-skeleton { cursor: default; }
.pm-market-card.is-skeleton:hover { transform: none; background: var(--pm-surface); border-color: var(--pm-line); }
.pm-market-card.is-skeleton .pm-market-cover { background: color-mix(in srgb, currentColor 5%, transparent); }
.pm-market-card.is-skeleton .pm-market-body { align-items: flex-start; }
.pm-market-banner {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin: 0 0 12px;
    padding: 9px 12px;
    border-radius: 11px;
    border: 1px solid color-mix(in srgb, #fbbf24 24%, transparent);
    background: color-mix(in srgb, #fbbf24 9%, transparent);
    color: var(--pm-warn);
    font-size: 11.5px;
    line-height: 1.5;
}
.pm-market-banner .pm-icon { flex: none; margin-top: 1px; }
.pm-market-banner .pm-icon svg { width: 15px; height: 15px; }
.pm-market-banner-text { flex: 1; min-width: 0; word-break: break-word; }
.pm-market-banner .pm-btn { flex: none; margin-left: auto; }
.pm-market-detail { width: min(560px, 100%); }
.pm-market-cover-detail { aspect-ratio: 16 / 7; }
.pm-market-cover-detail .pm-market-cover-letter { font-size: 54px; }
.pm-market-cover-detail .pm-market-cover-badges { left: 14px; top: 14px; right: 14px; }
.pm-market-detail-head { display: flex; align-items: flex-start; gap: 12px; padding: 16px 20px 8px; }
.pm-market-detail-heading { flex: 1; min-width: 0; }
.pm-market-detail-title { margin: 0; font-size: 18px; line-height: 1.25; font-weight: 750; letter-spacing: -.01em; }
.pm-market-detail-sub { margin: 5px 0 0; color: var(--pm-muted); font-size: 11.5px; }
.pm-market-detail-close { flex: none; }
.pm-market-detail-body { gap: 14px; padding-top: 6px; }
.pm-market-detail-desc { margin: 0; color: color-mix(in srgb, currentColor 80%, transparent); font-size: 12.5px; line-height: 1.65; white-space: pre-wrap; }
.pm-detail-meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 16px; }
.pm-detail-meta-item { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.pm-detail-meta-label { color: var(--pm-faint); font-size: 9.5px; letter-spacing: .06em; text-transform: uppercase; }
.pm-detail-meta-value { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--pm-muted); font-size: 11.5px; }
.pm-detail-section { display: flex; flex-direction: column; gap: 6px; }
.pm-detail-section-title { color: var(--pm-faint); font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
.pm-perm-chips { display: flex; flex-wrap: wrap; gap: 5px; }
.pm-perm-chip { padding: 2px 7px; border: 1px solid var(--pm-line); border-radius: 6px; background: color-mix(in srgb, currentColor 5%, transparent); color: var(--pm-muted); font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 10px; }
.pm-detail-muted { color: var(--pm-faint); font-size: 11.5px; }
.pm-detail-warning { display: flex; align-items: flex-start; gap: 7px; padding: 9px 11px; border: 1px solid color-mix(in srgb, #fbbf24 22%, transparent); border-radius: 10px; background: color-mix(in srgb, #fbbf24 7%, transparent); color: var(--pm-warn); font-size: 11px; line-height: 1.55; }
.pm-detail-warning .pm-icon { flex: none; margin-top: 1px; }
.pm-detail-warning .pm-icon svg { width: 14px; height: 14px; }
.pm-detail-links { display: flex; flex-wrap: wrap; gap: 6px; }
.pm-market-detail-actions { align-items: center; }
.pm-market-detail-status { margin-right: auto; color: var(--pm-muted); font-size: 11px; }
@media (max-width: 760px) {
    .pm-header { padding: 20px 18px 0; }
    .pm-tabs { padding: 12px 18px 0; }
    .pm-toolbar { padding: 16px 18px 12px; }
    .pm-market-filters { padding: 0 18px 10px; }
    .pm-list { padding: 2px 18px 24px; }
    .pm-notice { margin-left: 18px; margin-right: 18px; }
    .pm-desc, .pm-meta-author, .pm-meta-author-sep { display: none; }
    .pm-actionbar { flex: 1 1 100%; gap: 10px; }
    .pm-actionbar-sub { display: none; }
    .pm-pill { display: none; }
    .pm-market-grid { grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 10px; }
    .pm-detail-meta { grid-template-columns: 1fr; }
    .pm-market-cover-detail { aspect-ratio: 16 / 8; }
}
@media (prefers-reduced-motion: reduce) {
    .pm-root *, .pm-root *::before, .pm-root *::after { animation-duration: .001ms !important; transition-duration: .001ms !important; }
}
`;

const pickLocale = (locale) => {
    const normalized = String(locale || 'zh-CN').toLowerCase();
    return normalized.startsWith('zh') ? TEXT.zh : TEXT.en;
};

const fmt = (template, values = {}) => String(template).replace(/\{(\w+)\}/g, (match, key) => (
    values[key] === undefined || values[key] === null ? match : String(values[key])
));

const h = (tag, props = null, ...children) => {
    const node = document.createElement(tag);
    if (props) {
        Object.entries(props).forEach(([key, value]) => {
            if (value === undefined || value === null || value === false) {
                return;
            }
            if (key === 'class') {
                node.className = value;
            } else if (key === 'text') {
                node.textContent = value;
            } else if (key === 'html') {
                node.innerHTML = value;
            } else if (key === 'dataset') {
                Object.assign(node.dataset, value);
            } else if (key === 'style') {
                Object.assign(node.style, value);
            } else if (key.startsWith('on') && typeof value === 'function') {
                node.addEventListener(key.slice(2).toLowerCase(), value);
            } else {
                node.setAttribute(key, value === true ? '' : String(value));
            }
        });
    }
    children.flat().forEach((child) => {
        if (child === undefined || child === null || child === false) {
            return;
        }
        node.append(child instanceof Node ? child : document.createTextNode(String(child)));
    });
    return node;
};

const icon = (name) => h('span', { class: 'pm-icon', html: ICONS[name] || '' });

const errorText = (L, code) => {
    const raw = code === undefined || code === null ? '' : String(code);
    if (!raw) {
        return L.errors.unknown;
    }
    const separator = raw.indexOf(':');
    const head = separator === -1 ? raw : raw.slice(0, separator);
    const tail = separator === -1 ? '' : raw.slice(separator + 1);
    switch (head) {
        case 'no-electron-bridge': return L.errors.bridge;
        case 'mod-system-disabled': return L.errors.systemOff;
        case 'mod-not-found': return L.errors.notFound;
        case 'mod-content-unverifiable': return L.errors.unverifiable;
        case 'enable-declined': return L.errors.declined;
        case 'not-found': return L.errors.notFound;
        case 'self-protected': return L.errors.selfProtected;
        case 'protected-source': return tail === 'resources' ? L.errors.builtin : L.errors.repo;
        case 'outside-user-mods': return L.errors.outside;
        case 'symlink-refused': return L.errors.symlink;
        case 'ambiguous-entry': return L.errors.ambiguous;
        case 'invalid-id': return L.errors.invalid;
        case 'delete-failed': return fmt(L.errors.deleteFailed, { message: tail });
        case 'resolve-failed': return fmt(L.errors.deleteFailed, { message: tail });
        default: return raw;
    }
};

const hashHue = (value) => {
    let hash = 0;
    const text = String(value || '');
    for (let index = 0; index < text.length; index += 1) {
        hash = (hash * 31 + text.charCodeAt(index)) | 0;
    }
    return Math.abs(hash) % 360;
};

const parseSemver = (value) => {
    const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?/.exec(String(value || '').trim());
    if (!match) {
        return null;
    }
    return {
        major: Number(match[1]),
        minor: Number(match[2]),
        patch: Number(match[3]),
        pre: match[4] || '',
    };
};

const compareSemver = (left, right) => {
    const a = parseSemver(left);
    const b = parseSemver(right);
    if (!a || !b) {
        return String(left || '').localeCompare(String(right || ''));
    }
    if (a.major !== b.major) return a.major - b.major;
    if (a.minor !== b.minor) return a.minor - b.minor;
    if (a.patch !== b.patch) return a.patch - b.patch;
    if (a.pre === b.pre) return 0;
    if (!a.pre) return 1;
    if (!b.pre) return -1;
    const leftParts = a.pre.split('.');
    const rightParts = b.pre.split('.');
    for (let index = 0; index < Math.max(leftParts.length, rightParts.length); index += 1) {
        const l = leftParts[index];
        const r = rightParts[index];
        if (l === undefined) return -1;
        if (r === undefined) return 1;
        const ln = /^\d+$/.test(l) ? Number(l) : null;
        const rn = /^\d+$/.test(r) ? Number(r) : null;
        if (ln !== null && rn !== null) {
            if (ln !== rn) return ln - rn;
        } else if (ln !== null) {
            return -1;
        } else if (rn !== null) {
            return 1;
        } else if (l !== r) {
            return l.localeCompare(r);
        }
    }
    return 0;
};

const formatBytes = (bytes) => {
    const value = Number(bytes) || 0;
    if (value <= 0) return '';
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(0)} KB`;
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

const formatAge = (L, timestamp) => {
    const value = Number(timestamp) || 0;
    if (!value) return '';
    const diff = Math.max(0, Date.now() - value);
    const minute = 60 * 1000;
    if (diff < minute) return L.marketAgeJustNow;
    if (diff < 60 * minute) return fmt(L.marketAgeMinutes, { n: Math.round(diff / minute) });
    if (diff < 24 * 60 * minute) return fmt(L.marketAgeHours, { n: Math.round(diff / (60 * minute)) });
    return fmt(L.marketAgeDays, { n: Math.round(diff / (24 * 60 * minute)) });
};

const marketErrorText = (L, code) => {
    const raw = code === undefined || code === null ? '' : String(code);
    if (!raw) {
        return L.marketErrorUnknown;
    }
    if (raw === 'catalog-timeout' || raw === 'download-timeout') return L.marketErrors.timeout;
    if (raw === 'catalog-not-json' || raw === 'catalog-unexpected-format') return L.marketErrors.format;
    if (raw === 'download-checksum-mismatch') return L.marketErrors.checksum;
    if (raw === 'market-no-checksum') return L.marketErrors.noChecksum;
    if (raw === 'market-bad-url') return L.marketErrors.badUrl;
    if (raw === 'download-bad-origin') return L.marketErrors.badOrigin;
    if (raw === 'install-too-large' || raw === 'download-too-large') return L.marketErrors.tooLarge;
    if (raw === 'download-empty') return L.marketErrors.empty;
    if (raw === 'no-install-bridge') return L.marketErrors.noBridge;
    if (raw === 'permission-denied:filesystem.data') return L.marketErrors.cache;
    let match = /^catalog-http-(\d+)$/.exec(raw);
    if (match) return fmt(L.marketErrors.http, { status: match[1] });
    match = /^download-http-(\d+)$/.exec(raw);
    if (match) return fmt(L.marketErrors.http, { status: match[1] });
    match = /^install-(.+)$/.exec(raw);
    if (match) return fmt(L.marketErrors.install, { message: match[1] });
    if (/^(fetch|network|ENOTFOUND|ECONN|ETIMEDOUT)/i.test(raw)) {
        return fmt(L.marketErrors.network, { message: raw });
    }
    return raw;
};

const normalizeMod = (mod) => ({
    id: String(mod.id),
    name: typeof mod.name === 'string' && mod.name ? mod.name : String(mod.id),
    version: typeof mod.version === 'string' ? mod.version : null,
    author: typeof mod.author === 'string' ? mod.author : null,
    description: typeof mod.description === 'string' ? mod.description : null,
    status: typeof mod.status === 'string' ? mod.status : 'disabled',
    enabled: mod.enabled === true,
    trustStale: mod.trustStale === true,
    error: typeof mod.error === 'string' ? mod.error : null,
    signature: mod.signature && typeof mod.signature === 'object' ? mod.signature : { status: 'unsigned' },
    devSource: mod.devSource === true,
});

function mountManager(folium, container, ctx) {
    const L = pickLocale(ctx.locale);
    const isZhLocale = String(ctx.locale || '').toLowerCase().startsWith('zh');
    const selfId = String(folium.modId || 'plugin-manager');
    const collator = new Intl.Collator(String(ctx.locale || 'zh-CN'), { numeric: true, sensitivity: 'base' });
    const state = {
        bridgeOk: null,
        loading: true,
        mods: [],
        scan: null,
        scanByKey: new Map(),
        scanByFolder: new Map(),
        query: '',
        selected: new Set(),
        busy: null,
        notice: null,
        modal: null,
        signature: '',
        view: 'installed',
        marketDetail: null,
        market: {
            loading: false,
            loaded: false,
            catalog: null,
            error: null,
            filter: 'all',
            query: '',
            job: null,
            token: 0,
        },
    };
    let noticeTimer = null;
    let marketSearchTimer = null;
    let disposed = false;

    const bridge = () => (typeof window !== 'undefined' && window.electron && window.electron.mods
        ? window.electron.mods
        : null);

    const toast = (text, type = 'info') => {
        try {
            folium.ui.toast(text, { type, durationMs: 3600 });
        } catch {
            // The toast is a nicety; the page notice still carries the result.
        }
    };

    const scanEntryFor = (mod) => {
        if (!state.scan || !Array.isArray(state.scan.entries)) {
            return { entry: null, hostMismatch: false };
        }
        const direct = state.scanByKey.get(mod.id);
        if (direct) {
            return { entry: direct, hostMismatch: false };
        }
        const byId = state.scan.entries.find((entry) => entry.id && entry.id === mod.id && !entry.duplicate);
        if (byId) {
            return { entry: byId, hostMismatch: false };
        }
        // A manifest the loader rejects for a rule this scan does not repeat is
        // listed by its folder name; the folder is still safe to delete.
        const byFolder = state.scanByFolder.get(mod.id);
        if (byFolder) {
            return { entry: byFolder, hostMismatch: true };
        }
        return { entry: null, hostMismatch: false };
    };

    const statusInfo = (mod, entry, hostMismatch) => {
        if (hostMismatch) {
            return { key: 'error', label: L.statusError, tone: 'warn', usable: false };
        }
        if (entry && entry.ambiguous) {
            return { key: 'ambiguous', label: L.statusAmbiguous, tone: 'danger', usable: false };
        }
        if (entry && (!entry.valid || entry.duplicate)) {
            return { key: 'broken', label: L.statusBroken, tone: 'danger', usable: false };
        }
        if (mod.status === 'error') {
            return { key: 'error', label: L.statusError, tone: 'warn', usable: true };
        }
        if (mod.status === 'dependency-failed') {
            return { key: 'dependency', label: L.statusDependency, tone: 'warn', usable: true };
        }
        if (mod.trustStale) {
            return { key: 'stale', label: L.statusStale, tone: 'warn', usable: true };
        }
        if (mod.enabled && mod.status === 'loaded') {
            return { key: 'enabled', label: L.statusEnabled, tone: 'ok', usable: true };
        }
        if (mod.enabled) {
            return { key: 'skipped', label: L.statusSkipped, tone: 'muted', usable: true };
        }
        return { key: 'disabled', label: L.statusDisabled, tone: 'muted', usable: true };
    };

    const decorate = (mod) => {
        const { entry, hostMismatch } = scanEntryFor(mod);
        const status = statusInfo(mod, entry, hostMismatch);
        return {
            mod,
            entry,
            status,
            isSelf: mod.id === selfId,
            deletable: Boolean(entry && entry.source === 'user' && !entry.symlink && !entry.ambiguous && mod.id !== selfId),
        };
    };

    const decoratedMods = () => state.mods.map(decorate);

    const visibleMods = () => {
        const query = state.query.trim().toLowerCase();
        const sorted = [...decoratedMods()].sort((left, right) => collator.compare(left.mod.name, right.mod.name));
        if (!query) {
            return sorted;
        }
        return sorted.filter((item) => (
            [item.mod.name, item.mod.id, item.mod.author, item.mod.description]
                .some((value) => value && String(value).toLowerCase().includes(query))
        ));
    };

    const selectedDecorated = () => {
        const byId = new Map(decoratedMods().map((item) => [item.mod.id, item]));
        return [...state.selected].map((id) => byId.get(id)).filter(Boolean);
    };

    const actionCounts = () => {
        const selected = selectedDecorated();
        return {
            enable: selected.filter((item) => !item.mod.enabled && item.status.usable && !item.isSelf).length,
            disable: selected.filter((item) => item.mod.enabled && !item.isSelf).length,
            delete: selected.filter((item) => item.deletable).length,
        };
    };

    const reconcileSelection = () => {
        const known = new Set(state.mods.map((mod) => mod.id));
        [...state.selected].forEach((id) => {
            if (!known.has(id) || id === selfId) {
                state.selected.delete(id);
            }
        });
    };

    const nameFor = (id) => {
        const found = state.mods.find((mod) => mod.id === id);
        return found ? found.name : id;
    };

    const computeSignature = () => {
        const modsPart = state.mods.map((mod) => [
            mod.id, mod.enabled, mod.status, mod.trustStale, mod.name, mod.version, mod.error || '',
        ].join('|')).join(';');
        const scanPart = state.scan && Array.isArray(state.scan.entries)
            ? state.scan.entries.map((entry) => [entry.hostId, entry.source, entry.valid, entry.duplicate, entry.symlink].join('|')).join(';')
            : 'none';
        return `${modsPart}::${scanPart}`;
    };

    const applyMods = (mods) => {
        if (!Array.isArray(mods)) {
            return;
        }
        state.mods = mods.filter(Boolean).map(normalizeMod);
        state.signature = computeSignature();
    };

    const setNotice = (kind, text) => {
        state.notice = { kind, text };
        clearTimeout(noticeTimer);
        renderNotice();
        if (kind === 'ok' || kind === 'info') {
            noticeTimer = setTimeout(() => {
                if (state.notice && state.notice.text === text) {
                    state.notice = null;
                    renderNotice();
                }
            }, 8000);
        }
    };

    const setEnabled = async (id, enabled) => {
        const api = bridge();
        if (!api) {
            return { ok: false, error: 'no-electron-bridge', mods: [] };
        }
        try {
            const result = await api.setModEnabled(id, enabled);
            return {
                ok: Boolean(result && result.ok),
                error: result && result.error ? result.error : null,
                mods: result && Array.isArray(result.mods) ? result.mods : [],
            };
        } catch (error) {
            return { ok: false, error: error && error.message ? error.message : String(error), mods: [] };
        }
    };

    const installZip = async (zipPath) => {
        const api = bridge();
        if (!api || typeof api.installModFromZip !== 'function') {
            return { ok: false, error: 'no-install-bridge', id: null };
        }
        try {
            const result = await api.installModFromZip(zipPath);
            return {
                ok: Boolean(result && result.ok),
                error: result && result.error ? result.error : null,
                id: result && result.id ? result.id : null,
            };
        } catch (error) {
            return { ok: false, error: error && error.message ? error.message : String(error), id: null };
        }
    };

    // ---- market data ------------------------------------------------------

    const installedMaps = () => {
        const hostMap = new Map(state.mods.map((mod) => [mod.id, mod]));
        const userMap = new Map();
        const shadowMap = new Map();
        if (state.scan && Array.isArray(state.scan.entries)) {
            state.scan.entries.forEach((entry) => {
                if (!entry.valid || entry.duplicate || !entry.id || entry.hostId !== entry.id) {
                    return;
                }
                if (entry.source === 'user') {
                    userMap.set(entry.id, { version: entry.version || '', source: 'user' });
                } else if (entry.source === 'dev' || entry.source === 'resources') {
                    shadowMap.set(entry.id, { version: entry.version || '', source: entry.source });
                }
            });
        }
        return { hostMap, userMap, shadowMap };
    };

    const marketRows = () => {
        const catalog = state.market.catalog;
        if (!catalog || !Array.isArray(catalog.mods)) {
            return [];
        }
        const { hostMap, userMap, shadowMap } = installedMaps();
        return catalog.mods.map((mod) => {
            const user = userMap.get(mod.id) || null;
            const shadow = shadowMap.get(mod.id) || null;
            const host = hostMap.get(mod.id) || null;
            const installedVersion = (user && user.version) || (host && host.version) || (shadow && shadow.version) || '';
            const installed = Boolean(user || host || shadow);
            const hasUpdate = Boolean(installedVersion) && compareSemver(mod.version, installedVersion) > 0;
            const enabled = Boolean(host && host.enabled === true);
            const activeSource = user ? 'user' : (shadow ? shadow.source : (host ? 'host' : null));
            const locked = !user && Boolean(shadow && shadow.source === 'dev');
            return {
                ...mod,
                installed,
                installedVersion,
                hasUpdate,
                enabled,
                status: host ? host.status : null,
                activeSource,
                locked,
            };
        }).sort((left, right) => collator.compare(left.name, right.name));
    };

    const marketVisibleRows = () => {
        const query = state.market.query.trim().toLowerCase();
        return marketRows().filter((row) => {
            if (state.market.filter === 'official' && row.origin !== 'official') return false;
            if (state.market.filter === 'community' && row.origin !== 'community') return false;
            if (state.market.filter === 'beta' && row.channel !== 'beta') return false;
            if (state.market.filter === 'updates' && !(row.hasUpdate && !row.locked)) return false;
            if (state.market.filter === 'installed' && !row.installed) return false;
            if (!query) return true;
            return [row.name, row.id, row.author, row.description, (row.owners || []).join(' ')]
                .join(' ')
                .toLowerCase()
                .includes(query);
        });
    };

    const marketFilterCounts = () => {
        const rows = marketRows();
        return {
            all: rows.length,
            official: rows.filter((row) => row.origin === 'official').length,
            community: rows.filter((row) => row.origin === 'community').length,
            beta: rows.filter((row) => row.channel === 'beta').length,
            updates: rows.filter((row) => row.hasUpdate && !row.locked).length,
            installed: rows.filter((row) => row.installed).length,
        };
    };

    const marketPhaseLabel = (phase) => (
        phase === 'download' ? L.marketJobDownload
            : phase === 'install' ? L.marketJobInstall
                : L.marketJobEnable
    );

    const marketAction = (row) => {
        const base = row.hasUpdate ? L.marketUpdate
            : !row.installed ? L.marketInstall
                : !row.enabled ? L.marketEnable : L.marketEnabled;
        if (row.locked) {
            return { key: 'locked', label: L.marketRepoVersion, disabled: true, hint: L.marketLockedHint };
        }
        if (state.market.job) {
            if (state.market.job.id === row.id) {
                return { key: 'busy', label: marketPhaseLabel(state.market.job.phase), disabled: true, busy: true };
            }
            return { key: 'waiting', label: base, disabled: true };
        }
        if (row.hasUpdate) return { key: 'update', label: L.marketUpdate, disabled: false };
        if (!row.installed) return { key: 'install', label: L.marketInstall, disabled: false };
        if (!row.enabled) return { key: 'enable', label: L.marketEnable, disabled: false };
        return { key: 'installed', label: L.marketEnabled, disabled: true };
    };

    const marketStatusText = (row) => {
        if (row.locked) return L.marketRepoVersion;
        if (row.installed) {
            if (!row.installedVersion) return L.marketInstalled;
            if (row.activeSource === 'resources') {
                return fmt(L.marketBuiltinVersion, { version: row.installedVersion });
            }
            return fmt(L.marketInstalledVersion, { version: row.installedVersion });
        }
        return L.marketNotInstalled;
    };

    const loadMarket = async ({ force = false, quiet = false } = {}) => {
        if (disposed) return;
        const token = (state.market.token += 1);
        state.market.loading = true;
        state.market.error = null;
        if (!quiet) render();
        try {
            const catalog = await folium.rpc.call('market.catalog', { force });
            if (token !== state.market.token || disposed) return;
            if (catalog && catalog.ok) {
                state.market.catalog = catalog;
                state.market.loaded = true;
                state.market.error = catalog.stale && catalog.error ? catalog.error : null;
            } else {
                state.market.error = catalog && catalog.error ? catalog.error : 'unknown';
                state.market.loaded = true;
            }
        } catch (error) {
            if (token !== state.market.token || disposed) return;
            state.market.error = error && error.message ? error.message : String(error);
            state.market.loaded = true;
        } finally {
            if (token === state.market.token && !disposed) {
                state.market.loading = false;
                render();
            }
        }
    };

    const switchView = (view) => {
        if (view !== 'installed' && view !== 'market') return;
        if (state.view === view) return;
        state.view = view;
        state.modal = null;
        state.marketDetail = null;
        searchInput.value = view === 'market' ? state.market.query : state.query;
        searchInput.placeholder = view === 'market' ? L.marketSearch : L.search;
        if (view === 'market' && !state.market.loaded && !state.market.loading) {
            void loadMarket();
        }
        render();
        listEl.scrollTop = 0;
    };

    const openExternal = async (url) => {
        if (typeof url !== 'string' || !/^https:\/\//i.test(url)) return;
        try {
            if (window.electron && typeof window.electron.openExternalUrl === 'function') {
                await window.electron.openExternalUrl(url);
                return;
            }
            window.open(url, '_blank', 'noopener');
        } catch {
            setNotice('error', L.marketOpenFailed);
        }
    };

    const installMarket = async (row) => {
        if (disposed || state.market.job) return;
        if (!row.download || !row.download.url || !row.download.sha256) {
            setNotice('error', L.marketNoDownload);
            return;
        }
        state.marketDetail = null;
        state.market.job = { id: row.id, phase: 'download', name: row.name };
        render();
        try {
            const download = await folium.rpc.call('market.download', {
                id: row.id,
                url: row.download.url,
                sha256: row.download.sha256,
                version: row.version,
            });
            if (!download || download.ok !== true) {
                const failure = new Error(download && download.error ? download.error : 'unknown');
                failure.stage = 'download';
                failure.code = download && download.error ? download.error : 'unknown';
                throw failure;
            }

            state.market.job.phase = 'install';
            render();
            const installed = await installZip(download.path);
            if (!installed.ok) {
                const failure = new Error(installed.error || 'unknown');
                failure.stage = 'install';
                failure.code = installed.error || 'unknown';
                throw failure;
            }
            void folium.rpc.call('market.dropPackage', { path: download.path }).catch(() => {});

            state.market.job.phase = 'enable';
            render();
            const enabled = await setEnabled(row.id, true);
            if (enabled.mods.length > 0) {
                applyMods(enabled.mods);
            }
            if (enabled.ok) {
                toast(fmt(L.marketInstalledEnabled, { name: row.name }), 'success');
            } else if (enabled.error === 'enable-declined') {
                toast(fmt(L.marketInstalledDeclined, { name: row.name }), 'info');
            } else {
                const message = fmt(L.marketInstalledEnableFailed, {
                    name: row.name,
                    message: errorText(L, enabled.error),
                });
                setNotice('warn', message);
                toast(message, 'error');
            }
        } catch (error) {
            const code = error && error.code ? error.code : (error && error.message ? error.message : error);
            const message = marketErrorText(L, code);
            const template = error && error.stage === 'download' ? L.marketDownloadFailed : L.marketInstallFailed;
            setNotice('error', fmt(template, { name: row.name, message }));
            toast(fmt(template, { name: row.name, message }), 'error');
        } finally {
            state.market.job = null;
            await refresh({ force: true, silent: true });
            render();
        }
    };

    const enableMarket = async (row) => {
        if (disposed || state.market.job) return;
        state.marketDetail = null;
        state.market.job = { id: row.id, phase: 'enable', name: row.name };
        render();
        const result = await setEnabled(row.id, true);
        if (result.mods.length > 0) {
            applyMods(result.mods);
        }
        state.market.job = null;
        if (result.ok) {
            toast(fmt(L.marketInstalledEnabled, { name: row.name }), 'success');
        } else if (result.error === 'enable-declined') {
            toast(fmt(L.marketInstalledDeclined, { name: row.name }), 'info');
        } else {
            setNotice('error', fmt(L.marketEnableFailed, {
                name: row.name,
                message: errorText(L, result.error),
            }));
        }
        await refresh({ force: true, silent: true });
        render();
    };

    const actOnMarketRow = (row) => {
        if (!row || state.market.job) return;
        if (row.locked) {
            setNotice('warn', L.marketLockedHint);
            return;
        }
        if (row.hasUpdate || !row.installed) {
            void installMarket(row);
        } else if (!row.enabled) {
            void enableMarket(row);
        }
    };

    const updateAllMarket = async () => {
        if (disposed || state.market.job) return;
        const targets = marketRows().filter((row) => row.hasUpdate && !row.locked);
        if (targets.length === 0) {
            toast(L.marketNoUpdates, 'info');
            return;
        }
        setNotice('info', fmt(L.marketStartUpdateAll, { n: targets.length }));
        for (const row of targets) {
            if (disposed) break;
            // Sequential on purpose: every install makes the host reload all mods.
            // eslint-disable-next-line no-await-in-loop
            await installMarket(row);
        }
        toast(L.marketAllUpdated, 'success');
    };

    const openMarketDetail = (id) => {
        if (!marketRows().some((row) => row.id === id)) return;
        state.modal = null;
        state.marketDetail = id;
        renderModal();
    };

    // ---- DOM skeleton -----------------------------------------------------

    const root = h('div', { class: 'pm-root' });
    const style = h('style', { text: CSS });
    const shell = h('div', { class: 'pm-shell' });

    const logo = h('div', { class: 'pm-logo' }, icon('blocks'));
    const statsEl = h('p', { class: 'pm-subtitle' });
    const titleBlock = h('div', { class: 'pm-heading' },
        logo,
        h('div', null,
            h('h1', { class: 'pm-title', text: L.title }),
            statsEl));
    const refreshBtn = h('button', { class: 'pm-btn', type: 'button', title: L.refresh }, icon('refresh'), L.refresh);
    const openDirBtn = h('button', { class: 'pm-btn', type: 'button' }, icon('folder'), L.openDir);
    const header = h('header', { class: 'pm-header' },
        titleBlock,
        h('div', { class: 'pm-header-actions' }, openDirBtn, refreshBtn));

    const searchInput = h('input', {
        type: 'text',
        placeholder: L.search,
        spellcheck: 'false',
        autocomplete: 'off',
        'aria-label': L.search,
    });
    const searchClear = h('button', {
        class: 'pm-search-clear',
        type: 'button',
        hidden: true,
        title: L.clearSearch,
        'aria-label': L.clearSearch,
    }, icon('x'));
    const searchBox = h('div', { class: 'pm-search' }, icon('search'), searchInput, searchClear);
    const selectAllBtn = h('button', { class: 'pm-btn', type: 'button' }, L.selectAll);
    // Inline next to the search field, not floating over the player bar below.
    const actionBar = h('div', { class: 'pm-actionbar', hidden: true });
    const installedTools = h('div', { class: 'pm-tools' }, selectAllBtn);
    const updateAllBtn = h('button', { class: 'pm-btn', type: 'button' }, icon('refresh'), L.marketUpdateAll);
    const refreshCatalogBtn = h('button', { class: 'pm-btn', type: 'button' }, icon('store'), L.marketRefresh);
    const marketTools = h('div', { class: 'pm-tools pm-market-tools', hidden: true }, updateAllBtn, refreshCatalogBtn);
    const toolbar = h('div', { class: 'pm-toolbar' },
        searchBox,
        actionBar,
        installedTools,
        marketTools);

    const tabInstalledCount = h('span', { class: 'pm-tab-count' });
    const tabMarketCount = h('span', { class: 'pm-tab-count' });
    const tabMarketBadge = h('span', { class: 'pm-tab-badge', hidden: true });
    const tabInstalled = h('button', {
        class: 'pm-tab is-active',
        type: 'button',
        role: 'tab',
        'aria-selected': 'true',
        dataset: { view: 'installed' },
    }, icon('blocks'), L.installedTab, tabInstalledCount);
    const tabMarket = h('button', {
        class: 'pm-tab',
        type: 'button',
        role: 'tab',
        'aria-selected': 'false',
        dataset: { view: 'market' },
    }, icon('store'), L.marketTab, tabMarketCount, tabMarketBadge);
    const tabsEl = h('nav', { class: 'pm-tabs', role: 'tablist' }, tabInstalled, tabMarket);
    const filterBar = h('div', { class: 'pm-market-filters', hidden: true });

    const noticeEl = h('div', { class: 'pm-notice', hidden: true });
    const listEl = h('div', { class: 'pm-list' });
    const modalEl = h('div', { class: 'pm-modal', hidden: true });

    shell.append(header, tabsEl, toolbar, filterBar, noticeEl, listEl, modalEl);
    root.append(style, shell);
    container.append(root);

    const applyTheme = () => {
        let daylight = false;
        try {
            daylight = Boolean(ctx.getTheme() && ctx.getTheme().isDaylight);
        } catch {
            daylight = false;
        }
        root.dataset.daylight = daylight ? 'true' : 'false';
    };
    applyTheme();
    try {
        ctx.onChange(applyTheme);
    } catch {
        // Theme updates are cosmetic; an older context without onChange is fine.
    }

    // ---- Rendering --------------------------------------------------------

    const badge = (text, tone, iconName, title) => h('span',
        { class: `pm-badge pm-badge-${tone}`, title: title || undefined },
        iconName ? icon(iconName) : null,
        text);

    const statusPill = (status) => h('span', { class: `pm-pill pm-pill-${status.tone}` },
        h('span', { class: 'pm-dot' }),
        status.label);

    const buildBadges = (item) => {
        const { mod, entry, isSelf } = item;
        const badges = [];
        if (isSelf) {
            badges.push(badge(L.badgeSelf, 'self', 'check'));
        }
        const signature = mod.signature && mod.signature.status ? mod.signature.status : 'unsigned';
        if (signature === 'verified') {
            badges.push(badge(L.badgeVerified, 'verified', 'shield'));
        } else if (signature === 'beta') {
            badges.push(badge(L.badgeBeta, 'beta', 'flask'));
        } else if (signature === 'invalid') {
            badges.push(badge(L.badgeInvalid, 'warn', 'alert', mod.signature.reason || ''));
        } else {
            badges.push(badge(L.badgeUnsigned, 'muted', null));
        }
        if (entry && entry.source === 'dev') {
            badges.push(badge(L.badgeDev, 'muted', null));
        } else if (entry && entry.source === 'resources') {
            badges.push(badge(L.badgeBuiltin, 'muted', null));
        }
        if (entry && entry.duplicate) {
            badges.push(badge(L.badgeDuplicate, 'danger', 'alert'));
        }
        return badges;
    };

    const buildRow = (item) => {
        const { mod, entry, status, isSelf } = item;
        const selected = state.selected.has(mod.id);
        const broken = !status.usable;
        const avatar = h('div', {
            class: `pm-avatar${broken ? ' is-broken' : ''}`,
            style: broken
                ? undefined
                : { background: `linear-gradient(135deg, hsl(${hashHue(mod.name)} 72% 58%), hsl(${(hashHue(mod.name) + 52) % 360} 70% 44%))` },
            text: broken ? '!' : (mod.name.trim().charAt(0) || '?'),
        });

        const check = h('button', {
            class: 'pm-check',
            type: 'button',
            role: 'checkbox',
            'aria-checked': selected ? 'true' : 'false',
            'aria-label': mod.name,
            disabled: isSelf,
            title: isSelf ? L.selfHint : null,
        });

        const meta = h('div', { class: 'pm-meta' });
        meta.append(h('span', { class: 'pm-meta-item', text: mod.id }));
        if (mod.version) {
            meta.append(h('span', { class: 'pm-meta-sep', text: '·' }), h('span', { class: 'pm-meta-item', text: `v${mod.version}` }));
        }
        if (mod.author) {
            meta.append(
                h('span', { class: 'pm-meta-sep pm-meta-author-sep', text: '·' }),
                h('span', { class: 'pm-meta-item pm-meta-author', text: mod.author }));
        }
        const errorLine = mod.error && ['error', 'broken', 'ambiguous', 'dependency'].includes(status.key)
            ? h('div', { class: 'pm-error-line', text: mod.error, title: mod.error })
            : null;

        const content = h('div', { class: 'pm-content' },
            h('div', { class: 'pm-name-row' },
                h('span', { class: 'pm-name', text: mod.name }),
                ...buildBadges(item)),
            meta,
            errorLine,
            mod.description ? h('div', { class: 'pm-desc', text: mod.description }) : null);

        const switchBtn = h('button', {
            class: 'pm-switch',
            type: 'button',
            role: 'switch',
            'aria-checked': mod.enabled ? 'true' : 'false',
            'aria-label': `${mod.enabled ? L.disable : L.enable} ${mod.name}`,
            disabled: isSelf || broken || Boolean(state.busy),
            title: isSelf ? L.selfHint : (broken ? L.brokenHint : null),
            dataset: { action: 'toggle', id: mod.id },
        });

        return h('div', {
            class: `pm-row${selected ? ' is-selected' : ''}${isSelf ? ' is-self' : ''}`,
            dataset: { id: mod.id },
            title: entry && entry.dirPath ? entry.dirPath : undefined,
        },
            check,
            avatar,
            content,
            h('div', { class: 'pm-side' }, statusPill(status), switchBtn));
    };

    const emptyState = (iconName, title, body, action) => h('div', { class: 'pm-empty' },
        h('div', { class: 'pm-empty-icon' }, icon(iconName)),
        h('h3', { text: title }),
        h('p', { text: body }),
        action || null);

    const renderHeader = () => {
        refreshBtn.disabled = Boolean(state.busy) || (state.view === 'market' && state.market.loading);
        openDirBtn.disabled = Boolean(state.busy);
        if (state.view === 'market') {
            const stats = [];
            if (state.market.catalog) {
                const rows = marketRows();
                const installed = rows.filter((row) => row.installed).length;
                const updates = rows.filter((row) => row.hasUpdate && !row.locked).length;
                stats.push(h('span', { class: 'pm-stat' },
                    h('span', { class: 'pm-stat-dot' }),
                    fmt(L.marketCounts, { total: rows.length, installed, updates })));
                if (state.market.catalog.stale) {
                    stats.push(h('span', { class: 'pm-stat pm-stat-warn' },
                        h('span', { class: 'pm-stat-dot' }),
                        L.marketCacheSuffix.trim()));
                }
            } else if (state.market.loading) {
                stats.push(h('span', { class: 'pm-stat' },
                    h('span', { class: 'pm-stat-dot' }),
                    L.marketLoading));
            } else if (state.market.error) {
                stats.push(h('span', { class: 'pm-stat pm-stat-warn' },
                    h('span', { class: 'pm-stat-dot' }),
                    L.marketUnavailable));
            }
            statsEl.replaceChildren(...stats);
            return;
        }
        const items = decoratedMods();
        const total = items.length;
        const abnormalKeys = new Set(['broken', 'ambiguous', 'error', 'dependency', 'stale']);
        const abnormal = items.filter((item) => abnormalKeys.has(item.status.key)).length;
        const enabled = items.filter((item) => item.mod.enabled && !abnormalKeys.has(item.status.key)).length;
        const disabled = Math.max(0, total - enabled - abnormal);
        const stats = [
            h('span', { class: 'pm-stat' }, h('span', { class: 'pm-stat-dot' }), fmt(L.stats.total, { n: total })),
            h('span', { class: 'pm-stat pm-stat-ok' }, h('span', { class: 'pm-stat-dot' }), fmt(L.stats.enabled, { n: enabled })),
            h('span', { class: 'pm-stat' }, h('span', { class: 'pm-stat-dot' }), fmt(L.stats.disabled, { n: disabled })),
        ];
        if (abnormal > 0) {
            stats.push(h('span', { class: 'pm-stat pm-stat-warn' }, h('span', { class: 'pm-stat-dot' }), fmt(L.stats.abnormal, { n: abnormal })));
        }
        statsEl.replaceChildren(...stats);
    };

    const renderTabs = () => {
        const marketView = state.view === 'market';
        tabInstalled.classList.toggle('is-active', !marketView);
        tabMarket.classList.toggle('is-active', marketView);
        tabInstalled.setAttribute('aria-selected', marketView ? 'false' : 'true');
        tabMarket.setAttribute('aria-selected', marketView ? 'true' : 'false');
        tabInstalledCount.textContent = String(state.mods.length);
        const rows = marketRows();
        tabMarketCount.textContent = state.market.catalog ? String(rows.length) : '…';
        const updates = rows.filter((row) => row.hasUpdate && !row.locked).length;
        tabMarketBadge.hidden = updates === 0;
        tabMarketBadge.textContent = String(updates);
    };

    const renderToolbar = () => {
        const marketView = state.view === 'market';
        installedTools.hidden = marketView;
        marketTools.hidden = !marketView;
        filterBar.hidden = !marketView;
        searchInput.placeholder = marketView ? L.marketSearch : L.search;
        searchClear.hidden = !searchInput.value;
        searchInput.disabled = Boolean(state.busy);

        const visible = visibleMods().filter((item) => !item.isSelf);
        const allSelected = visible.length > 0 && visible.every((item) => state.selected.has(item.mod.id));
        selectAllBtn.textContent = allSelected ? L.clearSelectAll : L.selectAll;
        selectAllBtn.disabled = visible.length === 0 || Boolean(state.busy);

        const counts = marketFilterCounts();
        updateAllBtn.replaceChildren(
            icon('refresh'),
            document.createTextNode(counts.updates > 0 ? fmt(L.marketUpdateAllCount, { n: counts.updates }) : L.marketUpdateAll));
        updateAllBtn.disabled = state.market.loading || counts.updates === 0 || Boolean(state.market.job);
        refreshCatalogBtn.disabled = state.market.loading;
    };

    const renderMarketFilters = () => {
        if (state.view !== 'market') {
            filterBar.hidden = true;
            filterBar.replaceChildren();
            return;
        }
        filterBar.hidden = false;
        const counts = marketFilterCounts();
        const definitions = [
            ['all', L.marketFilterAll, counts.all],
            ['official', L.marketFilterOfficial, counts.official],
            ['community', L.marketFilterCommunity, counts.community],
            ['beta', L.marketFilterBeta, counts.beta],
            ['updates', L.marketFilterUpdates, counts.updates],
            ['installed', L.marketFilterInstalled, counts.installed],
        ];
        filterBar.replaceChildren(...definitions.map(([key, label, count]) => h('button', {
            class: `pm-chip${state.market.filter === key ? ' is-active' : ''}`,
            type: 'button',
            'aria-pressed': state.market.filter === key ? 'true' : 'false',
            dataset: { filter: key },
        }, label, h('span', { class: 'pm-chip-count', text: String(count) }))));
    };

    const renderNotice = () => {
        if (!state.notice) {
            noticeEl.hidden = true;
            noticeEl.replaceChildren();
            return;
        }
        noticeEl.hidden = false;
        noticeEl.className = `pm-notice pm-notice-${state.notice.kind}`;
        const iconName = state.notice.kind === 'ok' ? 'check'
            : state.notice.kind === 'error' ? 'alert'
                : state.notice.kind === 'warn' ? 'alert' : 'inbox';
        noticeEl.replaceChildren(
            icon(iconName),
            h('span', { class: 'pm-notice-text', text: state.notice.text }),
            h('button', {
                class: 'pm-notice-close',
                type: 'button',
                'aria-label': L.cancel,
                onclick: () => {
                    state.notice = null;
                    renderNotice();
                },
            }, icon('x')));
    };

    const renderList = () => {
        if (state.view === 'market') {
            renderMarketList();
            return;
        }
        const scrollTop = listEl.scrollTop;
        listEl.replaceChildren();

        if (state.bridgeOk === false) {
            listEl.append(h('div', { class: 'pm-card' }, emptyState('monitor', L.bridgeMissing, L.bridgeMissingBody)));
            return;
        }
        if (state.loading && state.mods.length === 0) {
            const card = h('div', { class: 'pm-card' });
            for (let index = 0; index < 3; index += 1) {
                card.append(h('div', { class: 'pm-skeleton-row' },
                    h('span', { class: 'pm-skeleton', style: { width: '19px', height: '19px', flex: 'none' } }),
                    h('span', { class: 'pm-skeleton', style: { width: '38px', height: '38px', flex: 'none', borderRadius: '12px' } }),
                    h('div', { style: { flex: '1', display: 'flex', flexDirection: 'column', gap: '7px' } },
                        h('span', { class: 'pm-skeleton', style: { width: '34%', height: '11px' } }),
                        h('span', { class: 'pm-skeleton', style: { width: '22%', height: '9px' } }))));
            }
            listEl.append(card);
            return;
        }
        if (state.mods.length === 0) {
            const action = h('button', {
                class: 'pm-btn pm-btn-primary',
                type: 'button',
                onclick: () => { void openModsFolder(); },
            }, icon('folder'), L.openDir);
            listEl.append(h('div', { class: 'pm-card' }, emptyState('inbox', L.emptyTitle, L.emptyBody, action)));
            return;
        }

        const visible = visibleMods();
        if (visible.length === 0) {
            listEl.append(h('div', { class: 'pm-card' }, emptyState('search', L.noMatch, L.noMatchBody)));
            return;
        }
        const card = h('div', { class: 'pm-card' });
        visible.forEach((item) => card.append(buildRow(item)));
        listEl.append(card);
        listEl.scrollTop = scrollTop;
    };

    const buildMarketCover = (row, detail = false) => {
        const cover = h('div', { class: `pm-market-cover${detail ? ' pm-market-cover-detail' : ''}` });
        cover.append(h('span', {
            class: 'pm-market-cover-letter',
            text: (row.name || '?').trim().charAt(0) || '?',
        }));
        if (row.preview && row.preview.url) {
            const image = h('img', {
                src: row.preview.url,
                alt: '',
                loading: detail ? 'eager' : 'lazy',
                decoding: 'async',
            });
            image.addEventListener('error', () => image.remove());
            cover.append(image);
        }
        const badges = h('div', { class: 'pm-market-cover-badges' });
        const addBadge = (text, tone, iconName) => {
            const node = badge(text, tone, iconName);
            node.classList.add('pm-badge-overlay');
            badges.append(node);
        };
        if (row.origin === 'official') {
            addBadge(L.marketOfficial, 'verified', 'shield');
        } else {
            addBadge(L.marketCommunity, 'community', null);
        }
        if (row.channel === 'beta') {
            addBadge(L.marketBeta, 'beta', 'flask');
        }
        if (row.hasUpdate) {
            addBadge(L.marketUpdateBadge, 'update', 'refresh');
        }
        cover.append(badges);
        return cover;
    };

    const buildMarketCard = (row) => {
        const action = marketAction(row);
        const card = h('article', {
            class: `pm-market-card${state.market.job && state.market.job.id === row.id ? ' is-busy' : ''}`,
            dataset: { id: row.id },
            tabindex: '0',
            title: row.description || row.name,
        });
        card.addEventListener('click', () => openMarketDetail(row.id));
        card.addEventListener('keydown', (event) => {
            if (event.target !== card) {
                return;
            }
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openMarketDetail(row.id);
            }
        });

        const body = h('div', { class: 'pm-market-body' },
            h('div', { class: 'pm-market-title-row' },
                h('span', { class: 'pm-market-title', text: row.name })),
            h('div', { class: 'pm-market-meta' },
                h('span', { text: row.author || row.id }),
                row.download && row.download.size
                    ? h('span', { class: 'pm-market-size', text: formatBytes(row.download.size) })
                    : null),
            h('p', { class: 'pm-market-desc', text: row.description || '' }));

        const button = h('button', {
            class: `pm-btn pm-market-action${['install', 'update', 'enable'].includes(action.key) ? ' pm-btn-primary' : ''}`,
            type: 'button',
            disabled: action.disabled,
            title: action.hint || null,
        }, action.busy ? h('span', { class: 'pm-spinner' }) : null, action.label);
        button.addEventListener('click', (event) => {
            event.stopPropagation();
            actOnMarketRow(row);
        });

        const footer = h('div', { class: 'pm-market-footer' },
            h('span', { class: 'pm-market-status', text: marketStatusText(row) }),
            button);

        card.append(buildMarketCover(row), body, footer);
        return card;
    };

    const renderMarketList = () => {
        const scrollTop = listEl.scrollTop;
        listEl.replaceChildren();

        if (state.market.loading && !state.market.catalog) {
            const grid = h('div', { class: 'pm-market-grid' });
            for (let index = 0; index < 6; index += 1) {
                grid.append(h('div', { class: 'pm-market-card is-skeleton' },
                    h('div', { class: 'pm-market-cover pm-skeleton' }),
                    h('div', { class: 'pm-market-body' },
                        h('span', { class: 'pm-skeleton', style: { width: '58%', height: '11px' } }),
                        h('span', { class: 'pm-skeleton', style: { width: '36%', height: '9px', marginTop: '8px' } }),
                        h('span', { class: 'pm-skeleton', style: { width: '88%', height: '9px', marginTop: '10px' } })),
                    h('div', { class: 'pm-market-footer' },
                        h('span', { class: 'pm-skeleton', style: { width: '40%', height: '9px' } }),
                        h('span', { class: 'pm-skeleton', style: { width: '58px', height: '24px', borderRadius: '999px' } }))));
            }
            listEl.append(grid);
            return;
        }

        if (!state.market.catalog) {
            const message = state.market.error
                ? fmt(L.marketRefreshFailed, { message: marketErrorText(L, state.market.error) })
                : L.marketEmptyHint;
            const action = h('button', {
                class: 'pm-btn pm-btn-primary',
                type: 'button',
                onclick: () => { void loadMarket({ force: true }); },
            }, icon('refresh'), L.marketRetry);
            listEl.append(h('div', { class: 'pm-card' },
                emptyState('store', L.marketUnavailable, message, action)));
            return;
        }

        if (state.market.catalog.stale || state.market.error) {
            const message = state.market.catalog.stale
                ? fmt(L.marketCacheBanner, {
                    age: formatAge(L, state.market.catalog.fetchedAt),
                    error: state.market.error ? marketErrorText(L, state.market.error) : '',
                })
                : fmt(L.marketRefreshFailed, {
                    message: marketErrorText(L, state.market.error),
                });
            listEl.append(h('div', { class: 'pm-market-banner' },
                icon('alert'),
                h('span', { class: 'pm-market-banner-text', text: message }),
                h('button', {
                    class: 'pm-btn',
                    type: 'button',
                    onclick: () => { void loadMarket({ force: true }); },
                }, L.marketRetry)));
        }

        const rows = marketVisibleRows();
        if (rows.length === 0) {
            const empty = marketRows().length === 0
                ? emptyState('store', L.marketEmpty, L.marketEmptyHint)
                : emptyState('search', L.marketNoMatch, L.marketNoMatchHint);
            listEl.append(h('div', { class: 'pm-card' }, empty));
            return;
        }

        const grid = h('div', { class: 'pm-market-grid' });
        rows.forEach((row) => grid.append(buildMarketCard(row)));
        listEl.append(grid);
        listEl.scrollTop = scrollTop;
    };

    const busyText = () => {
        const busy = state.busy;
        if (!busy) {
            return '';
        }
        const template = busy.kind === 'enable' ? L.busyEnable : busy.kind === 'disable' ? L.busyDisable : L.busyDelete;
        const text = fmt(template, { i: busy.index, n: busy.total, name: busy.name || '…' });
        return busy.waiting ? `${text} · ${L.busyWait}` : text;
    };

    const renderActionBar = () => {
        if (state.view !== 'installed') {
            actionBar.hidden = true;
            actionBar.replaceChildren();
            return;
        }
        if (!state.busy && state.selected.size === 0) {
            actionBar.hidden = true;
            actionBar.replaceChildren();
            return;
        }
        actionBar.hidden = false;

        if (state.busy) {
            const ratio = state.busy.total > 0 ? Math.round((state.busy.index / state.busy.total) * 100) : 0;
            actionBar.replaceChildren(
                h('div', { class: 'pm-actionbar-info' },
                    h('div', { class: 'pm-actionbar-count' },
                        h('span', { class: 'pm-spinner' }),
                        busyText()),
                    h('div', { class: 'pm-actionbar-sub', text: state.selected.size > 0 ? fmt(L.selected, { n: state.selected.size }) : '' })),
                h('div', { class: 'pm-busy-track' }, h('span', { style: { width: `${ratio}%` } })));
            return;
        }

        const counts = actionCounts();
        const skipped = state.selected.size - counts.delete;
        actionBar.replaceChildren(
            h('div', { class: 'pm-actionbar-info' },
                h('div', { class: 'pm-actionbar-count', text: fmt(L.selected, { n: state.selected.size }) }),
                h('div', { class: 'pm-actionbar-sub', text: fmt(L.actionSummary, { enable: counts.enable, disable: counts.disable, delete: counts.delete }) })),
            h('div', { class: 'pm-actionbar-actions' },
                h('button', {
                    class: 'pm-btn pm-btn-primary',
                    type: 'button',
                    disabled: counts.enable === 0,
                    dataset: { action: 'batch-enable' },
                }, icon('power'), L.enable, counts.enable > 0 ? h('span', { class: 'pm-count', text: counts.enable }) : null),
                h('button', {
                    class: 'pm-btn',
                    type: 'button',
                    disabled: counts.disable === 0,
                    dataset: { action: 'batch-disable' },
                }, icon('pause'), L.disable, counts.disable > 0 ? h('span', { class: 'pm-count', text: counts.disable }) : null),
                h('button', {
                    class: 'pm-btn pm-btn-danger',
                    type: 'button',
                    disabled: counts.delete === 0,
                    title: skipped > 0 ? L.skippedBuiltin : null,
                    dataset: { action: 'batch-delete' },
                }, icon('trash'), L.delete, counts.delete > 0 ? h('span', { class: 'pm-count', text: counts.delete }) : null),
                h('button', {
                    class: 'pm-icon-btn',
                    type: 'button',
                    title: L.clear,
                    'aria-label': L.clear,
                    dataset: { action: 'clear' },
                }, icon('x'))));
    };

    const renderModal = () => {
        if (state.marketDetail) {
            renderMarketDetailModal();
            return;
        }
        if (!state.modal) {
            modalEl.hidden = true;
            modalEl.replaceChildren();
            return;
        }
        const { items, skipped, purgeData } = state.modal;
        modalEl.hidden = false;

        const list = h('ul', { class: 'pm-delete-list' });
        items.forEach((item) => {
            list.append(h('li', { class: 'pm-delete-item' },
                h('span', { class: 'pm-delete-dot' }),
                h('span', { class: 'pm-delete-name', text: item.mod.name }),
                item.mod.version ? h('span', { class: 'pm-delete-version', text: `v${item.mod.version}` }) : null));
        });

        const skippedBlock = skipped.length > 0
            ? h('div', { class: 'pm-skip-block' },
                h('div', { class: 'pm-skip-title', text: L.confirmSkipped }),
                h('ul', null, ...skipped.map((item) => h('li', null,
                    h('span', { text: item.mod.name }),
                    h('span', { class: 'pm-skip-reason', text: `— ${item.reason}` })))))
            : null;

        const purge = h('input', { type: 'checkbox', 'data-role': 'purge' });
        purge.checked = purgeData;

        const card = h('div', {
            class: 'pm-modal-card',
            role: 'dialog',
            'aria-modal': 'true',
            'aria-label': L.confirmTitle,
            tabindex: '-1',
        },
            h('div', { class: 'pm-modal-head' },
                h('div', { class: 'pm-modal-icon danger' }, icon('trash')),
                h('div', null,
                    h('h2', { text: L.confirmTitle }),
                    h('p', { text: L.confirmBody })),
                h('button', { class: 'pm-icon-btn', type: 'button', 'data-action': 'modal-close', 'aria-label': L.cancel }, icon('x'))),
            h('div', { class: 'pm-modal-body' },
                list,
                skippedBlock,
                h('label', { class: 'pm-purge-row' },
                    purge,
                    h('span', null,
                        h('span', { text: L.purgeLabel }),
                        h('span', { class: 'pm-purge-hint', text: L.purgeHint })))),
            h('div', { class: 'pm-modal-actions' },
                h('button', {
                    class: 'pm-btn',
                    type: 'button',
                    'data-action': 'modal-cancel',
                }, L.cancel),
                h('button', {
                    class: 'pm-btn pm-btn-danger-solid',
                    type: 'button',
                    'data-action': 'modal-confirm',
                }, icon('trash'), fmt(L.confirmDelete, { n: items.length }))));

        modalEl.replaceChildren(card);
        try {
            card.focus();
        } catch {
            // Focusing a shadow-root card can fail in odd engines; the dialog is still usable.
        }
    };

    const renderMarketDetailModal = () => {
        const row = marketRows().find((item) => item.id === state.marketDetail);
        if (!row) {
            modalEl.hidden = true;
            modalEl.replaceChildren();
            return;
        }
        modalEl.hidden = false;

        const action = marketAction(row);
        const metaGrid = h('div', { class: 'pm-detail-meta' });
        const metaItem = (label, value) => (value
            ? h('div', { class: 'pm-detail-meta-item' },
                h('span', { class: 'pm-detail-meta-label', text: label }),
                h('span', { class: 'pm-detail-meta-value', text: value }))
            : null);
        metaGrid.append(...[
            metaItem(L.marketDetailAuthor, row.author || row.id),
            metaItem(L.marketDetailVersion, `v${row.version}`),
            metaItem(L.marketDetailSize, formatBytes(row.download && row.download.size)),
            metaItem(L.marketDetailSigned, row.signedAt ? row.signedAt.slice(0, 10) : ''),
            metaItem(L.marketDetailOwners, (row.owners || []).join(isZhLocale ? '、' : ', ')),
            metaItem(L.marketDetailChannel, row.channel === 'beta' ? L.marketBeta : L.marketRelease),
        ].filter(Boolean));

        const permissions = h('div', { class: 'pm-perm-chips' });
        if (row.permissions && row.permissions.length > 0) {
            row.permissions.forEach((permission) => permissions.append(h('span', { class: 'pm-perm-chip', text: permission })));
        } else {
            permissions.append(h('span', { class: 'pm-detail-muted', text: L.marketDetailNoPermissions }));
        }

        const dependencies = h('div', { class: 'pm-perm-chips' });
        if (row.depends && row.depends.length > 0) {
            row.depends.forEach((dependency) => dependencies.append(h('span', { class: 'pm-perm-chip', text: dependency })));
        } else {
            dependencies.append(h('span', { class: 'pm-detail-muted', text: L.marketDetailNoDepends }));
        }

        const links = h('div', { class: 'pm-detail-links' },
            h('button', {
                class: 'pm-btn',
                type: 'button',
                onclick: () => { void openExternal(row.page); },
            }, icon('link'), L.marketDetailPage),
            row.source ? h('button', {
                class: 'pm-btn',
                type: 'button',
                onclick: () => { void openExternal(row.source); },
            }, icon('link'), L.marketDetailSource) : null);

        const warningText = row.channel === 'beta'
            ? `${L.marketDetailWarning} ${L.marketDetailBetaWarning}`
            : L.marketDetailWarning;

        const button = h('button', {
            class: `pm-btn${['install', 'update', 'enable'].includes(action.key) ? ' pm-btn-primary' : ''}`,
            type: 'button',
            disabled: action.disabled,
            title: action.hint || null,
            onclick: () => actOnMarketRow(row),
        }, action.busy ? h('span', { class: 'pm-spinner' }) : null, action.label);

        const card = h('div', {
            class: 'pm-modal-card pm-market-detail',
            role: 'dialog',
            'aria-modal': 'true',
            'aria-label': row.name,
            tabindex: '-1',
        },
            buildMarketCover(row, true),
            h('div', { class: 'pm-market-detail-head' },
                h('div', { class: 'pm-market-detail-heading' },
                    h('h2', { class: 'pm-market-detail-title', text: row.name }),
                    h('p', { class: 'pm-market-detail-sub', text: `${row.author || row.id} · v${row.version}` })),
                h('button', {
                    class: 'pm-icon-btn pm-market-detail-close',
                    type: 'button',
                    'aria-label': L.cancel,
                    onclick: () => closeModal(),
                }, icon('x'))),
            h('div', { class: 'pm-modal-body pm-market-detail-body' },
                h('p', { class: 'pm-market-detail-desc', text: row.description || '' }),
                metaGrid,
                h('div', { class: 'pm-detail-section' },
                    h('div', { class: 'pm-detail-section-title', text: L.marketDetailPermissions }),
                    permissions),
                h('div', { class: 'pm-detail-section' },
                    h('div', { class: 'pm-detail-section-title', text: L.marketDetailDepends }),
                    dependencies),
                h('div', { class: 'pm-detail-warning' }, icon('alert'), h('span', { text: warningText })),
                links),
            h('div', { class: 'pm-modal-actions pm-market-detail-actions' },
                h('span', { class: 'pm-market-detail-status', text: marketStatusText(row) }),
                button));

        modalEl.replaceChildren(card);
        try {
            card.focus();
        } catch {
            // Focusing a shadow-root card can fail in odd engines; the dialog is still usable.
        }
    };

    const render = () => {
        if (disposed) {
            return;
        }
        root.dataset.busy = state.busy ? 'true' : 'false';
        renderHeader();
        renderTabs();
        renderToolbar();
        renderMarketFilters();
        renderList();
        renderActionBar();
        renderNotice();
        renderModal();
    };

    // Checking a row must not replace the list under the pointer: update the
    // selection classes in place and redraw only the toolbar and action bar.
    const renderSelection = () => {
        if (disposed) {
            return;
        }
        listEl.querySelectorAll('.pm-row').forEach((row) => {
            const selected = state.selected.has(row.dataset.id);
            row.classList.toggle('is-selected', selected);
            const check = row.querySelector('.pm-check');
            if (check) {
                check.setAttribute('aria-checked', selected ? 'true' : 'false');
            }
        });
        renderToolbar();
        renderActionBar();
    };

    // ---- Data -------------------------------------------------------------

    const refresh = async ({ silent = false, force = false } = {}) => {
        if (disposed) {
            return;
        }
        const api = bridge();
        if (!api) {
            state.bridgeOk = false;
            state.loading = false;
            render();
            return;
        }
        state.bridgeOk = true;
        try {
            const [payload, scan] = await Promise.all([
                api.listMods(),
                folium.rpc.call('manager.scan').catch((error) => {
                    if (!silent) {
                        setNotice('warn', L.noticeScanFailed);
                    }
                    return { error: error && error.message ? error.message : String(error) };
                }),
            ]);
            const mods = payload && Array.isArray(payload.mods) ? payload.mods : [];
            state.mods = mods.filter(Boolean).map(normalizeMod);
            if (scan && Array.isArray(scan.entries)) {
                state.scan = scan;
                state.scanByKey = new Map(scan.entries.map((entry) => [entry.hostId, entry]));
                state.scanByFolder = new Map();
                scan.entries.forEach((entry) => {
                    const folder = typeof entry.folderName === 'string' ? entry.folderName : '';
                    if (!folder) {
                        return;
                    }
                    state.scanByFolder.set(folder, state.scanByFolder.has(folder) ? null : entry);
                });
            }
            state.loading = false;
            reconcileSelection();
            const nextSignature = computeSignature();
            const changed = nextSignature !== state.signature;
            state.signature = nextSignature;
            if (force || !silent || changed) {
                render();
            }
        } catch (error) {
            state.loading = false;
            if (!silent) {
                setNotice('error', fmt(L.noticeRefreshFailed, {
                    message: error && error.message ? error.message : String(error),
                }));
            }
            render();
        }
    };

    const openModsFolder = async () => {
        const api = bridge();
        if (!api) {
            return;
        }
        try {
            const result = await api.openModsDirectory();
            if (result && result.ok === false) {
                setNotice('error', errorText(L, result.error || 'unknown'));
            }
        } catch (error) {
            setNotice('error', errorText(L, error && error.message ? error.message : 'unknown'));
        }
    };

    // ---- Actions ----------------------------------------------------------

    const describeFailures = (failed) => [...failed.entries()]
        .slice(0, 3)
        .map(([id, error]) => `${nameFor(id)}：${errorText(L, error)}`)
        .join('；');

    const runEnable = async () => {
        if (state.busy) {
            return;
        }
        const targets = selectedDecorated().filter((item) => (
            !item.isSelf && !item.mod.enabled && item.status.usable
        ));
        if (targets.length === 0) {
            setNotice('info', L.noticeNothing);
            return;
        }
        setNotice('info', L.noticeEnableStart);
        const failed = new Map();
        let done = 0;
        let systemOff = false;
        state.busy = { kind: 'enable', index: 0, total: targets.length, name: '' };
        render();

        for (let index = 0; index < targets.length; index += 1) {
            const item = targets[index];
            const id = item.mod.id;
            state.busy = { kind: 'enable', index: index + 1, total: targets.length, name: item.mod.name, waiting: true };
            render();
            const result = await setEnabled(id, true);
            if (result.mods.length > 0) {
                applyMods(result.mods);
            }
            if (result.ok) {
                done += 1;
            } else {
                failed.set(id, result.error || 'unknown');
                if (result.error === 'mod-system-disabled') {
                    systemOff = true;
                    targets.slice(index + 1).forEach((rest) => failed.set(rest.mod.id, 'mod-system-disabled'));
                    break;
                }
            }
            render();
        }

        state.busy = null;
        state.selected = new Set(failed.keys());
        await refresh({ silent: true, force: true });

        if (systemOff) {
            setNotice('error', errorText(L, 'mod-system-disabled'));
            toast(errorText(L, 'mod-system-disabled'), 'error');
            return;
        }
        if (failed.size === 0) {
            const text = fmt(L.noticeEnableDone, { n: done });
            setNotice('ok', text);
            toast(text, 'success');
            return;
        }
        const allDeclined = [...failed.values()].every((error) => error === 'enable-declined');
        if (allDeclined) {
            setNotice('info', L.noticeDeclined);
            toast(L.noticeDeclined, 'info');
            return;
        }
        setNotice('warn', `${fmt(L.noticePartial, { done, failed: failed.size })} ${describeFailures(failed)}`);
        toast(fmt(L.noticePartial, { done, failed: failed.size }), 'info');
    };

    const runDisable = async () => {
        if (state.busy) {
            return;
        }
        const targets = selectedDecorated().filter((item) => !item.isSelf && item.mod.enabled);
        if (targets.length === 0) {
            setNotice('info', L.noticeNothing);
            return;
        }
        const failed = new Map();
        let done = 0;
        state.busy = { kind: 'disable', index: 0, total: targets.length, name: '' };
        render();

        for (let index = 0; index < targets.length; index += 1) {
            const item = targets[index];
            const id = item.mod.id;
            state.busy = { kind: 'disable', index: index + 1, total: targets.length, name: item.mod.name };
            render();
            const result = await setEnabled(id, false);
            if (result.mods.length > 0) {
                applyMods(result.mods);
            }
            if (result.ok) {
                done += 1;
            } else {
                failed.set(id, result.error || 'unknown');
            }
            render();
        }

        state.busy = null;
        state.selected = new Set(failed.keys());
        await refresh({ silent: true, force: true });

        if (failed.size === 0) {
            const text = fmt(L.noticeDisableDone, { n: done });
            setNotice('ok', text);
            toast(text, 'success');
            return;
        }
        setNotice('warn', `${fmt(L.noticePartial, { done, failed: failed.size })} ${describeFailures(failed)}`);
        toast(fmt(L.noticePartial, { done, failed: failed.size }), 'info');
    };

    const skipReason = (item) => {
        if (item.isSelf) {
            return L.reasonSelf;
        }
        if (!item.entry) {
            return L.reasonUnknown;
        }
        if (item.entry.symlink) {
            return L.reasonSymlink;
        }
        if (item.entry.ambiguous) {
            return L.reasonAmbiguous;
        }
        if (item.entry.source === 'resources') {
            return L.reasonBuiltin;
        }
        if (item.entry.source === 'dev') {
            return L.reasonRepo;
        }
        return L.reasonUnknown;
    };

    const openDeleteModal = () => {
        if (state.busy) {
            return;
        }
        if (!state.scan) {
            setNotice('error', L.noticeScanFailed);
            return;
        }
        const items = [];
        const skipped = [];
        selectedDecorated().forEach((item) => {
            if (item.deletable) {
                items.push(item);
            } else {
                skipped.push({ ...item, reason: skipReason(item) });
            }
        });
        if (items.length === 0) {
            setNotice('error', L.noticeDeleteNone);
            return;
        }
        state.modal = { items, skipped, purgeData: false };
        state.marketDetail = null;
        renderModal();
    };

    const closeModal = () => {
        state.modal = null;
        state.marketDetail = null;
        renderModal();
    };

    const runDelete = async (items, purgeData) => {
        if (state.busy || items.length === 0) {
            return;
        }
        const failed = new Map();
        let removed = 0;
        let dataSkipped = 0;
        state.busy = { kind: 'delete', index: 0, total: items.length, name: '' };
        render();

        for (let index = 0; index < items.length; index += 1) {
            const item = items[index];
            const id = item.mod.id;
            state.busy = { kind: 'delete', index: index + 1, total: items.length, name: item.mod.name };
            render();

            const current = state.mods.find((mod) => mod.id === id);
            if (current && current.enabled) {
                const disabled = await setEnabled(id, false);
                if (disabled.mods.length > 0) {
                    applyMods(disabled.mods);
                }
                if (!disabled.ok) {
                    failed.set(id, disabled.error || 'unknown');
                    continue;
                }
            }

            let result;
            try {
                result = await folium.rpc.call('manager.delete', { id, purgeData });
            } catch (error) {
                result = { ok: false, error: error && error.message ? error.message : String(error) };
            }
            if (!result || result.ok !== true) {
                failed.set(id, result && result.error ? result.error : 'unknown');
                continue;
            }
            removed += 1;
            if (result.dataSkipped) {
                dataSkipped += 1;
            }
            state.selected.delete(id);
            render();
        }

        state.busy = null;
        state.selected = new Set(failed.keys());

        if (removed > 0) {
            try {
                const payload = await bridge().reloadMods();
                if (payload && Array.isArray(payload.mods)) {
                    state.mods = payload.mods.filter(Boolean).map(normalizeMod);
                    state.signature = computeSignature();
                }
            } catch {
                // The refresh below still reads the list; a failed reload is not fatal here.
            }
        }
        await refresh({ silent: true, force: true });

        if (removed === 0) {
            setNotice('error', `${fmt(L.noticePartial, { done: 0, failed: failed.size })} ${describeFailures(failed)}`);
            toast(L.noticeDeleteNone, 'error');
            return;
        }
        const suffix = purgeData && dataSkipped > 0 ? ` ${fmt(L.noticeDataSkipped, { n: dataSkipped })}` : '';
        if (failed.size > 0) {
            setNotice('warn', `${fmt(L.noticePartial, { done: removed, failed: failed.size })} ${describeFailures(failed)}${suffix}`);
            toast(fmt(L.noticeDeleteDone, { n: removed }), 'success');
            return;
        }
        const text = `${fmt(purgeData && dataSkipped === 0 ? L.noticeDeleteDoneData : L.noticeDeleteDone, { n: removed })}${suffix}`;
        setNotice('ok', text);
        toast(text, 'success');
    };

    const confirmDelete = () => {
        const modal = state.modal;
        if (!modal) {
            return;
        }
        const { items, purgeData } = modal;
        closeModal();
        void runDelete(items, purgeData);
    };

    const toggleSelected = (id) => {
        if (state.busy || id === selfId) {
            return;
        }
        if (state.selected.has(id)) {
            state.selected.delete(id);
        } else {
            state.selected.add(id);
        }
        renderSelection();
    };

    const toggleOne = async (id) => {
        if (state.busy || id === selfId) {
            return;
        }
        const item = decoratedMods().find((candidate) => candidate.mod.id === id);
        if (!item || !item.status.usable) {
            return;
        }
        const enabled = !item.mod.enabled;
        state.busy = { kind: enabled ? 'enable' : 'disable', index: 1, total: 1, name: item.mod.name, waiting: enabled };
        render();
        const result = await setEnabled(id, enabled);
        state.busy = null;
        if (result.mods.length > 0) {
            applyMods(result.mods);
        }
        if (!result.ok) {
            if (result.error === 'enable-declined') {
                toast(L.noticeDeclined, 'info');
            } else {
                setNotice('error', errorText(L, result.error));
                toast(errorText(L, result.error), 'error');
            }
        } else {
            toast(fmt(enabled ? L.noticeEnableDone : L.noticeDisableDone, { n: 1 }), 'success');
        }
        await refresh({ silent: true, force: true });
    };

    // ---- Wiring -----------------------------------------------------------

    refreshBtn.addEventListener('click', () => {
        if (state.view === 'market') {
            void loadMarket({ force: true });
        } else {
            void refresh({ force: true });
        }
    });
    openDirBtn.addEventListener('click', () => { void openModsFolder(); });
    searchInput.addEventListener('input', () => {
        if (state.view === 'market') {
            state.market.query = searchInput.value;
            searchClear.hidden = !searchInput.value;
            clearTimeout(marketSearchTimer);
            marketSearchTimer = setTimeout(() => {
                if (state.view === 'market') {
                    renderMarketList();
                }
            }, 120);
        } else {
            state.query = searchInput.value;
            render();
        }
    });
    searchClear.addEventListener('click', () => {
        searchInput.value = '';
        searchClear.hidden = true;
        searchInput.focus();
        if (state.view === 'market') {
            state.market.query = '';
            clearTimeout(marketSearchTimer);
            renderMarketList();
        } else {
            state.query = '';
            render();
        }
    });
    tabsEl.addEventListener('click', (event) => {
        const target = event.target instanceof Element ? event.target : null;
        const tab = target ? target.closest('[data-view]') : null;
        if (tab) {
            switchView(tab.dataset.view);
        }
    });
    filterBar.addEventListener('click', (event) => {
        const target = event.target instanceof Element ? event.target : null;
        const chip = target ? target.closest('[data-filter]') : null;
        if (!chip) {
            return;
        }
        state.market.filter = chip.dataset.filter;
        renderMarketFilters();
        renderMarketList();
    });
    updateAllBtn.addEventListener('click', () => { void updateAllMarket(); });
    refreshCatalogBtn.addEventListener('click', () => { void loadMarket({ force: true }); });
    selectAllBtn.addEventListener('click', () => {
        if (state.busy) {
            return;
        }
        const visible = visibleMods().filter((item) => !item.isSelf);
        const allSelected = visible.length > 0 && visible.every((item) => state.selected.has(item.mod.id));
        visible.forEach((item) => {
            if (allSelected) {
                state.selected.delete(item.mod.id);
            } else {
                state.selected.add(item.mod.id);
            }
        });
        renderSelection();
    });

    listEl.addEventListener('click', (event) => {
        if (state.busy) {
            return;
        }
        const target = event.target instanceof Element ? event.target : null;
        if (!target) {
            return;
        }
        const toggle = target.closest('[data-action="toggle"]');
        if (toggle) {
            event.stopPropagation();
            void toggleOne(toggle.dataset.id);
            return;
        }
        const row = target.closest('.pm-row');
        if (!row) {
            return;
        }
        toggleSelected(row.dataset.id);
    });

    actionBar.addEventListener('click', (event) => {
        if (state.busy) {
            return;
        }
        const target = event.target instanceof Element ? event.target : null;
        const action = target && target.closest('[data-action]') ? target.closest('[data-action]').dataset.action : '';
        if (action === 'batch-enable') {
            void runEnable();
        } else if (action === 'batch-disable') {
            void runDisable();
        } else if (action === 'batch-delete') {
            openDeleteModal();
        } else if (action === 'clear') {
            state.selected.clear();
            renderSelection();
        }
    });

    modalEl.addEventListener('click', (event) => {
        const target = event.target instanceof Element ? event.target : null;
        if (!target) {
            return;
        }
        if (target === modalEl) {
            closeModal();
            return;
        }
        const actionEl = target.closest('[data-action]');
        const action = actionEl ? actionEl.dataset.action : '';
        if (action === 'modal-close' || action === 'modal-cancel') {
            closeModal();
        } else if (action === 'modal-confirm') {
            confirmDelete();
        }
    });

    modalEl.addEventListener('change', (event) => {
        const target = event.target instanceof Element ? event.target : null;
        const input = target ? target.closest('input[data-role="purge"]') : null;
        if (input && state.modal) {
            state.modal.purgeData = input.checked;
        }
    });

    const onKeyDown = (event) => {
        if (event.key !== 'Escape') {
            return;
        }
        if (state.marketDetail) {
            event.preventDefault();
            event.stopPropagation();
            closeModal();
        } else if (state.modal) {
            event.preventDefault();
            event.stopPropagation();
            closeModal();
        } else if (state.selected.size > 0 && !state.busy) {
            event.preventDefault();
            event.stopPropagation();
            state.selected.clear();
            renderSelection();
        }
    };
    window.addEventListener('keydown', onKeyDown, true);

    let offState = null;
    try {
        if (bridge()) {
            offState = bridge().onModsStateChanged((mods) => {
                if (!Array.isArray(mods)) {
                    return;
                }
                state.mods = mods.filter(Boolean).map(normalizeMod);
                reconcileSelection();
                state.signature = computeSignature();
                render();
            });
        }
    } catch {
        offState = null;
    }

    try {
        ctx.every(3000, () => {
            if (!state.busy && !state.modal && !state.marketDetail && !state.market.job && !state.market.loading) {
                void refresh({ silent: true });
            }
        });
    } catch {
        // An older mount context without every(): manual refresh still works.
    }

    render();
    void refresh();

    return () => {
        disposed = true;
        clearTimeout(noticeTimer);
        clearTimeout(marketSearchTimer);
        window.removeEventListener('keydown', onKeyDown, true);
        if (typeof offState === 'function') {
            try {
                offState();
            } catch {
                // The bridge may already be gone during app shutdown.
            }
        }
    };
}

export default function activate(folium) {
    const minor = Number(folium && folium.host && folium.host.folium ? folium.host.folium.minor : 0);
    if (!minor || minor < 5) {
        throw new Error('plugin-manager requires Folium 1.5+ (homeTabs)');
    }

    const tab = folium.registries.homeTabs.register({
        id: HOST_TAB_ID,
        label: { 'zh-CN': '插件管家', en: 'Plugin Manager' },
        order: 260,
        mount: (container, ctx) => mountManager(folium, container, ctx),
    });

    const command = folium.registries.commands.register({
        id: 'open',
        label: { 'zh-CN': '打开插件管家', en: 'Open Plugin Manager' },
        description: {
            'zh-CN': '管理已安装插件，浏览并安装社区模组',
            en: 'Manage installed mods and browse the community market',
        },
        keywords: [
            'plugin', 'plugins', 'mod', 'mods', 'manager', 'market', 'community',
            '插件', '模组', '管理器', '市场', '社区', '安装', '更新', '多选', '删除', '卸载',
        ],
        icon: 'blocks',
        run: () => {
            folium.ui.openHomeTab(HOST_TAB_ID);
        },
    });

    return () => {
        tab.unregister();
        command.unregister();
    };
}