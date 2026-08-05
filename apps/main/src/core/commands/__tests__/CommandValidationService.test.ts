import { ApplicationCommandType, ContextMenuCommandBuilder } from 'discord.js';
import { describe, expect, it } from 'vitest';
import { CommandValidationService } from '../CommandValidationService.js';
import { slash, userMenu } from './helpers.js';

describe('CommandValidationService', () => {
  const service = new CommandValidationService();

  it('rejects missing data, missing execute, invalid type, core RBAC, context menu limits, and prefix-like names', () => {
    expect(() => service.validateAndNormalize({ execute: async () => undefined } as never, 'standard')).toThrow();
    expect(() => service.validateAndNormalize({ data: slash('x').data } as never, 'standard')).toThrow();
    expect(() =>
      service.validateAndNormalize(
        {
          data: { toJSON: () => ({ name: 'bad', type: 99 }) },
          execute: async () => undefined,
        } as never,
        'standard',
      ),
    ).toThrow();
    expect(() =>
      service.validateAndNormalize(
        { ...slash('secure'), permissions: { rbac: 'ADMIN' } },
        'core',
      ),
    ).toThrow();
    expect(() => service.validateAndNormalize(slash('!ping'), 'standard')).toThrow();
    expect(() =>
      service.validateContextMenuLimits(
        Array.from({ length: 6 }, (_, index) => ({
          moduleSlug: `m${index}`,
          tier: 'standard',
          command: userMenu(`User ${index}`),
        })),
      ),
    ).toThrow();
    expect(() =>
      service.validateContextMenuLimits(
        Array.from({ length: 6 }, (_, index) => ({
          moduleSlug: `m${index}`,
          tier: 'standard',
          command: {
            data: new ContextMenuCommandBuilder()
              .setName(`Message ${index}`)
              .setType(ApplicationCommandType.Message),
            execute: async () => undefined,
          },
        })),
      ),
    ).toThrow();
  });
});
