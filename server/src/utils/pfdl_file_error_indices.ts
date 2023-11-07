// SPDX-FileCopyrightText: The PFDL VS Code Extension Contributors
// SPDX-License-Identifier: MIT

export enum pfdlFileErrorIndices {
  errorMessageIndex = 0,
  lineIndexAfterErrorMsg = 1,
  startColumnIndexAfterErrorMsg = 2,
  squiggleLengthIndexAfterErrorMsg = 3,
  indicesPerError = 4 // number of indices in results that belong to one error (i.e. 4 = error message, line, start column, length)
}
