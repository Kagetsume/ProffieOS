/**
 * Route catalog — sidebar order and tool routes.
 */
import { describe, expect, it } from 'vitest';
import { ROUTE_CATALOG, toolRoutes } from './route-config';

describe('route-config', () => {
  it('lists Import before Export in the tools group', () => {
    const tools = toolRoutes();
    expect(tools.map((route) => route.id)).toEqual(['import', 'export']);
  });

  it('registers an import route in the catalog', () => {
    const ids = ROUTE_CATALOG.map((route) => route.id);
    expect(ids).toContain('import');
    const importIndex = ids.indexOf('import');
    const exportIndex = ids.indexOf('export');
    expect(importIndex).toBeGreaterThan(-1);
    expect(exportIndex).toBeGreaterThan(importIndex);
  });
});
