/**
 * 模糊搜索工具库
 * 
 * 提供简单的字符串模糊匹配功能，用于前端搜索过滤。
 */
(function() {
    /**
     * 模糊匹配算法
     * 
     * 检查 pattern 中的字符是否按顺序出现在 text 中。
     * 例如：pattern="abc" 可以匹配 text="a_b_c"，但不能匹配 "acb"。
     * 
     * @param {string} text - 待搜索的源文本
     * @param {string} pattern - 搜索关键词
     * @returns {boolean} 是否匹配
     */
    function fuzzyMatch(text, pattern) {
        // 边界检查
        if (!text || !pattern) return false;
        
        // 统一转换为小写，实现不区分大小写匹配
        text = text.toLowerCase();
        pattern = pattern.toLowerCase();
        
        let patternIdx = 0;
        let textIdx = 0;
        
        // 双指针遍历
        while (patternIdx < pattern.length && textIdx < text.length) {
            // 如果当前字符匹配，pattern 指针后移
            if (pattern[patternIdx] === text[textIdx]) {
                patternIdx++;
            }
            // text 指针始终后移
            textIdx++;
        }
        
        // 如果 pattern 指针走到了末尾，说明所有字符都按顺序找到了
        return patternIdx === pattern.length;
    }

    // 挂载到全局对象，供其他模块调用
    window.FuzzySearch = {
        match: fuzzyMatch
    };
})();
