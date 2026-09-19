/**
 * Read-only INI preview with clipboard copy and file download.
 *
 * Used on the Export page. Content is supplied via `getContent()` so the panel
 * can refresh when Effector `$export` updates without remounting.
 *
 * @module ui/copy-panel
 */
import '@awesome.me/webawesome/dist/components/button/button.js';
import '@awesome.me/webawesome/dist/components/icon/icon.js';

/** Options for {@link mountCopyPanel}. */
export type CopyPanelOptions = {
  /** Display title (e.g. `blades.ini`). */
  title: string;
  /** Suggested download filename. */
  filename: string;
  /** Returns current INI text (may change when stores update). */
  getContent: () => string;
  /** Optional hook when content is refreshed. */
  onContentChange?: (content: string) => void;
};

/**
 * Render copy/download panel into `root`.
 *
 * @returns `refresh(content)` to update the textarea when export store changes
 */
export function mountCopyPanel(
  root: HTMLElement,
  options: CopyPanelOptions,
): (content: string) => void {
  root.innerHTML = `
    <wa-card>
      <div slot="header" class="copy-panel-header">
        <strong>${options.title}</strong>
        <span class="copy-panel-filename">${options.filename}</span>
      </div>
      <textarea class="copy-panel-text" readonly spellcheck="false"></textarea>
      <div class="copy-panel-actions">
        <wa-button variant="brand" data-action="copy">
          <wa-icon name="copy" label="Copy"></wa-icon>
          Copy
        </wa-button>
        <wa-button variant="neutral" data-action="download">
          <wa-icon name="download" label="Download"></wa-icon>
          Download
        </wa-button>
      </div>
    </wa-card>
  `;

  const textarea = root.querySelector<HTMLTextAreaElement>('.copy-panel-text')!;
  const copyBtn = root.querySelector('[data-action="copy"]')!;
  const downloadBtn = root.querySelector('[data-action="download"]')!;

  const refresh = (content: string) => {
    textarea.value = content;
    options.onContentChange?.(content);
  };

  refresh(options.getContent());

  copyBtn.addEventListener('click', async () => {
    await navigator.clipboard.writeText(textarea.value);
    copyBtn.textContent = 'Copied!';
    setTimeout(() => {
      copyBtn.innerHTML =
        '<wa-icon name="copy" label="Copy"></wa-icon> Copy';
    }, 1500);
  });

  downloadBtn.addEventListener('click', () => {
    const blob = new Blob([textarea.value], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = options.filename;
    a.click();
    URL.revokeObjectURL(url);
  });

  return refresh;
}
