/**
 * 卡片组交互逻辑 (Accordion Cards)
 * 
 * 实现了一组水平排列的卡片，鼠标悬停时展开当前卡片，
 * 并推开后续卡片，形成手风琴效果。
 * 
 * 核心原理：
 * 1. 使用 CSS 变量 (--base-x, --offset-x) 控制卡片位置。
 * 2. JS 计算每张卡片的宽度，动态设置位移。
 * 3. 监听 mouseenter/mouseleave 事件更新状态。
 */
function cardsInit() {
    document.querySelectorAll('.cardgroup').forEach(group => {
        console.log("Initializing Card Group");
        
        const cardlist = group.querySelectorAll('.card-t');
        const widthlist = [];
        let activeNode = null;
        let allwidth = 0;
        let totleheadwidth = 0;
        
        // 获取 CSS 中定义的悬停激活状态值
        const hoveract = window.getComputedStyle(group).getPropertyValue('--hover-act').trim();

        cardlist.forEach((card, i) => {
            // 设置层级，保证后面的卡片在视觉上覆盖前面的（如果需要）
            // 但在这个布局中，通常是平铺或部分重叠
            card.style.zIndex = i + 1;
            
            const body = cardlist[i].getElementsByClassName('cardbody')[0];
            
            // --- 获取计算后的样式 ---
            const computedStyle = window.getComputedStyle(card);
            // 解析边框宽度，确保计算准确
            const borderLeft = parseFloat(computedStyle.borderLeftWidth) || 0;
            const borderRight = parseFloat(computedStyle.borderRightWidth) || 0;
            const totalBorderWidth = borderLeft + borderRight;

            // 记录当前卡片内容的实际宽度
            widthlist[i] = body.offsetWidth + totalBorderWidth;
            
            const head = cardlist[i].getElementsByClassName('cardhead')[0];
            totleheadwidth += head.offsetWidth + totalBorderWidth;
            
            // 1. 设置基础堆叠位置 (--base-x)
            // 每张卡片向左偏移，抵消掉前面所有卡片的宽度，从而实现初始的紧凑排列（如果 CSS 是这样设计的）
            // 或者这里是用来计算展开时的基准位置
            if (i > 0) {
                allwidth += widthlist[i - 1];
                card.style.setProperty('--base-x', `-${allwidth}px`);
            }
            
            // 2. 鼠标悬停事件：展开卡片
            card.addEventListener('mouseenter', () => {
                // 将 DOM 修改放入下一次渲染帧，保证动画流畅
                requestAnimationFrame(() => {
                    // 还原上一个激活节点造成的影响
                    if (activeNode !== null && activeNode !== i) {
                        // 让之前被推开的卡片归位
                        for (let j = activeNode + 1; j < cardlist.length; j++) {
                            cardlist[j].style.setProperty('--offset-x', '');
                        }
                        // 让上一个 act 的卡片归位
                        cardlist[activeNode].style.setProperty('--unhover-act', '');
                    }

                    // 推开当前卡片后面的所有卡片
                    // 偏移量 = 当前卡片内容宽度 + 间隙
                    for (let j = i + 1; j < cardlist.length; j++) {
                        cardlist[j].style.setProperty('--offset-x', `calc(${widthlist[i]}px + var(--card-gap))`);
                    }

                    // 标记当前卡片为激活状态 (CSS 中可能用到这个变量来改变样式)
                    card.style.setProperty('--unhover-act', hoveract);

                    activeNode = i;
                });
            });

            // 3. 鼠标离开事件：恢复状态
            card.addEventListener('mouseleave', () => {
                requestAnimationFrame(() => {
                    card.style.setProperty('--unhover-act', '');
                });
            });
        });
        
        // 4. 响应式布局调整
        // 确保最后一张卡片能填满剩余空间
        const lastCard = cardlist[cardlist.length - 1];
        if (!lastCard) return;
        
        const lastBody = lastCard.getElementsByClassName('cardbody')[0];
        const updateLastCardLayout = () => {
            if (cardlist.length === 0) return;
            // 检查是否有足够的剩余空间
            if (totleheadwidth < group.offsetWidth - 100) {
                // 动态设置最后一张卡片的宽度以填满容器
                lastBody.style.minWidth = (group.offsetWidth - totleheadwidth) + 'px';
            } else {
                lastBody.style.minWidth = '';
            }
        };

        // 初始化执行一次
        updateLastCardLayout();

        // 使用 ResizeObserver 监听父容器宽度变化
        const observer = new ResizeObserver(() => {
            updateLastCardLayout();
        });

        // 开始监听
        observer.observe(group);
    });
}