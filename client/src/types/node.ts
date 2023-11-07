// SPDX-FileCopyrightText: The PFDL VS Code Extension Contributors
// SPDX-License-Identifier: MIT

/**
 * Determine a fixed order which all single nodes follow
 */
export enum NodeOrder {
  Started = 0,
  ConditionEntry = 1,
  ConditionPassed = 2,
  ConditionFailed = 3,
  Finished = 4,
  Done = 5
}

/**
 * Helper type to create a container node in the code visualization
 */
export type Node = {
  shape: string;
  id: string;
  label: string;
  tokenLabel: string;
  fillColor: string;
  height: number;
  width: number;
  xPosition: number;
  yPosition: number;
  parentId: string;
  isParent: boolean;
  order: NodeOrder;
  numberOfEdges: number;
};
