import {AngularCompilerPlugin, NgToolsLoader, PLATFORM} from "@ngtools/webpack";
import {DefinePlugin} from "webpack";
import {readConfiguration} from "@angular/compiler-cli";

import {BuildAngularCompilationFlags, BuildEnvironment} from "webpack-configs/model";
import {ENVIRONMENT, rootRelativePath} from "webpack-configs/lib";
import {WEB_CHUNK_NAMES} from "src/shared/constants";
import {browserWindowAppPath, browserWindowPath, buildBaseWebConfig, cssRuleSetUseItems} from "./lib";

const angularCompilationFlags: BuildAngularCompilationFlags = {
    aot: true,
    ivy: true,
};

const tsConfigFile = browserWindowPath(({
    production: "./tsconfig.json",
    development: "./tsconfig.development.json",
    test: "./test/tsconfig.json",
} as Record<BuildEnvironment, string>)[ENVIRONMENT]);

const config = buildBaseWebConfig(
    {
        module: {
            rules: [
                {
                    test: angularCompilationFlags.aot
                        ? /(?:\.ngfactory\.js|\.ngstyle\.js|\.ts)$/
                        : /\.ts$/,
                    use: [
                        "@angular-devkit/build-optimizer/webpack-loader",
                        NgToolsLoader,
                    ],
                },
                {
                    test: /[\/\\]@angular[\/\\].+\.js$/,
                    sideEffects: false,
                    parser: {
                        system: true,
                    },
                },
                {
                    test: /\.scss$/,
                    use: [
                        "to-string-loader",
                        ...cssRuleSetUseItems(),
                        "resolve-url-loader",
                        "sass-loader",
                    ],
                    include: [
                        browserWindowAppPath(),
                    ],
                },
            ],
        },
        resolve: {
            alias: {
                images: rootRelativePath("images"),
            },
        },
        plugins: [
            new DefinePlugin({
                BUILD_ANGULAR_COMPILATION_FLAGS: JSON.stringify(angularCompilationFlags),
            }),
            (() => {
                type StrictTemplateOptions
                    = NoExtraProperties<Required<import("@angular/compiler-cli/src/ngtsc/core/api").StrictTemplateOptions>>;
                const strictTemplateOptions: StrictTemplateOptions = {
                    strictAttributeTypes: true,
                    strictContextGenerics: true,
                    strictDomEventTypes: true,
                    strictDomLocalRefTypes: true,
                    strictInputTypes: true,
                    strictNullInputTypes: true,
                    strictOutputEventTypes: true,
                    strictSafeNavigationTypes: true,
                    strictTemplates: true,
                };
                type LegacyNgcOptions
                    = NoExtraProperties<Required<Pick<import("@angular/compiler-cli/src/ngtsc/core/api").LegacyNgcOptions,
                    | "fullTemplateTypeCheck"
                    | "strictInjectionParameters">>>;
                const legacyNgcOptions: LegacyNgcOptions = {
                    fullTemplateTypeCheck: angularCompilationFlags.aot || angularCompilationFlags.ivy,
                    strictInjectionParameters: true,
                };
                return new AngularCompilerPlugin({
                    contextElementDependencyConstructor: require("webpack/lib/dependencies/ContextElementDependency"),
                    tsConfigPath: tsConfigFile,
                    compilerOptions: {
                        ...strictTemplateOptions,
                        ...legacyNgcOptions,
                        preserveWhitespaces: false,
                        disableTypeScriptVersionCheck: true,
                        enableIvy: angularCompilationFlags.ivy,
                        ...readConfiguration(tsConfigFile).options,
                        // tslint:disable-next-line:max-line-length
                        // https://github.com/angular/angular/blob/24b2f1da2bfaa8afa6e01920d94e00574fd4d5a3/packages/compiler-cli/src/ngtsc/core/api.ts#L366-L375
                        // ivyTemplateTypeCheck: angularCompilationFlags.ivy,
                    },
                    platform: PLATFORM.Browser,
                    skipCodeGeneration: !angularCompilationFlags.aot,
                    nameLazyFiles: true,
                    discoverLazyRoutes: true, // TODO disable "discoverLazyRoutes" once switched to Ivy renderer
                    directTemplateLoading: false,
                    entryModule: `${browserWindowAppPath("./app.module")}#AppModule`,
                });
            })(),
        ],
        optimization: {
            splitChunks: {
                cacheGroups: {
                    commons: {
                        test: /[\\/]node_modules[\\/]|[\\/]vendor[\\/]/,
                        name: "vendor",
                        chunks: "all",
                    },
                    "_db-view": {
                        test: /src[\\/]web[\\/]browser-window[\\/]app[\\/]_db-view/,
                        name: "_db-view",
                        chunks: "all",
                    },
                },
            },
        },
    },
    {
        tsConfigFile,
        chunkName: WEB_CHUNK_NAMES["browser-window"],
    },
);

export default config;
