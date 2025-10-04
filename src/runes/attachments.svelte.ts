import { Keymap, Menu, type App, type TFile } from 'obsidian';
import type { Attachment } from 'svelte/attachments';

export const printElementAttachment: Attachment = (element) => {
  console.log(element.nodeName); // 'DIV'

  return () => {
    console.log('cleaning up');
  };
};


export const obsdidianFileBehaviorAttachmentFactory =
  ({ app, file }: { app: App, file?: TFile }): Attachment<HTMLElement> => {
    return (node) => {
      console.log(node);

      if (!file) {
        // We don't to associate behavior if there is no file
        return;
      }

      const handleClick = (evt: PointerEvent) => {
        if (evt.defaultPrevented) return;

        // Don't block external links
        const target = evt.target as Element;
        if (target?.closest && target.closest('a.external-link')) return;


        void app.workspace.openLinkText(file.path, '', Keymap.isModEvent(evt));
      }

      const handleContextMenuClick = (evt: PointerEvent) => {
        const menu = Menu.forEvent(evt);

        app.workspace.handleLinkContextMenu(menu, file.path, '');

        // menu.addItem(item => item
        //   .setSection('action')
        //   .setTitle('Copy coordinates')
        //   .setIcon('lucide-map-pin')
        //   .onClick(() => {
        //     const coordString = `${lat}, ${lng}`;
        //     void navigator.clipboard.writeText(coordString);
        //   }));

        menu.addItem(item => item
          .setSection('danger')
          .setTitle('Delete file')
          .setIcon('lucide-trash-2')
          .setWarning(true)
          .onClick(() => app.fileManager.promptForDeletion(file)));
      }

      const handleMouseOver = (evt: MouseEvent) => {
        app.workspace.trigger('hover-link', {
          event: evt,
          source: 'bases',
          hoverParent: app.renderContext,
          targetEl: node,
          linktext: file.path,
        });
      }

      // Handle click events - similar to cards view
      node.addEventListener('click', handleClick);
      node.addEventListener('contextmenu', handleContextMenuClick);
      // Handle hover for link preview - similar to cards view
      node.addEventListener('mouseover', handleMouseOver);
      return () => {
        node.removeEventListener('click', handleClick);
        node.removeEventListener('contextmenu', handleContextMenuClick);
        node.removeEventListener('mouseover', handleMouseOver);
        console.log('(not) cleaning obsdidianFileBehaviorAttachment');
      }
    }
  }
