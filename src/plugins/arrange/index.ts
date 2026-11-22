import { definePlugin, type EditorPlugin } from '@/core';
import { registerDuplicateCommands } from '@/plugins/arrange/duplicate';
import { registerGroupCommands } from '@/plugins/arrange/group';
import { registerSelectionCommands } from '@/plugins/arrange/selection';
import { registerZOrderCommands } from '@/plugins/arrange/z-order';

declare module '@/core/commands/types' {
  interface CommandRegistryMap {
    // eslint-disable-next-line @typescript-eslint/no-invalid-void-type -- void marks commands without args
    'selection.selectAll': { args: void; result: string[] };
    // eslint-disable-next-line @typescript-eslint/no-invalid-void-type -- void marks commands without args
    'selection.clear': { args: void; result: null };
    // eslint-disable-next-line @typescript-eslint/no-invalid-void-type -- void marks commands without args
    'selection.delete': { args: void; result: string[] };
    // eslint-disable-next-line @typescript-eslint/no-invalid-void-type -- void marks commands without args
    'selection.duplicate': { args: void; result: string[] };
    // eslint-disable-next-line @typescript-eslint/no-invalid-void-type -- void marks commands without args
    'selection.group': { args: void; result: string };
    // eslint-disable-next-line @typescript-eslint/no-invalid-void-type -- void marks commands without args
    'selection.ungroup': { args: void; result: string[] };
    'object.nudge': { args: { dx: number; dy: number }; result: null };
    // eslint-disable-next-line @typescript-eslint/no-invalid-void-type -- void marks commands without args
    'arrange.bringForward': { args: void; result: null };
    // eslint-disable-next-line @typescript-eslint/no-invalid-void-type -- void marks commands without args
    'arrange.sendBackward': { args: void; result: null };
    // eslint-disable-next-line @typescript-eslint/no-invalid-void-type -- void marks commands without args
    'arrange.bringToFront': { args: void; result: null };
    // eslint-disable-next-line @typescript-eslint/no-invalid-void-type -- void marks commands without args
    'arrange.sendToBack': { args: void; result: null };
  }
}

/** Selection, delete, duplicate, group/ungroup, z-order and nudge for user objects. */
export function createArrangePlugin(): EditorPlugin {
  return definePlugin({
    name: 'arrange',
    setup(editor) {
      const unregisters = [
        ...registerSelectionCommands(editor),
        ...registerDuplicateCommands(editor),
        ...registerGroupCommands(editor),
        ...registerZOrderCommands(editor),
      ];
      return () => {
        for (const unregister of unregisters) unregister();
      };
    },
  });
}
