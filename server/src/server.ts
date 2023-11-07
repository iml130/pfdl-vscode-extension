// SPDX-FileCopyrightText: The PFDL VS Code Extension Contributors
// SPDX-License-Identifier: MIT

// Inspired by the lsp-example at https://github.com/microsoft/vscode-extension-samples/tree/dbee9a0daf8f25c4eff7d4cdc65b70a3c01bd25c/lsp-sample

// standard libraries
import path = require('path');

// 3rd party packages
import {
  createConnection,
  TextDocuments,
  Diagnostic,
  DiagnosticSeverity,
  ProposedFeatures,
  CompletionItem,
  TextDocumentPositionParams,
  TextDocumentSyncKind,
  InitializeResult
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Options, PythonShell } from 'python-shell';

// local sources
import { CodeCompletion } from './code_completion';
import { pfdlFileErrorIndices } from './utils/pfdl_file_error_indices';

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

// register PFDL code completion
const codeCompletion = new CodeCompletion(documents);
const executeCheck = false;

// The time that must elapse to start the language check
const elapsedTimeForCheck = 500;

let checkTimeout = setTimeout(function (change) {
  if (executeCheck) {
    validateTextDocument(change.document);
  }
}, elapsedTimeForCheck);

connection.onInitialize(() => {
  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      // Tell the client that this server supports code completion.
      completionProvider: {
        resolveProvider: true
      }
    }
  };
  return result;
});

// Dummy settings for now
interface PFDLSettings {
  maxNumberOfProblems: number;
}
const defaultSettings: PFDLSettings = { maxNumberOfProblems: 100 };
// Cache the settings of all open documents
const documentSettings: Map<string, Thenable<PFDLSettings>> = new Map();

// Only keep settings for open PFDL documents
documents.onDidClose((e) => {
  documentSettings.delete(e.document.uri);
  connection.sendNotification('removeDotfile', e.document.uri);
});

// The content of a text document has changed. This event is emitted
// when the PFDL document is opened or when its content has changed.
documents.onDidChangeContent(async (change) => {
  clearTimeout(checkTimeout);
  checkTimeout = setTimeout(async function () {
    await validateTextDocument(change.document);
  }, elapsedTimeForCheck);
});

/**
 * Run the PFDL Scheduler for a give PFDL program. Send possible error diagnostics to the client
 * @param textDocument the document to be validated
 */
async function validateTextDocument(textDocument: TextDocument): Promise<void> {
  const fileContent = textDocument.getText();
  const filepath = textDocument.uri.toString();
  const fileName = filepath.substring(
    filepath.lastIndexOf('/') + 1, // where the filename starts
    filepath.length - 5 // cut off the file ending (.pfdl)
  );

  const options: Options = {
    mode: 'text',
    pythonOptions: ['-m', 'pfdl_scheduler.extension'], // get print results in real-time
    args: [fileContent, fileName]
  };
  process.chdir(path.resolve(__dirname, '..', '..', 'pfdl'));

  // run the PFDL scheduler to create a dotfile (if the PFDL program is valid)
  await PythonShell.run(
    path.resolve(__dirname, '..', '..', 'pfdl'),
    options,
    function (err, results) {
      if (err) {
        throw 'Error found while running the PFDL Scheduler: ' + err;
      }
      // check for errors and create diagnostics
      const diagnostics = handleErrorsInPFDLFile(results);
      // Notify the client if the dotfile is invalid
      connection.sendNotification('pfdlFileValidation', [results, fileName]);
      // Send the computed diagnostics to VSCode.
      connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
    }
  );
}

/**
 * Takes an array of errors (or null if no errors occured) in a specific format and creates Diagnostics for VSCode with it
 * @param errors the errors that occured while analysing the PFDL program
 * @returns an array of Diagnostics
 */
function handleErrorsInPFDLFile(errors: any) {
  const diagnostics: Diagnostic[] = [];

  let numberOfProblems = 0;
  if (errors != null) {
    // errors in the analysed PFDL program detected
    for (
      let i = 0;
      i < errors.length - (pfdlFileErrorIndices.indicesPerError - 1) && // always 4 indices in errors belong to one error
      numberOfProblems < defaultSettings.maxNumberOfProblems; // more than 100 problems
      i += pfdlFileErrorIndices.indicesPerError // jump to the next error
    ) {
      numberOfProblems++;

      // notify VSCode to display all errors in the 'Problems'-tab
      diagnostics.push({
        severity: DiagnosticSeverity.Error,
        range: {
          start: {
            line:
              parseInt(
                errors[i + pfdlFileErrorIndices.lineIndexAfterErrorMsg]
              ) - 1,
            character: parseInt(
              errors[i + pfdlFileErrorIndices.startColumnIndexAfterErrorMsg]
            )
          },
          end: {
            line:
              parseInt(
                errors[i + pfdlFileErrorIndices.lineIndexAfterErrorMsg]
              ) - 1,
            character:
              parseInt(
                errors[i + pfdlFileErrorIndices.startColumnIndexAfterErrorMsg]
              ) +
              parseInt(
                errors[
                  i + pfdlFileErrorIndices.squiggleLengthIndexAfterErrorMsg
                ]
              )
          }
        },
        message: errors[i],
        source: 'pfdl'
      });
    }
  }
  return diagnostics;
}

/**
 * Installs a handler for the `Completion` request. Provides the initial list of completion items.
 */
connection.onCompletion(
  (_textDocumentParams: TextDocumentPositionParams): CompletionItem[] => {
    return codeCompletion.onCompletion(_textDocumentParams);
  }
);

/**
 * Installs a handler for the `CompletionResolve` request. Resolves additional information for the item selected in the completion list.
 */
connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
  codeCompletion.onCompletionResolve(item);
  return item;
});

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
