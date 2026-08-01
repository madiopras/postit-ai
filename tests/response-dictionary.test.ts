import { describe, expect, it } from 'vitest';
import {
  enforceResponseDictionary,
  hasResponseDictionary,
} from '@/lib/response-dictionary';

describe('response dictionary enforcement', () => {
  it('removes forbidden phrases case-insensitively, including regex characters', () => {
    const result = enforceResponseDictionary(
      'This contains INTERNAL SECRET and price is $5.00.',
      'question',
      { forbiddenWords: ['internal secret', '$5.00'] }
    );

    expect(result.toLocaleLowerCase()).not.toContain('internal secret');
    expect(result).not.toContain('$5.00');
  });

  it('adds always-required and conditionally-required phrases only when missing', () => {
    const result = enforceResponseDictionary(
      'Berikut proses onboarding.',
      'Bagaimana onboarding employee baru?',
      {
        requiredWords: [
          { phrase: 'Hubungi HR', condition: 'employee' },
          { phrase: 'Syarat berlaku', condition: '' },
          { phrase: 'Tidak aktif', condition: 'refund' },
        ],
      }
    );

    expect(result).toContain('Hubungi HR');
    expect(result).toContain('Syarat berlaku');
    expect(result).not.toContain('Tidak aktif');
  });

  it('does not duplicate a required phrase already produced by the model', () => {
    const result = enforceResponseDictionary(
      'Silakan Hubungi HR untuk bantuan.',
      'employee account',
      { requiredWords: [{ phrase: 'hubungi hr', condition: 'employee' }] }
    );

    expect(result.toLocaleLowerCase().match(/hubungi hr/g)).toHaveLength(1);
  });

  it('detects whether buffering is required', () => {
    expect(hasResponseDictionary({})).toBe(false);
    expect(hasResponseDictionary({ forbiddenWords: ['secret'] })).toBe(true);
  });
});
