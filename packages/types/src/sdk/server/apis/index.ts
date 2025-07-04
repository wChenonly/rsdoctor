import { ServerResponse } from 'http';
import { PlainObject, Get } from '../../../common';
import { connect } from '../../../thirdparty';
import { RsdoctorBuilderSDKInstance } from '../../index';
import { RsdoctorServerInstance } from '../index';
import { LoaderData } from '../../loader';
import { ProjectAPIResponse, ProjectAPIRequestBody } from './project';
import { LoaderAPIResponse, LoaderAPIRequestBody } from './loader';
import { ResolverAPIResponse, ResolverAPIRequestBody } from './resolver';
import { PluginAPIResponse, PluginAPIRequestBody } from './plugin';
import { GraphAPIResponse, GraphAPIRequestBody } from './graph';
import { AlertsAPIResponse, AlertsAPIRequestBody } from './alerts';
import { RsdoctorManifestMappingKeys } from '../../../manifest';
import { SDK } from '../../../index';
import { StatsModule } from '@/plugin';

export * from './pagination';

export enum API {
  ApplyErrorFix = '/api/apply/error/fix',
  Env = '/api/env',
  EntryHtml = '/index.html',
  Manifest = '/api/manifest.json',

  LoadDataByKey = '/api/data/key',

  SendAPIDataToClient = '/api/socket/send',

  /** Project API */
  GetProjectInfo = '/api/project/info',
  GetClientRoutes = '/api/routes',

  /** Loader API */
  ReportLoader = '/api/loader/report',
  GetLoaderNames = '/api/loader/names',
  GetLoaderChartData = '/api/loader/chart/data',
  GetLoaderFileTree = '/api/loader/filetree',
  GetLoaderFileDetails = '/api/loader/file',
  GetLoaderFolderStatistics = '/api/loader/folder/statics',
  GetLoaderFileFirstInput = '/api/loader/input',
  GetLoaderFileInputAndOutput = '/api/loader/inputandoutput',
  GetDirectoriesLoaders = '/api/loader/directories',

  /** SourceMap API */
  ReportSourceMap = '/api/sourcemap/report',

  /** Resolver API */
  GetResolverFileTree = '/api/resolver/filetree',
  GetResolverFileDetails = '/api/resolver/file',

  /** Plugin API */
  GetPluginSummary = '/api/plugins/summary',
  GetPluginData = '/api/plugins/data',

  /** Graph API */
  GetSummaryBundles = '/api/graph/bundles/summary',
  GetChunkGraph = '/api/graph/chunks/graph',
  GetAssetsSummary = '/api/graph/assets/summary',
  GetAssetDetails = '/api/graph/asset/details',
  GetChunksByModuleId = '/api/graph/chunk/module',
  GetModuleDetails = '/api/graph/module/details',
  GetModulesByModuleIds = '/api/graph/modules/ids',
  GetEntryPoints = '/api/graph/entrypoints',
  GetModuleCodeByModuleId = '/api/graph/module/code',
  GetModuleCodeByModuleIds = '/api/graph/module/codes',
  GetAllModuleGraph = '/api/graph/module/all',
  GetAllChunkGraph = '/api/graph/chunk/all',
  GetLayers = '/api/graph/layers',
  GetSearchModules = '/api/search/modules',
  GetSearchModuleInChunk = '/api/search/chunk/modules',
  GetAllModuleGraphFilter = '/api/graph/module/filter',
  GetModuleByName = '/api/graph/module/name',
  GetModuleIssuerPath = '/api/graph/module/issuer_path',

  /** Package API */
  GetPackageInfo = '/api/package/info',
  GetPackageDependency = '/api/package/dependency',

  /** Alerts API */
  GetPackageRelationAlertDetails = '/api/alerts/details/package/relation',
  GetOverlayAlerts = '/api/alerts/overlay',

  /** BundleDiff API */
  BundleDiffManifest = '/api/bundle_diff/manifest.json',
  GetBundleDiffSummary = '/api/bundle_diff/summary',

  GetTileReportHtml = '/api/tile/report',

  /** AI API */
  GetChunkGraphAI = '/api/graph/chunks/graph/ai',
  GetChunkByIdAI = '/api/graph/chunk/id/ai',
}

/**
 * api which used outside the sdk.
 */
export enum APIExtends {
  GetCompileProgress = '/api/progress',
}

export interface SocketResponseType<T extends API | APIExtends = API> {
  /**
   * use to match for the event listener when there are different request body.
   */
  req: {
    api: T;
    body: InferRequestBodyType<T>;
  };
  /**
   * api response
   */
  res: InferResponseType<T>;
}

export interface ResponseTypes
  extends LoaderAPIResponse,
    ResolverAPIResponse,
    PluginAPIResponse,
    GraphAPIResponse,
    AlertsAPIResponse,
    ProjectAPIResponse {
  [API.ReportLoader]: 'ok';
  [API.EntryHtml]: string;
  [API.Manifest]: string;
  [API.ApplyErrorFix]: 'success';
  [API.LoadDataByKey]: unknown;
  [API.BundleDiffManifest]: SDK.BuilderStoreData;
  [API.GetBundleDiffSummary]: {
    root: string;
    hash: string;
    outputFilename: string;
    errors: SDK.ErrorsData;
    chunkGraph: SDK.ChunkGraphData;
    moduleGraph: SDK.ModuleGraphData;
    packageGraph: SDK.PackageGraphData;
    moduleCodeMap: SDK.ModuleCodeData;
    cloudManifestUrl: string;
  };
  [API.GetChunkGraph]: SDK.ChunkData[];
  [API.GetAllModuleGraphFilter]: SDK.ModuleData[];
  [API.GetModuleCodeByModuleId]: SDK.ModuleSource;
  [API.GetModuleCodeByModuleIds]: SDK.ModuleCodeData;
  [API.GetAllModuleGraph]: SDK.ModuleData[];
  [API.GetSearchModules]: Record<string, string>;
  [API.GetSearchModuleInChunk]: {
    id: string;
    path: string;
    relativePath: string;
  }[];
  [API.GetAllChunkGraph]: SDK.ChunkData[];
  [API.GetModuleByName]: { id: number; path: string }[];
  [API.GetModuleIssuerPath]: StatsModule['issuerPath'];
  [API.GetPackageInfo]: SDK.PackageData[];
  [API.GetPackageDependency]: SDK.PackageDependencyData[];
  [API.GetChunkByIdAI]: ExtendedChunkData[];
  [API.GetChunkGraphAI]: Omit<SDK.ChunkData, 'modules'>[];
  [API.GetSummaryBundles]: {
    asset: SDK.AssetData;
    modules: SDK.ModuleData[];
  }[];
}

export interface RequestBodyTypes
  extends LoaderAPIRequestBody,
    ResolverAPIRequestBody,
    PluginAPIRequestBody,
    GraphAPIRequestBody,
    AlertsAPIRequestBody,
    ProjectAPIRequestBody {
  [API.ReportLoader]: LoaderData;
  [API.SendAPIDataToClient]: {
    api: API;
    data: unknown;
  };
  [API.LoadDataByKey]: {
    /**
     * @example 'plugin'
     * @example 'moduleGraph.modules'
     */
    key: RsdoctorManifestMappingKeys;
  };
  [API.GetModuleByName]: {
    moduleName: string;
  };
  [API.GetModuleIssuerPath]: {
    moduleId: string;
  };
  [API.GetPackageDependency]: {
    packageId: string;
  };
  [API.GetChunkByIdAI]: {
    chunkId: string;
  };
}

export type InferResponseType<T, F = void> = Get<ResponseTypes, T, F>;

export type InferRequestBodyType<T, F = void> = Get<RequestBodyTypes, T, F>;

export interface APIContext {
  server: RsdoctorServerInstance;
  sdk: RsdoctorBuilderSDKInstance;
  req: connect.IncomingMessage & { body?: PlainObject };
  res: ServerResponse;
}

export interface ExtendedChunkData extends SDK.ChunkData {
  modulesInfo: {
    id: number;
    path: string;
    size: SDK.ModuleSize;
    chunks: string[];
    kind: SDK.ModuleKind;
    issuerPath: string[] | number[] | undefined;
  }[];
}
