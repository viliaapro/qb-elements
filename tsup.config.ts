import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/qb-elements.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
})
