module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      '@tamagui/babel-plugin',
      {
        components: ['tamagui', '@monorepo/ui'],
        config: './src/tamagui.config.ts',
      },
    ],
    'react-native-reanimated/plugin',
  ],
};
