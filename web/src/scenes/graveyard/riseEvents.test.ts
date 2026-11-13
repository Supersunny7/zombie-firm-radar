import { describe, expect, it, vi } from 'vitest';
import { riseEvents } from './riseEvents';

describe('riseEvents', () => {
  it('delivers events to current subscribers only, with no replay', () => {
    const early = vi.fn();
    const offEarly = riseEvents.subscribe(early);
    riseEvents.emit({ cik: '0000000001', position: [1, 0, 2] });

    const late = vi.fn();
    const offLate = riseEvents.subscribe(late);
    expect(late).not.toHaveBeenCalled();

    riseEvents.emit({ cik: '0000000002', position: [0, 0, 0] });
    expect(early).toHaveBeenCalledTimes(2);
    expect(late).toHaveBeenCalledTimes(1);
    expect(late).toHaveBeenCalledWith({ cik: '0000000002', position: [0, 0, 0] });

    offEarly();
    offLate();
    riseEvents.emit({ cik: '0000000003', position: [0, 0, 0] });
    expect(early).toHaveBeenCalledTimes(2);
    expect(late).toHaveBeenCalledTimes(1);
  });
});
