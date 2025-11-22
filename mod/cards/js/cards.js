
document.querySelectorAll('.cardgroup').forEach(group => {
    const cardlist = group.querySelectorAll('.card');
    const widthlist = [];
    let activeNode = null;
    let allwidth = 0;
    let totleheadwidth = 0;
    const hoveract = window.getComputedStyle(group).getPropertyValue('--hover-act').trim();
    // console.log(hoveract);

    cardlist.forEach((card, i) => {
        card.style.zIndex = i + 1;
        const body = cardlist[i].getElementsByClassName('cardbody')[0];
        // --- 获取计算后的样式 ---
        const computedStyle = window.getComputedStyle(card);
        // 解析边框宽度 (parseFloat 会去掉 'px' 并转为数字，如果没有边框则为 0)
        const borderLeft = parseFloat(computedStyle.borderLeftWidth) || 0;
        const borderRight = parseFloat(computedStyle.borderRightWidth) || 0;
        const totalBorderWidth = borderLeft + borderRight;

        // widthlist[i] = body.offsetWidth; // 原代码
        // 如果你需要包含边框的宽度来计算偏移：
        widthlist[i] = body.offsetWidth + totalBorderWidth;
        const head = cardlist[i].getElementsByClassName('cardhead')[0];
        totleheadwidth += head.offsetWidth + totalBorderWidth;
        // 1. 设置基础堆叠位置 (--base-x)
        if (i > 0) {
            allwidth += widthlist[i - 1];
            card.style.setProperty('--base-x', `-${allwidth}px`);
            // card.style.setProperty('--base-x', `calc(-${allwidth}px + ${i} * var(--card-gap))`);
        }
        card.addEventListener('mouseenter', () => {
            // 将 DOM 修改放入下一次渲染帧，保证动画流畅
            requestAnimationFrame(() => {
                // 1. 还原上一个激活节点造成的影响
                if (activeNode !== null && activeNode !== i) {
                    // 让之前被推开的卡片归位
                    for (let j = activeNode + 1; j < cardlist.length; j++) {
                        cardlist[j].style.setProperty('--offset-x', '');
                    }
                    // 让上一个act的卡片归位 (双重保险，防止 mouseleave 未触发)
                    cardlist[activeNode].style.setProperty('--unhover-act', '');
                }

                // 2. 推开当前卡片后面的所有卡片
                for (let j = i + 1; j < cardlist.length; j++) {
                    cardlist[j].style.setProperty('--offset-x', `calc(${widthlist[i]}px + var(--card-gap))`);
                }

                card.style.setProperty('--unhover-act', hoveract);

                activeNode = i;
            });
        });

        card.addEventListener('mouseleave', () => {
            requestAnimationFrame(() => {
                card.style.setProperty('--unhover-act', '');
            });
        });
    });
    // 2. 定义更新布局的函数
    const lastCard = cardlist[cardlist.length - 1];
    const lastBody = lastCard.getElementsByClassName('cardbody')[0];
    const updateLastCardLayout = () => {
        if (cardlist.length === 0) return;
        // 检查是否有足够的剩余空间
        // 注意：这里假设 totleheadwidth 是固定的，如果头部宽度也会变，需要重新计算
        if (totleheadwidth < group.offsetWidth - 100) {
            // 动态设置最后一张卡片的宽度以填满容器
            lastBody.style.minWidth = (group.offsetWidth - totleheadwidth) + 'px';
        } else {
            lastBody.style.minWidth = '';
        }
    };

    // 3. 初始化执行一次
    updateLastCardLayout();

    // 4. 使用 ResizeObserver 监听父容器宽度变化
    const observer = new ResizeObserver(() => {
        // 当 group 尺寸变化时自动触发
        updateLastCardLayout();
    });

    // 开始监听
    observer.observe(group);
});
