import { createJiti } from 'jiti'
import { mergeConfigs, presetWind4 } from 'unocss'

const jiti = createJiti(import.meta.url)
const baseModule = await jiti.import('@slidev/client/uno.config')
// @ts-expect-error base config is authored in TypeScript without types
const baseConfig = baseModule.default ?? baseModule

export default mergeConfigs([
  baseConfig,
  {
    presets: [
      presetWind4(),
    ]
  }
])
