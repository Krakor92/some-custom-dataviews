import MyPlugin from '@/main';
import { buildTasknotesBaseViewFactory } from './base-view-factory';

export function buildTasknotesTaskListViewFactory(plugin: MyPlugin) {
  return buildTasknotesBaseViewFactory(plugin, {
    errorPrefix: 'Task List'
  });
}
