export interface EmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface EmbedData {
  title: string;
  description: string;
  color: number;
  fields?: EmbedField[];
  footer?: { text: string };
  timestamp?: string;
}

export interface EmbedBuilder {
  setTitle(title: string): EmbedBuilder;
  setDescription(description: string): EmbedBuilder;
  setColor(color: number): EmbedBuilder;
  addField(name: string, value: string, inline?: boolean): EmbedBuilder;
  setFooter(text: string): EmbedBuilder;
  setTimestamp(date?: Date): EmbedBuilder;
  build(): EmbedData;
}

export function createEmbed(): EmbedBuilder {
  let title = '';
  let description = '';
  let color = 0x5865f2;
  const fields: EmbedField[] = [];
  let footerText: string | undefined;
  let timestamp: string | undefined;

  return {
    setTitle(t: string) {
      title = t;
      return this;
    },
    setDescription(d: string) {
      description = d;
      return this;
    },
    setColor(c: number) {
      color = c;
      return this;
    },
    addField(name: string, value: string, inline = false) {
      fields.push({ name, value, inline });
      return this;
    },
    setFooter(text: string) {
      footerText = text;
      return this;
    },
    setTimestamp(date?: Date) {
      timestamp = (date ?? new Date()).toISOString();
      return this;
    },
    build(): EmbedData {
      const embed: EmbedData = { title, description, color };
      if (fields.length > 0) embed.fields = fields;
      if (footerText) embed.footer = { text: footerText };
      if (timestamp) embed.timestamp = timestamp;
      return embed;
    },
  };
}
