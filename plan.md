1. **Analyze the Optimization Opportunity**: The `DirectorCommsCompliancePanel.svelte` makes an N+1 query when fetching `team_broadcasts` and `messaging_audit` documents for each team. This creates excessive Firestore reads and increases network latency.
2. **Implement Chunking**: Batch `teamIds` into chunks of 30 (the maximum allowed by Firestore for `in` queries).
3. **Optimize the Queries**: Replace the `where('teamId', '==', teamId)` clauses with `where('teamId', 'in', chunk)`. Update the limits. The final array takes 60 broadcasts and 80 messaging audits, so we can limit each chunk to 60 for `team_broadcasts` and 80 for `messaging_audit`.
4. **Test & Verify**: Measure the performance with a benchmark script before and after, run format and lint checks, and run the test suite.
5. **Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done**.
6. **Submit PR**.
