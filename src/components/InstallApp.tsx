/* Settings: put Grove on the home screen, so it opens like an app and works without a connection. */
import { Download } from 'lucide-react';
import { install, isIos, usePwa } from '../services/pwa';
import { labelCls, quietBtn } from './ui';

export function InstallApp() {
  const pwa = usePwa();
  return (
    <section className="space-y-2 border-t border-line pt-4" aria-label="Install Grove">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className={labelCls}>Grove on your phone</p>
          <p className="text-sm text-muted">
            {pwa.installed
              ? 'Installed. Grove opens from your home screen and keeps working without a connection.'
              : pwa.canInstall
                ? 'Install Grove to open it from your home screen, like an app. Your notes then work offline too.'
                : isIos()
                  ? 'In Safari, tap Share, then "Add to Home Screen". Grove then opens like an app and works offline.'
                  : 'In your browser menu, choose "Install app" or "Add to Home screen". Grove then opens like an app and works offline.'}
          </p>
        </div>
        {pwa.canInstall && !pwa.installed && (
          <button type="button" onClick={() => void install()} className={`${quietBtn} shrink-0`}>
            <Download aria-hidden className="h-4 w-4" /> Install
          </button>
        )}
      </div>
    </section>
  );
}
