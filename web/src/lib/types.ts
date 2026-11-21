export type Review = {
  summary: string;
  correctness: string;
  timeComplexity: string;
  spaceComplexity: string;
  edgeCases: string[];
  tradeoffs: string;
  optimizedCode: string;
  walkthrough: string;
  pattern: string;
  patternLesson: string;
  nextPractice: string;
};
export type Coaching = { explanation: string; tradeoff: string; followUp: string; nextRep: string };
export type Practice = { id: string; title: string; problem: string; solution: string; language: string; createdAt: string; review: Review; coaching?: Coaching };
export type PublicConfig = { aiReady: boolean; supabaseUrl: string; supabaseKey: string; tableName: string };
