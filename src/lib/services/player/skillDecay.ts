export interface SkillNode {
  id: string;
  name: string;
  level: number;
  lastTrainedTimestamp: number;
}

export function calculateSkillDecay(
  nodes: SkillNode[],
  nowTimestamp: number = Date.now()
): { updatedNodes: SkillNode[]; decayedCount: number } {
  let decayedCount = 0;
  const SEVENTY_TWO_HOURS_MS = 72 * 60 * 60 * 1000;

  const updatedNodes = nodes.map((node) => {
    const elapsed = nowTimestamp - node.lastTrainedTimestamp;
    if (elapsed >= SEVENTY_TWO_HOURS_MS) {
      const intervals = Math.floor(elapsed / SEVENTY_TWO_HOURS_MS);
      // 1% decay per 72 hours
      const decayFactor = Math.pow(0.99, intervals);
      const newLevel = Math.max(0, Math.round(node.level * decayFactor * 100) / 100);
      if (newLevel < node.level) {
        decayedCount++;
      }
      return {
        ...node,
        level: newLevel
      };
    }
    return node;
  });

  return { updatedNodes, decayedCount };
}
