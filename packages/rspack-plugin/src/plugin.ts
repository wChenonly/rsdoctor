import type { Configuration, RuleSetRule } from '@rspack/core';
import {
  findRoot,
  openBrowser,
  RsdoctorPrimarySDK,
  RsdoctorSDK,
} from '@rsdoctor/sdk';
import {
  InternalLoaderPlugin,
  InternalPluginsPlugin,
  InternalSummaryPlugin,
  makeRulesSerializable,
  setSDK,
  ensureModulesChunksGraphFn,
  InternalBundlePlugin,
  InternalRulesPlugin,
  InternalErrorReporterPlugin,
  InternalBundleTagPlugin,
  normalizeRspackUserOptions,
} from '@rsdoctor/core/plugins';
import type {
  RsdoctorRspackPluginInstance,
  RsdoctorRspackPluginOptions,
  RsdoctorRspackPluginOptionsNormalized,
} from '@rsdoctor/core';
import { Loader as BuildUtilLoader } from '@rsdoctor/core/build-utils';
import {
  Constants,
  Linter,
  Manifest,
  Manifest as ManifestType,
  Plugin,
  SDK,
} from '@rsdoctor/types';
import path from 'path';
import { pluginTapName, pluginTapPostOptions } from './constants';
import { cloneDeep } from 'lodash';

import { Loader } from '@rsdoctor/utils/common';
import { chalk, logger } from '@rsdoctor/utils/logger';
import { ModuleGraph } from '@rsdoctor/graph';

export class RsdoctorRspackPlugin<Rules extends Linter.ExtendRuleData[]>
  implements RsdoctorRspackPluginInstance<Rules>
{
  public readonly name = pluginTapName;

  public readonly sdk: RsdoctorSDK | RsdoctorPrimarySDK;

  public readonly isRsdoctorPlugin: boolean;

  public _bootstrapTask!: Promise<unknown>;

  protected browserIsOpened = false;

  public modulesGraph: SDK.ModuleGraphInstance;

  public options: RsdoctorRspackPluginOptionsNormalized<Rules>;

  public outsideInstance: boolean;

  constructor(options?: RsdoctorRspackPluginOptions<Rules>) {
    this.options = normalizeRspackUserOptions<Rules>(
      Object.assign(options || {}, {
        supports: {
          ...options?.supports,
          // Generate Tile Graph default false in rspack builder.
          generateTileGraph: options?.supports?.generateTileGraph
            ? options?.supports?.generateTileGraph
            : false,
        },
      }),
    );
    this.sdk =
      this.options.sdkInstance ??
      new RsdoctorSDK({
        port: this.options.port,
        name: pluginTapName,
        root: process.cwd(),
        type: this.options.output.reportCodeType,
        config: {
          innerClientPath: this.options.innerClientPath,
          printLog: this.options.printLog,
          mode: this.options.mode ? this.options.mode : undefined,
          brief: this.options.brief,
          compressData: this.options.output.compressData,
        },
      });
    this.outsideInstance = Boolean(this.options.sdkInstance);
    this.modulesGraph = new ModuleGraph();
    this.isRsdoctorPlugin = true;
  }

  // avoid hint error from ts type validation
  apply(compiler: unknown): unknown;

  apply(compiler: Plugin.BaseCompilerType<'rspack'>) {
    // bootstrap sdk in apply()
    // avoid to has different sdk instance in one plugin, because of webpack-chain toConfig() will new every webpack plugins.
    if (!this._bootstrapTask) {
      this._bootstrapTask = this.sdk.bootstrap();
    }

    if (compiler.options.name) {
      this.sdk.setName(compiler.options.name);
    }

    setSDK(this.sdk);

    compiler.hooks.afterPlugins.tap(
      pluginTapPostOptions,
      this.afterPlugins.bind(this, compiler),
    );
    compiler.hooks.done.tapPromise(
      {
        ...pluginTapPostOptions,
        stage: pluginTapPostOptions.stage! + 100,
      },
      this.done.bind(this, compiler),
    );

    // TODO: to fix the TypeError: Type instantiation is excessively deep and possibly infinite.
    // @ts-ignore
    new InternalSummaryPlugin<Plugin.BaseCompilerType<'rspack'>>(this).apply(
      compiler,
    );

    if (this.options.features.loader) {
      new BuildUtilLoader.ProbeLoaderPlugin().apply(compiler);
      // add loader page to client
      this.sdk.addClientRoutes([
        Manifest.RsdoctorManifestClientRoutes.WebpackLoaders,
      ]);

      if (!Loader.isVue(compiler)) {
        new InternalLoaderPlugin<Plugin.BaseCompilerType<'rspack'>>(this).apply(
          compiler,
        );
      }
    }

    if (this.options.features.plugins) {
      new InternalPluginsPlugin<Plugin.BaseCompilerType<'rspack'>>(this).apply(
        compiler,
      );
    }

    if (this.options.features.bundle) {
      new InternalBundlePlugin<Plugin.BaseCompilerType<'rspack'>>(this).apply(
        compiler,
      );
      new InternalBundleTagPlugin<Plugin.BaseCompilerType<'rspack'>>(
        this,
      ).apply(compiler);
    }

    if (this.options.features.resolver) {
      logger.info(
        chalk.yellow(
          'Rspack currently does not support Resolver capabilities.',
        ),
      );
    }

    new InternalRulesPlugin(this).apply(compiler);

    // InternalErrorReporterPlugin must called before InternalRulesPlugin, to avoid treat Rsdoctor's lint warnings/errors as Webpack's warnings/errors.
    new InternalErrorReporterPlugin(this).apply(compiler);

    // apply Rspack native plugin to improve the performance
    const RsdoctorRspackNativePlugin =
      compiler.webpack.experiments?.RsdoctorPlugin;
    if (
      this.options.experiments?.enableNativePlugin &&
      RsdoctorRspackNativePlugin
    ) {
      logger.debug('[RspackNativePlugin] Enabled');
      new RsdoctorRspackNativePlugin({
        // TODO: more detailed data features based on the rsdoctor options
        moduleGraphFeatures: true,
        chunkGraphFeatures: true,
      }).apply(compiler);
    }
  }

  /**
   * @description Generate ModuleGraph and ChunkGraph from stats and webpack module apis;
   * @param {Compiler} compiler
   * @return {*}
   * @memberof RsdoctorWebpackPlugin
   */
  public ensureModulesChunksGraphApplied(
    compiler: Plugin.BaseCompilerType<'rspack'>,
  ) {
    ensureModulesChunksGraphFn(compiler, this);
  }

  public afterPlugins = (compiler: Plugin.BaseCompilerType<'rspack'>): void => {
    this.getRspackConfig(compiler);
  };

  public done = async (
    compiler: Plugin.BaseCompilerType<'rspack'>,
  ): Promise<void> => {
    if (
      compiler.name?.toLowerCase() === 'lynx' &&
      compiler.options.optimization?.concatenateModules !== false
    ) {
      logger.info(
        `${chalk.yellow('Please disable concatenateModules when RSDOCTOR = true to accurately check bundled size.')} Details: https://rsdoctor.rs/guide/more/faq#bundle-analysis-page-nobundled-size`,
      );
    }

    await this.sdk.bootstrap();

    this.sdk.addClientRoutes([
      ManifestType.RsdoctorManifestClientRoutes.Overall,
    ]);

    if (this.outsideInstance && 'parent' in this.sdk) {
      this.sdk.parent.master.setOutputDir(
        path.resolve(
          this.options.output.reportDir || compiler.outputPath,
          `./${Constants.RsdoctorOutputFolder}`,
        ),
      );
    }

    this.sdk.setOutputDir(
      path.resolve(
        this.options.output.reportDir || compiler.outputPath,
        `./${Constants.RsdoctorOutputFolder}`,
      ),
    );
    await this.sdk.writeStore();
    if (!this.options.disableClientServer) {
      if (this.options.mode === SDK.IMode[SDK.IMode.brief]) {
        const outputFilePath = path.resolve(
          this.sdk.outputDir,
          this.options.brief.reportHtmlName || 'rsdoctor-report.html',
        );

        console.log(
          `${chalk.green('[RSDOCTOR] generated brief report')}: ${outputFilePath}`,
        );

        openBrowser(`file:///${outputFilePath}`);
      } else {
        await this.sdk.server.openClientPage('homepage');
      }
    }

    if (this.options.disableClientServer) {
      await this.sdk.dispose();
    }
  };

  public getRspackConfig(compiler: Plugin.BaseCompilerType<'rspack'>) {
    if (compiler.isChild()) return;
    const { plugins, infrastructureLogging, ...rest } = compiler.options;
    const _rest = cloneDeep(rest);

    makeRulesSerializable(_rest.module.defaultRules as RuleSetRule[]);
    makeRulesSerializable(_rest.module.rules as RuleSetRule[]);

    const configuration = {
      ..._rest,
      plugins: plugins.map((e) => e?.constructor.name),
    } as unknown as Configuration;

    const rspackVersion = compiler.webpack?.rspackVersion;
    const webpackVersion = compiler.webpack?.version;

    // save webpack or rspack configuration to sdk
    this.sdk.reportConfiguration({
      name: rspackVersion ? 'rspack' : 'webpack',
      version: rspackVersion || webpackVersion || 'unknown',
      config: configuration,
      root: findRoot() || '',
    });

    this.sdk.setOutputDir(
      path.resolve(
        this.options.output.reportDir || compiler.outputPath,
        `./${Constants.RsdoctorOutputFolder}`,
      ),
    );
  }
}
