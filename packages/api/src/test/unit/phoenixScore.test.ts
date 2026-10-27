import { MIXES } from '@pumpking/utils/mixes';
import { getPhoenixScore, getUnroundedPhoenixScore } from '@pumpking/utils/phoenixScore';
import { assert } from 'chai';

// Real results whose exact score is a whole number, where the arcade can show one less
describe('Phoenix score', () => {
  const stats = (
    perfect: number,
    great: number,
    good: number,
    bad: number,
    miss: number,
    combo: number
  ) => ({ perfect, great, good, bad, miss, combo });

  it('is one below the exact score on Phoenix for some stats', () => {
    // The photo upload rejected as 973,583, and result #303067
    const rejected = stats(960, 23, 6, 4, 7, 612);
    assert.strictEqual(getUnroundedPhoenixScore(rejected), 973_583);
    assert.strictEqual(getPhoenixScore(rejected, MIXES.Phoenix), 973_582);
    assert.strictEqual(getPhoenixScore(stats(479, 10, 0, 7, 4, 128), MIXES.Phoenix), 967_822);
  });

  it('is one below the exact score on Phoenix 2 for other stats', () => {
    // Result #302569: exactly 973,629, and Phoenix would show that
    const below = stats(963, 19, 7, 4, 7, 462);
    assert.strictEqual(getPhoenixScore(below, MIXES.Phoenix2), 973_628);
    assert.strictEqual(getPhoenixScore(below, MIXES.Phoenix), 973_629);
    // Result #302749: exactly 992,196, which Phoenix 2 shows and Phoenix wouldn't
    const exact = stats(987, 9, 2, 0, 2, 872);
    assert.strictEqual(getPhoenixScore(exact, MIXES.Phoenix2), 992_196);
    assert.strictEqual(getPhoenixScore(exact, MIXES.Phoenix), 992_195);
  });

  it('is the exact score rounded down before Phoenix', () => {
    assert.strictEqual(getPhoenixScore(stats(960, 23, 6, 4, 7, 612), MIXES.XX), 973_583);
    assert.strictEqual(getPhoenixScore(stats(90, 5, 3, 1, 1, 95), MIXES.XX), 937_065);
  });
});
