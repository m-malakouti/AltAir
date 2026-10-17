// @vitest-environment node
import { build } from 'vite';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
describe('production datepicker bundle', () => {
  it('renders the same browser build used by the extension', async () => {
    const componentPath = fileURLToPath(
      new URL('../../components/ui/PersianDatePicker.tsx', import.meta.url),
    ).replaceAll('\\', '/');
    const output = await build({
      oxc: { jsx: { development: false } },
      configFile: false,
      logLevel: 'silent',
      define: { 'process.env.NODE_ENV': JSON.stringify('production') },
      plugins: [
        {
          name: 'picker-fixture',
          resolveId(id) {
            if (id.endsWith('virtual:picker')) return '\0picker';
          },
          load(id) {
            if (id === '\0picker')
              return `import React from 'react'; import {createRoot} from 'react-dom/client'; import {PersianDatePicker} from '${componentPath}'; createRoot(document.getElementById('root')).render(React.createElement(PersianDatePicker,{id:'birth',value:'2000-02-29',onChange:()=>{}}));`;
          },
        },
      ],
      build: {
        write: false,
        lib: { entry: 'virtual:picker', name: 'PickerTest', formats: ['iife'] },
      },
    });
    const result = Array.isArray(output) ? output[0] : output;
    if (!result || !('output' in result)) throw new Error('missing bundle');
    const chunk = result.output.find((item) => item.type === 'chunk');
    if (!chunk || chunk.type !== 'chunk') throw new Error('missing chunk');
    const dom = new JSDOM('<div id="root"></div>', {
      runScripts: 'outside-only',
      url: 'http://localhost/',
    });
    const errors: string[] = [];
    dom.window.addEventListener('error', (event) => errors.push(event.message));
    dom.window.eval(chunk.code);
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(errors).toEqual([]);
    expect(dom.window.document.querySelector('input')).not.toBeNull();
    dom.window.document.querySelector('input')!.focus();
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(dom.window.document.querySelector('.rmdp-calendar')).not.toBeNull();
    expect(dom.window.document.querySelector('[role="alert"]')?.textContent).toBeUndefined();
    dom.window.close();
  }, 20000);
});
