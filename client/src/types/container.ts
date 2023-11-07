// SPDX-FileCopyrightText: The PFDL VS Code Extension Contributors
// SPDX-License-Identifier: MIT

/**
 * Helper type to create a container node in the code visualization
 */
export type Container = {
  id: string;
  label: string;
  parentId: string;
  level: number;
  fillColor: string;
};
