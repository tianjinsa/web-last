/**
 * 资源加载器 (Loader)
 * 
 * 负责并行加载 CSS 和 JS 资源，并在加载完成后初始化应用。
 * 采用 Manifest 机制 (index-map.json) 管理资源依赖。
 */

// 资源加载状态追踪
const loadedResources = new Set();
const manifestCache = new Map();
const manifestPromises = new Map();

// 立即启动加载
initApp();

/**
 * 应用初始化流程
 */
async function initApp() {
    log('开始初始化应用...');
    try {
        // 0. 加载 main.html 结构 (App Shell)
        await loadMainStructure();

        // 无论当前路径如何，始终加载 index-map.json 获取资源清单
        const manifest = await fetchManifest('/index');
        
        const cssEntries = manifest?.css ?? [];
        const jsEntries = manifest?.js ?? [];

        // 1. 启动 CSS 加载 (不阻塞 JS)
        const cssTask = Promise.all(loadEntries(cssEntries, 'css'));

        // 2. 加载所有 JS (依赖库、页面逻辑)
        // 顺序完全由 index-map.json 决定，利用 defer 属性保证执行顺序
        await Promise.all(loadEntries(jsEntries, 'js'));
        
        // 3. 等待 CSS (可选，为了防止样式闪烁，最好也等一下)
        await cssTask;

        log('所有核心资源加载完毕');

        // 5. 标记资源加载完成，通知 app.js 启动 SPA
        window.__RESOURCES_LOADED__ = true;
        window.dispatchEvent(new Event('app-resources-loaded'));

    } catch (error) {
        log('资源加载失败', error);
    } finally {
        revealShell();
    }
}

/**
 * 加载主页面结构 (App Shell)
 */
async function loadMainStructure() {
    try {
        const url = withCDN('main.html');
        const response = await fetch(url);
        if (!response.ok) throw new Error('无法加载页面结构');
        let html = await response.text();
        
        // 替换 CDN 占位符
        const cdn = (CDN_URL || '').replace(/\/$/, '');
        html = html.replace(/\{\{\s*cdn_url\s*\}\}/g, cdn);

        // 移除启动加载动画
        const bootLoader = document.getElementById('boot-loader');
        if (bootLoader) bootLoader.remove();

        // 注入到 Body
        document.body.insertAdjacentHTML('afterbegin', html);
    } catch (error) {
        console.error('Main structure load failed', error);
        document.body.innerHTML = '<p style="color:white;text-align:center;margin-top:20%">无法加载应用结构，请刷新重试。</p>';
        throw error;
    }
}

/**
 * 处理 CDN 路径
 * @param {string} path - 相对路径
 * @returns {string} 完整 URL
 */
function withCDN(path) {
    if (!path) {
        return '';
    }
    if (/^https?:/i.test(path)) {
        return path;
    }
    const base = (CDN_URL || '').replace(/\/$/, '');
    const cleanPath = path.replace(/^\//, '');
    return base ? `${base}/${cleanPath}` : `/${cleanPath}`;
}

/**
 * 获取资源清单 (Manifest)
 * @param {string} key - Manifest 标识
 * @returns {Promise<Object>}
 */
async function fetchManifest(key) {
    if (manifestCache.has(key)) {
        return manifestCache.get(key);
    }
    if (manifestPromises.has(key)) {
        return manifestPromises.get(key);
    }

    const promise = (async () => {
        const manifestUrl = withCDN(`${key.replace(/^\//, '')}-map.json`);
        const response = await fetch(manifestUrl, { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`加载 ${manifestUrl} 失败: ${response.status}`);
        }
        const data = await response.json();
        manifestCache.set(key, data);
        return data;
    })()
        .finally(() => {
            manifestPromises.delete(key);
        });

    manifestPromises.set(key, promise);
    return promise;
}

/**
 * 加载资源列表
 * @param {Array} entries - 资源条目 [[path, mode], ...]
 * @param {string} type - 'css' | 'js'
 * @returns {Array<Promise>}
 */
function loadEntries(entries, type) {
    return entries.map(([ref, mode]) => {
        if (loadedResources.has(ref)) {
            return Promise.resolve();
        }
        return new Promise((resolve, reject) => {
            // mode: 1 = 绝对路径, 0 = 相对路径 (需拼接 CDN)
            const url = mode === 1 ? ref : withCDN(ref);
            if (type === 'css') {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = url;
                link.onload = () => {
                    loadedResources.add(ref);
                    resolve();
                };
                link.onerror = () => reject(new Error(`CSS 资源加载失败: ${ref}`));
                document.head.appendChild(link);
            } else {
                const script = document.createElement('script');
                script.defer = true;
                script.src = url;
                script.onload = () => {
                    loadedResources.add(ref);
                    resolve();
                };
                script.onerror = () => reject(new Error(`JS 资源加载失败: ${ref}`));
                document.body.appendChild(script);
            }
        });
    });
}

/**
 * 显示应用外壳，移除加载动画
 */
function revealShell() {
    log('所有资源加载完成，移除加载部分代码。');
    const shell = document.getElementById('app-shell');
    if (shell) {
        shell.setAttribute('data-shell', 'ready');
    }
    let loader;
    while ((loader = document.getElementById('first-load'))) {
        loader.remove();
    }
}
