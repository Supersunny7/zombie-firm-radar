// Recipe version for models: a staging-marker change must defeat the unchanged-skip.
import { describe, expect, it } from 'vitest';
import { MODEL_STAGING_MARKER, productionEnv } from './fetch-assets.mjs';
import { makeEnv, makePick } from './asset-lib/test-helpers/fakes.mjs';
import { runFetch } from './asset-lib/run-fetch.mjs';

describe('model recipe version', () => {
  it('carries the avatar texture staging marker', async () => {
    const env = await productionEnv();
    expect(MODEL_STAGING_MARKER).toBe('avatar-textures/v2');
    expect(env.recipeVersions.model).toContain(MODEL_STAGING_MARKER);
  });

  it('re-converts when the model recipe version changes although inputs are identical', async () => {
    const { env, convertCalls } = await makeEnv();
    const picks = [makePick('some-avatar', 'model')];
    const first = await runFetch({ picks, env: { ...env, recipeVersions: { model: 'a' } } });
    expect(first.exitCode).toBe(0);
    const same = await runFetch({ picks, env: { ...env, recipeVersions: { model: 'a' } } });
    expect(same.plan.map((p) => p.action)).toEqual(['unchanged']);
    const bumped = await runFetch({ picks, env: { ...env, recipeVersions: { model: 'a avatar-textures/v2' } } });
    expect(bumped.plan.map((p) => p.action)).not.toContain('unchanged');
    expect(convertCalls.length).toBe(2);
  });
});
