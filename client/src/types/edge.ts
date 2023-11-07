// SPDX-FileCopyrightText: The PFDL VS Code Extension Contributors
// SPDX-License-Identifier: MIT

/**
 * Helper type to create an edge in the code visualization
 */
export type Edge = {
  fromNodeId: string;
  toNodeId: string;

  // cytoscape-necessary information for curved edges
  controlPointDistances: number[]; // x-distance from endpoint
  controlPointWeights: number[]; // y-distance from startpoint as a fraction (between 0 and 1)
};
