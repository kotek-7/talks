// @ts-expect-error - Ignoring the error of missing types for the uno config
import config from '@slidev/client/uno.config.ts'
import { mergeConfigs, presetWind4 } from 'unocss'

export default mergeConfigs([
  config,
  {
    presets: [
      presetWind4(),
    ]
  }
])
