import { Asset, Chunk, ChunkGraph, EntryPoint } from '@rsdoctor/graph';
import { Plugin } from '@rsdoctor/types';

const FILTER_ASSETS_TYPE = 'assets by status';

export function chunkTransform(
  assetMap: Map<string, { content: string }>,
  bundleStats: Plugin.StatsCompilation,
) {
  const chunkGraph = new ChunkGraph();

  const chunks = bundleStats.chunks;
  if (chunks) {
    for (let i = 0, len = chunks.length; i < len; i++) {
      const _chunk = chunks[i];
      const chunk = new Chunk(
        String(_chunk.id),
        _chunk.names?.join('') || _chunk.files?.join('| ') || '',
        _chunk.size,
        _chunk.initial,
        _chunk.entry,
      );
      chunk.setParsedSize(0);
      chunkGraph.addChunk(chunk);
    }
  }
  const assets = bundleStats.assets;
  if (assets) {
    for (let i = 0, len = assets.length; i < len; i++) {
      const _asset = assets[i];
      if (_asset.type === FILTER_ASSETS_TYPE) {
        /**  Filter assets with type = 'assets by status',
         * which are the assets that are initially pushed when generating assets groups to record asset size info.
         * This feature is only available in webpack@5.xx and later versions.
         **/
        continue;
      }

      const chunks =
        _asset.chunks
          ?.map((ck) => {
            const chunk = chunkGraph.getChunkById(String(ck));
            return chunk;
          })
          .filter(<T>(chunk: T): chunk is NonNullable<T> => !!chunk) || [];

      const { content = '' } = assetMap.get(_asset.name) || {};
      const asset = new Asset(_asset.name, _asset.size, chunks, content);

      for (let j = 0, jLen = chunks.length; j < jLen; j++) {
        const chunk = chunks[j];
        chunk?.addAsset(asset);
      }

      chunkGraph.addAsset(asset);
    }
  }

  const entrypoints = bundleStats.entrypoints;
  if (entrypoints) {
    for (const [key, _entrypoint] of Object.entries(entrypoints)) {
      const entrypoint = new EntryPoint(_entrypoint.name || key);

      if (_entrypoint.chunks) {
        for (const chunkId of _entrypoint.chunks) {
          const ck = chunkGraph.getChunkById(`${chunkId}`);
          if (ck) entrypoint.addChunk(ck);
        }
      }
      if (_entrypoint.assets) {
        for (const _asset of _entrypoint.assets) {
          const asset = chunkGraph.getAssetByPath(_asset.name);
          if (asset) entrypoint.addAsset(asset);
        }
      }
      chunkGraph.addEntryPoint(entrypoint);
    }
  }

  return chunkGraph;
}
