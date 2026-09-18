import type { CommandDefinition } from '../../../commands/command-registry.js';

const IS_COMPONENTS_V2 = 32768;

export const helloCommand: CommandDefinition = {
  data: {
    name: 'hello',
    description: 'Responds with a hello world greeting',
  },
  moduleId: 'hello-world',
  guildOnly: true,
  permissionDeclared: true,
  async execute(interaction: unknown): Promise<void> {
    await (interaction as { reply: (options: unknown) => Promise<void> }).reply({
      flags: IS_COMPONENTS_V2,
      components: [
        {
          type: 10,
          content: '# Hello, World!\n\nThis is a test response from the hello-world module.',
        },
        {
          type: 17,
          components: [
            {
              type: 10,
              content: 'Dumby | Hello World\n-# Developed by Quixotic Mnemonics v1.0.0',
            },
          ],
        },
      ],
    });
  },
};
