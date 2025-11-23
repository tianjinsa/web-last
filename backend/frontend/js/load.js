// 单页应用资源加载器：一次性加载所有静态资源
const loadedResources = new Set();
const manifestCache = new Map();
const manifestPromises = new Map();

// 立即启动加载
initApp();

async function initApp() {
    log('开始初始化应用...');
    try {
        // 0. 加载 main.html 结构
        await loadMainStructure();

        // 无论当前路径如何，始终加载 index-map.json
        const manifest = await fetchManifest('/index');
        
        const cssEntries = manifest?.css ?? [];
        const jsEntries = manifest?.js ?? [];

        // 1. 启动 CSS 加载 (不阻塞 JS)
        const cssTask = Promise.all(loadEntries(cssEntries, 'css'));

        // 2. 加载所有 JS (依赖库、页面逻辑)
        // 顺序完全由 index-map.json 决定，利用 defer 属性保证执行顺序
        await Promise.all(loadEntries(jsEntries, 'js'));
        
        // 3. 等待 CSS (可选，为了防止样式闪烁，最好也等一下，或者不等)
        // 这里选择等待，确保样式就绪
        await cssTask;

        log('所有核心资源加载完毕');

        // 5. 标记资源加载完成，通知 app.js
        window.__RESOURCES_LOADED__ = true;
        window.dispatchEvent(new Event('app-resources-loaded'));

    } catch (error) {
        log('资源加载失败', error);
    } finally {
        revealShell();
    }
}

async function loadMainStructure() {
    try {
        const url = withCDN('main.html');
        const response = await fetch(url);
        if (!response.ok) throw new Error('无法加载页面结构');
        let html = await response.text();
        
        // Replace placeholders
        const cdn = (CDN_URL || '').replace(/\/$/, '');
        html = html.replace(/\{\{\s*cdn_url\s*\}\}/g, cdn);

        // Remove boot loader
        const bootLoader = document.getElementById('boot-loader');
        if (bootLoader) bootLoader.remove();

        // Inject into body
        document.body.insertAdjacentHTML('afterbegin', html);
    } catch (error) {
        console.error('Main structure load failed', error);
        document.body.innerHTML = '<p style="color:white;text-align:center;margin-top:20%">无法加载应用结构，请刷新重试。</p>';
        throw error;
    }
}

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

function loadEntries(entries, type) {
    return entries.map(([ref, mode]) => {
        if (loadedResources.has(ref)) {
            return Promise.resolve();
        }
        return new Promise((resolve, reject) => {
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
