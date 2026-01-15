import { createTamagui, TamaguiInternalConfig } from 'tamagui';
import { shorthands } from '@tamagui/shorthands/v2';
import { themes, tokens } from '@tamagui/themes/v3-themes';
import { animations } from '@tamagui/config/v3';
import { media, mediaQueryDefaultActive } from '@tamagui/config/v3';
import { fonts } from '@tamagui/config/v3';

const config: TamaguiInternalConfig = createTamagui({
  animations,
  themes,
  media,
  shorthands,
  tokens,
  fonts,
  settings: {
    mediaQueryDefaultActive,
    defaultFont: 'body',
    fastSchemeChange: true,
    shouldAddPrefersColorThemes: true,
    themeClassNameOnRoot: true,
  },
});

export default config;
