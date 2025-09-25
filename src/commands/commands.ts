/* global Office */

Office.onReady(() => {
  console.log('Commands module loaded');
});

/**
 * Shows the task pane.
 * @param event {Office.AddinCommands.Event}
 */
function showTaskpane(event: Office.AddinCommands.Event): void {
  // The showTaskpane command has been defined in the manifest.
  // This function will be called when the command is executed.
  
  console.log('Show taskpane command executed');
  
  // Complete the add-in command
  event.completed();
}

// Register the function with Office
(Office as any).actions = {
  showTaskpane: showTaskpane
};