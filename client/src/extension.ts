// SPDX-FileCopyrightText: The PFDL VS Code Extension Contributors
// SPDX-License-Identifier: MIT

// Inspired by the lsp-example at https://github.com/microsoft/vscode-extension-samples/tree/dbee9a0daf8f25c4eff7d4cdc65b70a3c01bd25c/lsp-sample
// and the webview example at https://github.com/microsoft/vscode-extension-samples/tree/2f83557a56c37a5e48943ea0201e1729708690b6/webview-sample

// 3rd party packages
import * as path from 'path';
import { workspace, ExtensionContext, TextDocument } from 'vscode';
import * as vscode from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind
} from 'vscode-languageclient/node';

export function activate(context: ExtensionContext) {
  // Track currently webview panel
  let currentPanel: vscode.WebviewPanel | undefined = undefined;
  const invalidFileMap = new Map(); // contains filenames of PFDL programs that are invalid
  let fileToShow = ''; // filename of dotfile that has to be processed next

  // 3rd party package
  const fs = require('fs');

  // the filepath where the dotfile is saved. Create if not already exists
  const mediaPath = path.join(__dirname, '..', '..', 'media');
  if (!fs.existsSync(mediaPath)) {
    fs.mkdir(mediaPath, (err) => {
      throw err;
    });
  }

  // The server is implemented in node
  const serverModule = context.asAbsolutePath(
    path.join('server', 'out', 'server.js')
  );
  // The debug options for the server
  // --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging
  const debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };

  // If the extension is launched in debug mode then the debug server options are used
  // Otherwise the run options are used
  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: debugOptions
    }
  };

  // Options to control the language client
  const clientOptions: LanguageClientOptions = {
    // Register the server for pfdl documents
    documentSelector: [
      { scheme: 'file', language: 'production_flow_description_language' }
    ],
    synchronize: {
      // Notify the server about file changes to '.clientrc files contained in the workspace
      fileEvents: workspace.createFileSystemWatcher('**/.clientrc')
    }
  };

  // reload the code visualization when the PFDL program was saved
  workspace.onDidSaveTextDocument((document: TextDocument) => {
    if (
      document.languageId === 'production_flow_description_language' &&
      document.uri.scheme === 'file'
    ) {
      loadCodeVisualization();
    }
  });

  // set actions when custom buttons in vscode are pressed
  context.subscriptions.push(
    // visualize the PFDL program in the current editor when the "Visualize Code" button is pressed
    vscode.commands.registerCommand('webview.show', () => {
      const columnToShowIn = vscode.window.activeTextEditor
        ? vscode.ViewColumn.Beside
        : undefined;

      if (currentPanel) {
        // If we already have a panel, show it in the target column
        currentPanel.reveal(columnToShowIn);
      } else {
        // Otherwise, create a new panel
        currentPanel = vscode.window.createWebviewPanel(
          'Code Visualization',
          'Code Visualization',
          columnToShowIn,
          {
            // Only allow the webview to access resources in our extension's media and client directory
            localResourceRoots: [
              vscode.Uri.file(path.join(context.extensionPath, 'media')), // the dotfile is saved here
              vscode.Uri.file(path.join(context.extensionPath, 'client')) // the necessary code to visualize the PFDL program
            ],
            // Enable scripts in the webview
            enableScripts: true
          }
        );

        // Reset when the current panel is closed
        currentPanel.onDidDispose(
          () => {
            currentPanel = undefined;
          },
          null,
          context.subscriptions
        );
      }
      // create the code visualization
      loadCodeVisualization();
    }),
    // download the current code visualization (if exists) when the "Download PNG" button is pressed
    vscode.commands.registerCommand('webview.downloadPng', () => {
      if (!currentPanel) {
        return;
      }
      currentPanel.webview.postMessage({ command: 'downloadPng' });
    })
  );

  // Create the language client and start the client.
  const client: LanguageClient = new LanguageClient(
    'PFDLLanguageServer',
    'PFDL Language Server',
    serverOptions,
    clientOptions
  );
  client.onReady().then(() => {
    // react on a notification from the language server that a PFDL program has been validated
    client.onNotification('pfdlFileValidation', (errorsAndFilename) => {
      const [errors, filename] = errorsAndFilename; // errors is null if the PFDL program is valid
      reactOnPFDLFileValidation(errors, filename);
    });

    // Recieve notifications from the server when closing a PFDL program
    client.onNotification('removeDotfile', (fileUri: vscode.Uri) => {
      reactONDeletePFDLFile(fileUri);
    });
  });

  /**
   * Update the information about a .pfdl file when it is updated, depending on wether the file is valid or not
   * @param errors an array of error information or null, if no errors where found
   * @param filename the filename of the corresponding dotfile
   */
  function reactOnPFDLFileValidation(errors, filename) {
    const errorsPerIndice = [];
    if (errors != null) {
      // extract the error information to display them in a canvas
      for (let i = 0; i < errors.length; i += 4) {
        // replace symbols html will not display correctly
        errors[i] = errors[i].replace('<', '&lt;');
        errors[i] = errors[i].replace('>', '&gt;');
        errorsPerIndice.push(errors.slice(i, i + 4)); // exactly 4 indices belong to one error
      }
      invalidFileMap.set(filename, errorsPerIndice);

      const dotFilePath = path.join(
        context.extensionPath,
        'media',
        filename + '.dot'
      );
      if (fs.existsSync(dotFilePath)) {
        // the PFDL program was valid before, remove the outdated dotfile
        fs.unlink(dotFilePath, (err) => {
          if (err) {
            return console.log(err);
          }
        });
      }
    } else if (invalidFileMap.has(filename)) {
      // file was invalid before
      invalidFileMap.delete(filename);
    }
    // check if code visualization used to be loaded
    if (filename == fileToShow) {
      try {
        loadCodeVisualization();
      } catch (err) {
        // an error should occure if the dotfile is invalid. Otherwise, something went wrong
        if (!invalidFileMap.has(filename)) {
          console.log(err);
        }
      }
    }
    fileToShow = '';
  }

  /**
   * Remove the dotfile with the corresponding URI
   * @param fileUri the dotfile-URI to remove
   */
  function reactONDeletePFDLFile(fileUri: vscode.Uri) {
    const [filename, filePath] = getDotFilenameAndPathFromPfdlFilepath(
      fileUri.toString()
    );
    if (!invalidFileMap.has(filename)) {
      // if the file was invalid, nothing has been saved, otherwise remove the corresponding dofile
      fs.unlink(filePath, function (err) {
        if (err) {
          return console.log(err);
        }
      });
    }
  }

  /**
   * Draws a graph for the current PFDL program and displays it in the vscode panel.
   * If the PFDL program is invalid, it displays the found errors instead.
   */
  const loadCodeVisualization = () => {
    // Only load the image if there is an active panel
    if (!currentPanel) {
      return;
    }

    let dotfileName, dotfilePath;

    try {
      // get the name and path of the dotfile
      [dotfileName, dotfilePath] = getDotFilenameAndPathFromPfdlFilepath(
        vscode.window.activeTextEditor.document.fileName
      );
    } catch (err) {
      // there is no active editor, probably because the document is currently loading
      console.log(
        'VSCode is not finished with reading the document. Please try again.'
      );
    }

    try {
      // read the dotfile and use this information to set up the code visualization
      const dotfileContent = fs.readFileSync(dotfilePath, 'utf8');
      if (dotfileContent.search('call_tree') == -1) {
        // only a part of the dotfile has been created yet, read full file on notification
        fileToShow = dotfileName;
        return;
      }
      // show the visualization
      showCodeVisualization(dotfileContent);
    } catch (err) {
      // there is no dotfile that was produced by the PFDL scheduler
      handleDotfileNotFound(dotfileName);
    }
  };

  /**
   * Extracts the .pfdl filename and the corresponding .dot filepath from a given filepath
   * @param filepath the .pfdl filepath
   * @returns AN array containing the filename (without ending) and the complete filepath to the dotfile
   */
  function getDotFilenameAndPathFromPfdlFilepath(filepath: string) {
    // for Linux / MacOS
    let pathDivider = '/';
    if (!filepath.includes('/')) {
      // for Windows operating systems
      pathDivider = '\\';
    }
    const filename = filepath.substring(
      filepath.lastIndexOf(pathDivider) + 1, // where the filename starts
      filepath.length - 5 // cut off the file ending (.pfdl)
    );
    return [filename, path.join(mediaPath, filename + '.dot')];
  }

  /**
   * Display the code visualization of a dotfile in the webview
   * @param dotfileContent the dotfile as a string
   */
  function showCodeVisualization(dotfileContent) {
    // get the URIs for the relevant files
    const [scriptPath, canvasPath, stylePath] =
      getPathURIsForCodeVisualization();
    currentPanel.webview.html = getWebviewContent(null, null, null, ''); // reset;
    // display the code visualization in the webview
    currentPanel.webview.html = getWebviewContent(
      scriptPath,
      canvasPath,
      stylePath,
      dotfileContent
    );
  }

  /**
   * get the style.css path for the code visualization as URI
   * @returns the URI of the style.css file
   */
  function getStylePathURI() {
    const stylePath = currentPanel.webview.asWebviewUri(
      vscode.Uri.file(
        path.join(
          context.extensionPath,
          'client',
          'src',
          'code_visualization',
          'style.css'
        )
      )
    );
    return stylePath;
  }

  /**
   * get all relevat files for the code visualization as URI
   * @returns the URIs of the style.css file, the script for code visualization and for canvas containing the graph legend
   */
  function getPathURIsForCodeVisualization() {
    const stylePath = getStylePathURI();

    // the scripts for the code visu
    const scriptOnDiskPath = vscode.Uri.file(
      path.join(context.extensionPath, 'client', 'bundle.js')
    );
    // the path to the code visu script as URI
    const scriptPath = currentPanel.webview.asWebviewUri(scriptOnDiskPath);

    // the legend canvas script for the code visu
    const canvasOnDiskPath = vscode.Uri.file(
      path.join(
        context.extensionPath,
        'client',
        'out',
        'canvas',
        'draw_legend.js'
      )
    );
    // the path to the legend canvas script as URI
    const canvasPath = currentPanel.webview.asWebviewUri(canvasOnDiskPath);

    return [scriptPath, canvasPath, stylePath];
  }

  /**
   * Handle the case that a PFDL program should be visualized but the dotfile does not exist
   * @param dotfileName the expected name of the dotfile
   */
  function handleDotfileNotFound(dotfileName: string) {
    if (invalidFileMap.has(dotfileName)) {
      // PFDL program is invalid, so no dotfile has been generated. Display error messages instead
      let errorMessagesString = '';
      for (const error of invalidFileMap.get(dotfileName)) {
        errorMessagesString += `On line ${error[1]}:${error[2]} --> ${error[0]}.\n`;
      }

      const [canvasPath, stylePath] = getPathURIsForErrorMessages();
      // display the error messages
      currentPanel.webview.html = getWebviewContentForErrors(
        canvasPath,
        stylePath,
        errorMessagesString
      );
      return;
    }
    // file has not been loaded yet, read it on notification
    fileToShow = dotfileName;
    return;
  }

  /**
   * get all relevat files for displaying error messages as URI
   * @returns the URIs of the style.css file and for canvas containing the error messages
   */
  function getPathURIsForErrorMessages() {
    const stylePath = getStylePathURI();

    // the canvas script to display error messages
    const canvasOnDiskPath = vscode.Uri.file(
      path.join(
        context.extensionPath,
        'client',
        'out',
        'canvas',
        'draw_error_messages.js'
      )
    );
    // the path to the error canvas script as URI
    const canvasPath = currentPanel.webview.asWebviewUri(canvasOnDiskPath);

    return [canvasPath, stylePath];
  }

  // Start the client. This will also launch the server
  client.start();
}

/**
 * Get a HTML page containing a canvas to display error messages for a PFDL program
 * @param canvasScriptPath the path to the error canvas script
 * @param stylePath the css file for the code visualization
 * @param errorMessagesString a string that contains the error messages to be displayed
 * @returns a HTML page as a string that contains the error canvas and messages
 */
function getWebviewContentForErrors(
  canvasScriptPath: vscode.Uri,
  stylePath: vscode.Uri,
  errorMessagesString: string
) {
  return `<!DOCTYPE html>
	<html lang="en">
		<head>
			<meta charset="utf-8" />
			<link rel="stylesheet" type="text/css" href="${stylePath}">
		</head>
		<body>
			<div id="errorCanvasParent">
				<canvas id="errorCanvas"></canvas>
			</div>
			<div id="errorMessagesDiv" style="display:none">${errorMessagesString}</div>
			<script type="module" id="canvas-creation" src=${canvasScriptPath}></script>
		</body>
	</html>
	`;
}

/**
 * Generates a HTML page containing the code visualization for a PFDL program and a legend canvas
 * @param scriptPath the path to the script that visualizes a given PFDL program
 * @param canvasScriptPath the path to the legend canvas script
 * @param stylePath the css file for the code visualization
 * @param dotfileString the .dot file of the corresponding PFDL program as a string
 * @returns a HTML page as a string that contains the code visualization of the passed dotfile and a legend canvas
 */
function getWebviewContent(
  scriptPath: vscode.Uri,
  canvasScriptPath: vscode.Uri,
  stylePath: vscode.Uri,
  dotfileString: string
) {
  return `<!DOCTYPE html>
	<html lang="en">
		<head>
			<meta charset="utf-8" />
			<link rel="stylesheet" type="text/css" href="${stylePath}">
		</head>
		<body>
			<canvas id="myCanvas"></canvas> 
			<div id="graphElementsDiv" style="display:none">${dotfileString}</div>
			<script type="module" id="graph-creation" src=${scriptPath}></script>
			<script type="module" id="canvas-creation" src=${canvasScriptPath}></script> 
			<div id="cy"></div>
		</body>
	</html>
	`;
}
