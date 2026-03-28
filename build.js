// 构建脚本 - 将src目录下的模块打包成worker.js
import { build } from 'esbuild';

async function buildWorker() {
  try {
    await build({
      entryPoints: ['./src/server.js'],
      bundle: true,
      outfile: 'worker.js',
      format: 'esm',
      platform: 'neutral',
      target: 'es2022',
      external: [],
      minify: false,
      sourcemap: true,
      legalComments: 'none',
      keepNames: true,
      charset: 'utf8',
      define: {
        'process.env.NODE_ENV': '"development"'
      }
    });
    
    console.log('✅ Worker构建成功');
  } catch (error) {
    console.error('❌ Worker构建失败:', error);
    process.exit(1);
  }
}

// 如果是直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  buildWorker();
}

export { buildWorker };