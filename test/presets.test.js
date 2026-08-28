import { describe, it, expect } from 'vitest';
import { mountApp, setValue } from './helpers/mountApp.js';
import { customPresets, tasks, timerState } from './helpers/storage.js';

function clickPreset(els, label) {
  [...els.presetGrid.querySelectorAll('.preset-btn')].find((b) => b.textContent.includes(label)).click();
}

describe('session-length presets', () => {
  it('switching preset updates the durations and resets the idle phase', async () => {
    const els = await mountApp();
    clickPreset(els, 'Study & practice'); // 25 / 5

    expect(els.workInput.value).toBe('25');
    expect(els.breakInput.value).toBe('5');
    expect(els.timeReadout.textContent).toBe('25:00');
    expect(timerState().presetId).toBe('study');
  });

  it('adding a custom preset appends it to the grid and persists it', async () => {
    const els = await mountApp();
    els.presetAddBtn.click();
    setValue(document.getElementById('presetNewName'), 'Language drills');
    setValue(document.getElementById('presetNewWork'), 20);
    setValue(document.getElementById('presetNewBreak'), 4);
    document.getElementById('presetSaveBtn').click();

    const saved = customPresets();
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ label: 'Language drills', work: 20, brk: 4 });
    expect(els.presetGrid.textContent).toContain('Language drills');
  });

  it('deleting a custom preset falls back any task using it to "custom"', async () => {
    const els = await mountApp();
    els.presetAddBtn.click();
    setValue(document.getElementById('presetNewName'), 'Language drills');
    document.getElementById('presetSaveBtn').click();
    const customId = customPresets()[0].id;

    // Point a task at the custom preset directly (mirrors what addTask() would
    // store while that preset is selected), then delete the preset.
    localStorage.setItem(
      'pomodoroBench.tasks.v1',
      JSON.stringify([{ id: 't1', name: 'Practice French', category: 'Learning', estimate: 1, completed: 0, done: false, sessionPresetId: customId, workMin: 20, breakMin: 4, notes: [] }])
    );

    els.presetGrid.querySelector('.preset-del').click();

    expect(customPresets()).toHaveLength(0);
    expect(tasks()[0].sessionPresetId).toBe('custom');
  });
});
