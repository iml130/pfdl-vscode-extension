// SPDX-FileCopyrightText: The PFDL VS Code Extension Contributors
// SPDX-License-Identifier: MIT

// 3rd party packages
import {
  TextDocumentPositionParams,
  Position,
  TextDocuments,
  CompletionItem,
  CompletionItemKind,
  InsertTextFormat,
  TextEdit,
  Range
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

/**
 * Responsible for PFDL code completion
 */
export class CodeCompletion {
  private documents: TextDocuments<TextDocument> = new TextDocuments(
    TextDocument
  );
  private matchingPrefixCompletionItems: Array<{
    precedingLines: number;
    prefixPattern: RegExp;
    completionItems: CompletionItem[];
  }> = [];

  constructor(documents: TextDocuments<TextDocument>) {
    this.documents = documents;
  }

  // define valid completion items for the extension to suggest
  onCompletion(_textDocumentParams: TextDocumentPositionParams) {
    const position: Position = _textDocumentParams.position;
    const text: TextDocument | undefined = this.documents.get(
      _textDocumentParams.textDocument.uri
    );

    // Check if specific completion items for the current situation are available and return them
    // TODO: can this ever happen?
    if (text != undefined) {
      const completionItems: CompletionItem[] | undefined =
        this.checkForCompletionItems(text, position);
      if (completionItems != undefined) {
        return completionItems;
      }
    }

    // else return the standard completion items
    return [
      {
        label: 'Struct',
        kind: CompletionItemKind.Class,
        insertTextFormat: InsertTextFormat.Snippet,
        textEdit: TextEdit.insert(
          Position.create(position.line, position.character - 1),
          'Struct ${1:name}\n\t\nEnd'
        ),
        sortText: 'task1',
        data: 1
      },
      {
        label: 'Task',
        kind: CompletionItemKind.Class,
        insertTextFormat: InsertTextFormat.Snippet,
        textEdit: TextEdit.insert(
          Position.create(position.line, position.character - 1),
          'Task ${1:name}\n\t\nEnd'
        ),
        sortText: 'task1',
        data: 2
      },
      {
        label: 'End',
        kind: CompletionItemKind.Class,
        data: 3
      },
      {
        label: 'In',
        kind: CompletionItemKind.Class,
        data: 4
      },
      {
        label: 'Out',
        kind: CompletionItemKind.Class,
        data: 5
      },
      {
        label: 'Loop',
        kind: CompletionItemKind.Class,
        data: 6
      },
      {
        label: 'Loop ',
        kind: CompletionItemKind.Class,
        insertTextFormat: InsertTextFormat.Snippet,
        textEdit: TextEdit.insert(
          Position.create(position.line, position.character - 1),
          'Loop i To'
        ),
        sortText: 'task1',
        data: 7
      },
      {
        label: 'Loop While',
        kind: CompletionItemKind.Class,
        insertTextFormat: InsertTextFormat.Snippet,
        textEdit: TextEdit.insert(
          Position.create(position.line, position.character - 1),
          'Loop While'
        ),
        sortText: 'task1',
        data: 7
      },
      {
        label: 'To',
        kind: CompletionItemKind.Class,
        data: 9
      },
      {
        label: 'OnDone',
        kind: CompletionItemKind.Class,
        data: 10
      },
      {
        label: 'Check',
        kind: CompletionItemKind.Class,
        data: 11
      }
    ];
  }

  // define descriptions that are displayed when the code completion is making suggestions
  onCompletionResolve(item: CompletionItem) {
    switch (item.data) {
      case 1: {
        item.detail = 'Creates a Struct';
        item.documentation =
          "A *Struct* acts as a container for data.\n\nSyntax:\nStruct {name}\n\tidentifier:datatype''\nend";
        break;
      }
      case 2: {
        item.detail = 'Creates a Task';
        item.documentation =
          'It describes an order of Services and Task which should be executed sequentially \n\nSyntax:\nTask {name}\n\tService...\nEnd';
        break;
      }
      case 3: {
        item.detail = 'End';
        item.documentation = 'Marks the end of a *Struct/Task* definition.';
        break;
      }
      default: {
        break;
      }
    }
  }

  /**
   * Checks `text` at `currentPosition` if there is a match with one of the patterns of the items out of `matchingPrefixCompletionItems`.
   * Is that the case, this function returns the associated CompletionItems.
   * This function takes the string from the line - `item.precedingLines` beginning to `currentPosition` into account.
   * @function checkForCompletionItems
   * @public
   * @param {TextDocument} text				The text to be used for checking
   * @param {Position} currentPosition		The current cursor position to be used for checking
   * @returns {CompletionItem[] | undefined }	A array containing CompletionItems which prefixPattern matched the current text string
   */
  checkForCompletionItems(
    text: TextDocument,
    currentPosition: Position
  ): CompletionItem[] | undefined {
    for (
      let index = 0;
      index < this.matchingPrefixCompletionItems.length;
      index++
    ) {
      const item: {
        precedingLines: number;
        prefixPattern: RegExp;
        completionItems: CompletionItem[];
      } = this.matchingPrefixCompletionItems[index];
      const firstPosition: Position = Position.create(
        currentPosition.line - item.precedingLines,
        0
      );
      const linePrefix: string = text.getText(
        Range.create(firstPosition, currentPosition)
      );
      if (item.prefixPattern.test(linePrefix)) {
        return item.completionItems;
      }
    }
    return undefined;
  }
}
