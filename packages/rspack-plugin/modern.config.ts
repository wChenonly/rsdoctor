import { defineConfig } from '@modern-js/module-tools';
import { baseBuildConfig } from '../../scripts/modern.base.config';
import { merge } from 'es-toolkit/object';

const modernConfig = defineConfig({
  ...merge(baseBuildConfig, {
    buildConfig: { tsconfig: 'tsconfig.build.json' },
  }),
});

export default modernConfig;
