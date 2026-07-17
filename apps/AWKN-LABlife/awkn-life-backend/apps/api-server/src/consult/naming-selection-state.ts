export interface NamingSelectionEvent {
  eventType: string;
  eventJson?: string | null;
}

export interface NamingSelectionState {
  favoriteCandidateIds: string[];
  removedCandidateIds: string[];
  compareCandidateIds: string[];
  finalCandidateId: string | null;
  iterationCount: number;
}

export function rebuildNamingSelectionState(events: NamingSelectionEvent[]): NamingSelectionState {
  const favorites = new Set<string>();
  const removed = new Set<string>();
  const compared = new Set<string>();
  let finalCandidateId: string | null = null;
  let iterationCount = 0;

  for (const event of events) {
    let payload: Record<string, unknown> = {};
    try { payload = JSON.parse(event.eventJson || '{}'); } catch { payload = {}; }
    const candidateId = String(payload.candidateId || '');

    if (event.eventType === 'naming_iteration_requested') {
      iterationCount += 1;
      continue;
    }
    if (!candidateId) continue;
    if (event.eventType === 'naming_favorite') favorites.add(candidateId);
    if (event.eventType === 'naming_unfavorite') favorites.delete(candidateId);
    if (event.eventType === 'naming_remove') removed.add(candidateId);
    if (event.eventType === 'naming_restore') removed.delete(candidateId);
    if (event.eventType === 'naming_compare') {
      if (payload.selected === false) compared.delete(candidateId);
      else compared.add(candidateId);
    }
    if (event.eventType === 'naming_final_select') finalCandidateId = candidateId;
  }

  return {
    favoriteCandidateIds: [...favorites],
    removedCandidateIds: [...removed],
    compareCandidateIds: [...compared],
    finalCandidateId,
    iterationCount,
  };
}
