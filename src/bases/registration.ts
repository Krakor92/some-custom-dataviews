import MyPlugin from '@/main';
import { requireApiVersion } from 'obsidian';
import { buildMyPluginJukeboxBaseViewFactory } from '@/bases/view-factory';

export async function registerBasesViews(plugin: MyPlugin): Promise<void> {
  if (!plugin.settings.enableBases) return;
  if (!requireApiVersion('1.9.12')) return;

  const attemptRegistration = async (): Promise<boolean> => {
    try {
      // Direct access to Bases plugin
      const basesPlugin: any = (plugin.app.internalPlugins as any).getEnabledPluginById?.('bases');
      if (!basesPlugin?.registrations) {
        console.debug('Bases plugin not available for registration');
        return false;
      }

      if (!basesPlugin.registrations.myPluginJukeboxView) {
        basesPlugin.registrations.myPluginJukeboxView = {
          name: 'Jukebox',
          icon: 'disc-3',
          factory: buildMyPluginJukeboxBaseViewFactory(plugin)
        };
        console.debug('Successfully registered jukebox view');
      }


      // Refresh existing Bases views
      plugin.app.workspace.iterateAllLeaves((leaf) => {
        if (leaf.view?.getViewType?.() === 'bases') {
          const view = leaf.view as any;
          if (typeof view.refresh === 'function') {
            try {
              view.refresh();
            } catch (refreshError) {
              console.debug('Error refreshing view:', refreshError);
            }
          }
        }
      });

      return true;
    } catch (error) {
      console.warn('Registration attempt failed:', error);
      return false;
    }
  };

  // Try immediate registration
  if (await attemptRegistration()) {
    console.debug('Successfully registered views');
    return;
  }

  // If that fails, try a few more times with short delays
  for (let i = 0; i < 5; i++) {
    await new Promise(r => setTimeout(r, 200));
    if (await attemptRegistration()) {
      console.debug('Successfully registered views on retry');
      return;
    }
  }

  console.warn('Failed to register views after multiple attempts');
}

export function unregisterBasesViews(plugin: MyPlugin): void {
  try {
    // Direct access to Bases plugin
    const basesPlugin: any = (plugin.app.internalPlugins as any).getEnabledPluginById?.('bases');
    if (!basesPlugin?.registrations) {
      console.debug('Bases plugin not available for unregistration');
      return;
    }

    // Unregister views directly
    if (basesPlugin.registrations.myPluginJukeboxView) {
      delete basesPlugin.registrations.myPluginJukeboxView;
      console.debug('Successfully unregistered jukebox view');
    }
  } catch (error) {
    console.error('Error during view unregistration:', error);
  }
}
