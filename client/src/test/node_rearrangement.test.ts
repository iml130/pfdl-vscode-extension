// SPDX-FileCopyrightText: The PFDL VS Code Extension Contributors
// SPDX-License-Identifier: MIT

// local sources
import {
  applyContainerShift,
  handleContainerOverlapping
} from '../code_visualization/node_rearrangement';
import { setupCytoscapeInstance } from '../code_visualization/setup_cytoscape';

const getTestElements = () => {
  const container1 = {
    group: 'nodes',
    data: {
      id: 'container_1',
      label: 'Container1',
      tippyContent: 'Container1',
      parent: null,
      level: 1,
      yShift: 10
    },
    classes: ['container'],
    position: {} // defined by the child nodes
  };
  const container2 = {
    group: 'nodes',
    data: {
      id: 'container_2',
      label: 'Container2',
      tippyContent: 'Container2',
      parent: null,
      level: 1,
      yShift: 0
    },
    classes: ['container'],
    position: {} // defined by the child nodes
  };
  const node1 = {
    group: 'nodes',
    data: {
      id: 'node_1',
      label: '',
      tippyContent: 'Node1',
      parent: 'container_1'
    },
    classes: ['single_node', 'upper_round_node'],
    position: { x: 0, y: 0 }
  };
  const node2 = {
    group: 'nodes',
    data: {
      id: 'node_2',
      label: '',
      tippyContent: 'Node1',
      parent: 'container_2'
    },
    classes: ['single_node', 'upper_round_node'],
    position: { x: 0, y: 0 }
  };

  return [container1, container2, node1, node2];
};

const cy = setupCytoscapeInstance(undefined);

describe('handleContainerOverlapping', () => {
  beforeEach(() => {
    cy.add(getTestElements());
  });
  afterEach(() => {
    cy.remove(cy.elements());
  });

  it("should not move Containers that don't overlap", () => {
    const containers = cy.nodes('.container');
    const nodes = cy.nodes('.single_node');
    let cyNode1, cyNode2;
    for (const node of nodes) {
      if (node.data('id') == 'node_1') {
        cyNode1 = node;
      } else if (node.data('id') == 'node_2') {
        cyNode2 = node;
      }
    }

    containers[1].shift('x', 100);
    containers[1].shift('y', 100);

    expect(cyNode1.position()).toEqual({ x: 0, y: 0 });
    expect(cyNode2.position()).toEqual({ x: 100, y: 100 });

    handleContainerOverlapping(containers, false);
    expect(cyNode1.position()).toEqual({ x: 0, y: 0 });
    expect(cyNode2.position()).toEqual({ x: 100, y: 100 });
  });

  it('should move Containers that do overlap', () => {
    const containers = cy.nodes('.container');
    containers[0].shift('x', 1);
    handleContainerOverlapping(containers, false);

    const nodes = cy.nodes('.single_node');
    let cyNode1, cyNode2;
    for (const node of nodes) {
      if (node.data('id') == 'node_1') {
        cyNode1 = node;
      } else if (node.data('id') == 'node_2') {
        cyNode2 = node;
      }
    }

    expect(cyNode1.position().x).toBeGreaterThan(0);
    expect(cyNode1.position().y).toEqual(0);

    expect(cyNode2.position().x).toBeLessThan(0);
    expect(cyNode2.position().y).toEqual(0);
  });

  it("should not move rotated Containers that don't overlap", () => {
    const containers = cy.nodes('.container');
    const nodes = cy.nodes('.single_node');
    let cyNode1, cyNode2;
    for (const node of nodes) {
      if (node.data('id') == 'node_1') {
        cyNode1 = node;
      } else if (node.data('id') == 'node_2') {
        cyNode2 = node;
      }
    }

    containers[1].shift('x', 100);
    containers[1].shift('y', 100);

    expect(cyNode1.position()).toEqual({ x: 0, y: 0 });
    expect(cyNode2.position()).toEqual({ x: 100, y: 100 });

    handleContainerOverlapping(containers, true);
    expect(cyNode1.position()).toEqual({ x: 0, y: 0 });
    expect(cyNode2.position()).toEqual({ x: 100, y: 100 });
  });

  it('should move rotated Containers that do overlap', () => {
    const containers = cy.nodes('.container');
    containers[0].shift('y', 1);
    handleContainerOverlapping(containers, true);

    const nodes = cy.nodes('.single_node');
    let cyNode1, cyNode2;
    for (const node of nodes) {
      if (node.data('id') == 'node_1') {
        cyNode1 = node;
      } else if (node.data('id') == 'node_2') {
        cyNode2 = node;
      }
    }

    expect(cyNode1.position().y).toBeGreaterThan(0);
    expect(cyNode1.position().x).toEqual(0);

    expect(cyNode2.position().y).toBeLessThan(0);
    expect(cyNode2.position().x).toEqual(0);
  });
});

describe('applyContainerShift', () => {
  beforeEach(() => {
    cy.add(getTestElements());
  });
  afterEach(() => {
    cy.remove(cy.elements());
  });
  it('should shift the containers correctly', () => {
    const containers = cy.nodes('.container');
    let cyContainer1, cyContainer2;
    for (const container of containers) {
      if (container.data('id') == 'container_1') {
        cyContainer1 = container;
      } else if (container.data('id') == 'container_2') {
        cyContainer2 = container;
      }
    }
    applyContainerShift(cyContainer1, 'y', false);
    expect(cyContainer1.position().y).toEqual(-10);
    expect(cyContainer1.position().x).toEqual(0);

    applyContainerShift(cyContainer1, 'x', false);
    expect(cyContainer1.position().y).toEqual(-10);
    expect(cyContainer1.position().x).toEqual(-10);

    applyContainerShift(cyContainer2, 'y', false);
    expect(cyContainer2.position().x).toEqual(0);
    expect(cyContainer2.position().y).toEqual(0);

    applyContainerShift(cyContainer2, 'x', false);
    expect(cyContainer2.position().x).toEqual(0);
    expect(cyContainer2.position().y).toEqual(0);
  });

  it('should shift the containers correctly if the graph is rotated afterwards', () => {
    const containers = cy.nodes('.container');
    let cyContainer1, cyContainer2;
    for (const container of containers) {
      if (container.data('id') == 'container_1') {
        cyContainer1 = container;
      } else if (container.data('id') == 'container_2') {
        cyContainer2 = container;
      }
    }
    applyContainerShift(cyContainer1, 'y', true);
    expect(cyContainer1.position().y).toEqual(10);
    expect(cyContainer1.position().x).toEqual(0);

    applyContainerShift(cyContainer1, 'x', true);
    expect(cyContainer1.position().y).toEqual(10);
    expect(cyContainer1.position().x).toEqual(10);

    applyContainerShift(cyContainer2, 'y', true);
    expect(cyContainer2.position().x).toEqual(0);
    expect(cyContainer2.position().y).toEqual(0);

    applyContainerShift(cyContainer2, 'x', true);
    expect(cyContainer2.position().x).toEqual(0);
    expect(cyContainer2.position().y).toEqual(0);
  });
});
