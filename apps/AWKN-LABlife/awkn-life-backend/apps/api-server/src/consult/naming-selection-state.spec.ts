import { rebuildNamingSelectionState } from './naming-selection-state';

describe('rebuildNamingSelectionState', () => {
  it('replays reversible candidate actions in chronological order', () => {
    const state = rebuildNamingSelectionState([
      { eventType: 'naming_favorite', eventJson: '{"candidateId":"a"}' },
      { eventType: 'naming_favorite', eventJson: '{"candidateId":"b"}' },
      { eventType: 'naming_unfavorite', eventJson: '{"candidateId":"a"}' },
      { eventType: 'naming_remove', eventJson: '{"candidateId":"b"}' },
      { eventType: 'naming_restore', eventJson: '{"candidateId":"b"}' },
      { eventType: 'naming_compare', eventJson: '{"candidateId":"a","selected":true}' },
      { eventType: 'naming_compare', eventJson: '{"candidateId":"b","selected":true}' },
      { eventType: 'naming_compare', eventJson: '{"candidateId":"a","selected":false}' },
      { eventType: 'naming_final_select', eventJson: '{"candidateId":"b"}' },
      { eventType: 'naming_iteration_requested', eventJson: '{}' },
    ]);

    expect(state).toEqual({
      favoriteCandidateIds: ['b'],
      removedCandidateIds: [],
      compareCandidateIds: ['b'],
      finalCandidateId: 'b',
      iterationCount: 1,
    });
  });

  it('ignores malformed events without losing valid state', () => {
    const state = rebuildNamingSelectionState([
      { eventType: 'naming_favorite', eventJson: 'not-json' },
      { eventType: 'naming_favorite', eventJson: '{"candidateId":"ok"}' },
    ]);
    expect(state.favoriteCandidateIds).toEqual(['ok']);
  });
});
