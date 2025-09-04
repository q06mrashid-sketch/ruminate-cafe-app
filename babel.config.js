export default function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['module:react-native-dotenv', { allowUndefined: true }],
      'react-native-reanimated/plugin',
    ],
  };
}
