/**
 * 模糊搜索工具库
 * 
 * 提供简单的字符串模糊匹配功能，用于前端搜索过滤。
 */
(function() {
    /**
     * 计算 Levenshtein 编辑距离
     */
    function levenshtein(a, b) {
        const matrix = [];
        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) == a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
                    );
                }
            }
        }
        return matrix[b.length][a.length];
    }

    /**
     * 计算相似度 (0.0 - 1.0)
     */
    function getSimilarity(text, pattern) {
        if (!text || !pattern) return 0;
        text = text.toLowerCase();
        pattern = pattern.toLowerCase();
        
        // 包含匹配直接给高分 (0.8 + 长度占比 * 0.2)
        if (text.includes(pattern)) {
            const boost = 0.8 + (pattern.length / Math.max(text.length, 1)) * 0.2;
            return Math.min(1, boost);
        }

        const distance = levenshtein(text, pattern);
        const maxLength = Math.max(text.length, pattern.length);
        if (maxLength === 0) return 1.0;
        
        const score = 1 - (distance / maxLength);
        return Math.max(0, Math.min(1, score));
    }

    // 挂载到全局对象
    window.FuzzySearch = {
        similarity: getSimilarity
    };
})();
