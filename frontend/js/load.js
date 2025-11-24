// 获得CDN_URL/res-map.json中的映射关系
const vis_rea = {};

// 监听路由变化，通知 App 处理
window.addEventListener('popstate', () => {
    if (window.App && window.App.handleRoute) {
        window.App.handleRoute();
    }
});

// 拦截 pushState/replaceState
const originalPushState = history.pushState;
history.pushState = function () {
    originalPushState.apply(this, arguments);
    if (window.App && window.App.handleRoute) {
        window.App.handleRoute();
    }
};

const originalReplaceState = history.replaceState;
history.replaceState = function () {
    originalReplaceState.apply(this, arguments);
    if (window.App && window.App.handleRoute) {
        window.App.handleRoute();
    }
};

loadall();

function loadall() {
    const mapUrl = `${CDN_URL}/res-map.json`;
    
    fetch(mapUrl)
        .then(response => response.json())
        .then(resMap => {
            const loadPromises = [];
            log("资源映射关系:", resMap);
            log('开始链接静态资源');
            
            if (resMap['css']) {
                resMap['css'].forEach(element => {
                    if(vis_rea[element[0]]) return;
                    loadPromises.push(new Promise((resolve, reject) => {
                        log('css:', element);
                        const link = document.createElement('link');
                        link.rel = 'stylesheet';
                        link.href = element[1] === 1 ? element[0] : `${CDN_URL}/${element[0]}`;
                        link.onload = () => {
                            vis_rea[element[0]] = true;
                            resolve();
                        };
                        link.onerror = () => reject(new Error(`CSS 加载失败: ${element}`));
                        document.head.appendChild(link);
                    }));
                });
            }

            if (resMap['js']) {
                let chain = Promise.resolve();
                resMap['js'].forEach(element => {
                    if(vis_rea[element[0]]) return;
                    chain = chain.then(() => new Promise((resolve, reject) => {
                        log('js:', element);
                        const script = document.createElement('script');
                        script.src = element[1] === 1 ? element[0] : `${CDN_URL}/${element[0]}`;
                        // script.defer = true; 
                        script.onload = () => {
                            vis_rea[element[0]] = true;
                            resolve();
                        };
                        script.onerror = () => reject(new Error(`JS 加载失败: ${element}`));
                        document.body.appendChild(script);
                    }));
                });
                loadPromises.push(chain);
            }
            
            return Promise.all(loadPromises);
        })
        .catch(error => {
            log('资源加载出错', error);
        })
        .finally(() => {
            log("资源加载流程结束");
            // 移除 loading 动画
            let loader;
            while (loader = document.getElementById('first-load')) {
                loader.remove();
            }
            // 显示 App Shell
            const shell = document.getElementById('app-shell');
            if (shell) shell.style.display = 'block';
            
            // 触发 App 初始化
            if (window.App && window.App.init) {
                window.App.init();
            }
        });
}