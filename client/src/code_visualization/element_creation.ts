// SPDX-FileCopyrightText: The PFDL VS Code Extension Contributors
// SPDX-License-Identifier: MIT

// local sources
import { Node, NodeOrder } from '../types/node';
import { Edge } from '../types/edge';
import { Container } from '../types/container';
import { Point } from '../types/point';

/**
 * read out the stored HTML data to create nodes, edges and containers to visualize the PFDL program.
 * @returns graph elements as valid JSON strings that are accepted by cytoscape
 */
export function getGraphElements(parsedDotfile = null) {
  // retrieve graph data
  const dotfileContent = document.getElementById('graphElementsDiv').innerText;
  if (dotfileContent == null || dotfileContent.search('graph') == -1) {
    // catch errors (suspected only for dashboard)
    return null;
  }

  const [dotfileString, treeStructure] = splitDotfile(dotfileContent);

  const containers = buildTreeStructure(treeStructure, dotfileString);

  if (parsedDotfile == null) {
    // parse the dotfile here
    // 3rd party package
    const parse = require('dotparser');
    parsedDotfile = parse(dotfileString)[0];
  }

  // convert into utf-8 string
  const [nodes, edges] = parseElementsFromDotFileString(parsedDotfile);
  return getFinalGraphElements(nodes, edges, containers);
}

function splitDotfile(fileContent: string) {
  // necessary for standalone representation
  let dotfileContent = fileContent.replace(/[\n]/g, '');
  dotfileContent = dotfileContent.replace(/[\\]/g, '');

  // split into dotfile and tree structure
  const contentArray = dotfileContent.split('call_tree:');
  const dotfileString = contentArray[0]; // the actual graph data
  const treeStructureString = contentArray[1]; // information about clustering (for the containers)

  const treeStructure = JSON.parse(treeStructureString);
  return [dotfileString, treeStructure];
}

/**
 * Create container nodes for the graph
 * @param treeStructure a JSON string containing the clustering information
 * @param dotfileString a JSON string containing the graph objects
 * @returns a list of Containers that should be drawn by cytoscape
 */
const buildTreeStructure = (
  treeStructure,
  dotfileString,
  standaloneTesting = false
) => {
  // define colors for the different container types
  const [taskColor, serviceColor, conditionColor, loopColor, parallelColor] =
    getContainerColors(standaloneTesting);

  // create the containers
  let containers: Container[] = [];
  containers = loopTree(treeStructure, containers, null, 0, dotfileString);

  // assign the colors
  for (const container of containers) {
    const containerLabel = container.label.toLowerCase();
    if (containerLabel.includes('condition')) {
      container.fillColor = conditionColor;
    } else if (containerLabel.includes('parallel')) {
      container.fillColor = parallelColor;
    } else if (containerLabel.includes('loop')) {
      container.fillColor = loopColor;
    } else {
      // Tasks and Services may not include a keyword, differentiate by the first letter
      const labelStart = container.label[0];
      const labelStartLowercase = containerLabel[0];
      if (labelStart == labelStartLowercase) {
        // lower case -> Task
        container.fillColor = taskColor;
      } else {
        // upper case -> Service
        container.fillColor = serviceColor;
      }
    }
  }
  return containers;
};

const getContainerColors = (standaloneTesting) => {
  if (standaloneTesting) {
    // no access to document
    return ['#000', '#111', '#222', '#333', '#444'];
  }
  const taskColor = getComputedStyle(document.documentElement).getPropertyValue(
    '--task-box-color'
  );
  const serviceColor = getComputedStyle(
    document.documentElement
  ).getPropertyValue('--service-box-color');
  const conditionColor = getComputedStyle(
    document.documentElement
  ).getPropertyValue('--condition-box-color');
  const loopColor = getComputedStyle(document.documentElement).getPropertyValue(
    '--loop-box-color'
  );
  const parallelColor = getComputedStyle(
    document.documentElement
  ).getPropertyValue('--parallel-box-color');

  return [taskColor, serviceColor, conditionColor, loopColor, parallelColor];
};

/**
 * Filter all tree nodes out of the treePart and create a container for each one
 * @param treePart the part to iterate
 * @param containers all currently known containers
 * @param parentId the parent of the passed treePart
 * @param level level of the current node
 * @param dotfileString a JSON string containing the graph objects
 * @returns all containers included in the passed treePart
 */
const loopTree = (
  treePart,
  containers: Container[],
  parentId: string,
  level: number,
  dotfileString: string
) => {
  const node = treePart;
  const nodeContainer: Container = {
    id: node.id,
    label: node.name,
    parentId: parentId,
    level: level,
    fillColor: null
  };
  // check wether the container is used in the dotfile, should be always the case, exceptions possible
  if (node.children.length > 0 || dotfileString.search(node.id) != -1) {
    containers.push(nodeContainer);
    // add the containers children to the graph
    for (const child of node.children) {
      containers = loopTree(
        child,
        containers,
        node.id,
        level + 1,
        dotfileString
      );
    }
  }
  return containers;
};
/**
 * translate the nodes and edges of the dotfile into concrete instances
 * @param fileString a JSON string containing the graph objects
 * @returns an array containing all existing nodes and edges in the dotfile
 */
const parseElementsFromDotFileString = (
  fileString: any,
  standaloneTesting = false
) => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const [
    componentStartedColor,
    componentFinishedColor,
    componentDoneColor,
    statementEntryColor,
    statementPassedColor,
    statementFailedColor
  ] = getElementColors(standaloneTesting);

  for (const child of fileString.children) {
    if (child['type'] == 'subgraph') {
      iterateSubgraph(nodes, edges, child.children);
      break;
    }
  }

  const minimumY = Math.min(...nodes.map((node) => node.yPosition));
  for (const node of nodes) {
    // mirror the graph vertically
    node.yPosition += -1 * minimumY + 50;

    const nodeLabel = node.label.toLowerCase();
    // assign background colors
    if (nodeLabel.includes('started')) {
      node.fillColor = componentStartedColor;
      node.order = NodeOrder.Started;
    } else if (nodeLabel.includes('finished')) {
      node.fillColor = componentFinishedColor;
      node.order = NodeOrder.Finished;
    } else if (nodeLabel.includes('done')) {
      node.fillColor = componentDoneColor;
      node.order = NodeOrder.Done;
    } else if (nodeLabel.includes('passed')) {
      node.fillColor = statementPassedColor;
      node.order = NodeOrder.ConditionPassed;
    } else if (nodeLabel.includes('failed')) {
      node.fillColor = statementFailedColor;
      node.order = NodeOrder.ConditionFailed;
    } else if (
      nodeLabel.includes('if') ||
      nodeLabel.includes('loop') ||
      nodeLabel.includes('start')
    ) {
      node.fillColor = statementEntryColor;
      node.order = NodeOrder.ConditionEntry;
    }
    const correspondingEdges = edges.filter(
      (edge) => edge.fromNodeId == node.id || edge.toNodeId == node.id
    );
    node.numberOfEdges = correspondingEdges.length;
  }

  // height-based + order-based sorting in respect to the number of incoming+outgoing edges
  nodes.sort((nodeA, nodeB) => {
    return (
      nodeA.yPosition +
      nodeA.order -
      0.1 * nodeA.numberOfEdges -
      (nodeB.yPosition + nodeB.order - 0.1 * nodeB.numberOfEdges)
    );
  });

  const nodesAndEdges: [Node[], Edge[]] = [nodes, edges];

  return nodesAndEdges;
};

const getElementColors = (standaloneTesting) => {
  if (standaloneTesting) {
    // no access to document
    return ['#000', '#111', '#222', '#333', '#444', '#555'];
  }

  const componentStartedColor = getComputedStyle(
    document.documentElement
  ).getPropertyValue('--component-started-color');
  const componentFinishedColor = getComputedStyle(
    document.documentElement
  ).getPropertyValue('--component-finished-color');
  const componentDoneColor = getComputedStyle(
    document.documentElement
  ).getPropertyValue('--component-done-color');
  const statementEntryColor = getComputedStyle(
    document.documentElement
  ).getPropertyValue('--statement-entry-color');
  const statementPassedColor = getComputedStyle(
    document.documentElement
  ).getPropertyValue('--statement-passed-color');
  const statementFailedColor = getComputedStyle(
    document.documentElement
  ).getPropertyValue('--statement-failed-color');

  return [
    componentStartedColor,
    componentFinishedColor,
    componentDoneColor,
    statementEntryColor,
    statementPassedColor,
    statementFailedColor
  ];
};

/**
 * Create an instance for each node and each edge that are stored in the subgraph
 * @param nodes all currently known nodes
 * @param edges all currently known edges
 * @param subgraphChildren the nodes as JSON string that are contained in the subgraph
 */
export const iterateSubgraph = (
  nodes: Node[],
  edges: Edge[],
  subgraphChildren: any
) => {
  for (const child of subgraphChildren) {
    if (child['type'] == 'subgraph') {
      iterateSubgraph(nodes, edges, child.children);
    } else if (child['type'] == 'node_stmt') {
      const nodeAttributes = child.attr_list;
      nodes.push(convertNodeAtrributes(nodeAttributes));
    } else if (child['type'] == 'edge_stmt') {
      // node_ids
      const edgeAttributes = child.edge_list;
      // edge points
      const edgePointStrings: string[] = child.attr_list[1]['eq']
        .substring(2)
        .split(' ');
      const edgePoints: Point[] = [];
      edgePointStrings.forEach((edge) => {
        const xYStringArray = edge.split(',');
        const point: Point = {
          x: Number(xYStringArray[0]),
          y: Number(xYStringArray[1])
        };
        edgePoints.push(point);
      });
      edges.push(convertEdgeAtrributes(edgeAttributes, edgePoints));
    }
  }
};
/**
 * Transform dotfile information into a Node object
 * @param nodeAttributes a JSON string containing all node information of the dotfile
 * @returns an instance of type Node
 */
const convertNodeAtrributes = (nodeAttributes: Array<unknown>) => {
  const node: Node = {
    shape: '',
    id: '',
    label: '',
    tokenLabel: '',
    fillColor: '#FFFFFF',
    height: -1,
    width: -1,
    xPosition: -1,
    yPosition: -1,
    parentId: null,
    isParent: false,
    order: null,
    numberOfEdges: 0
  };
  let positions;
  for (const attribute of nodeAttributes) {
    switch (attribute['id']) {
      case 'height':
        node.height = attribute['eq'] * 70;
        break;
      case 'id':
        node.id = attribute['eq'];
        break;
      case 'xlabel':
        node.label = attribute['eq'];
        break;
      case 'label':
        node.tokenLabel = attribute['eq'];
        break;
      case 'pos':
        positions = attribute['eq'].split(',');
        node.xPosition = Number(positions[0]);
        node.yPosition = -Number(positions[1]);
        break;
      case 'shape':
        if (attribute['eq'].includes('rect')) {
          node.shape = 'rectangle';
          node.fillColor = '#000000';
        } else {
          node.shape = 'ellipse';
          node.fillColor = '#FFFFFF';
        }
        break;
      case 'width':
        node.width = attribute['eq'] * 70;
        break;
      case 'group':
        node.parentId = attribute['eq'];
        break;
      default:
        break;
    }
  }
  return node;
};

/**
 * Transform dotfile information into an Edge object
 * @param edgeAttributes a JSON string containing all edge information of the dotfile
 * @param edgePoints the additional control points of an edge
 * @returns an instance of type Edge
 */
const convertEdgeAtrributes = (
  edgeAttributes: Array<unknown>,
  edgePoints: Point[]
) => {
  const edge: Edge = {
    fromNodeId: '',
    toNodeId: '',
    controlPointDistances: [],
    controlPointWeights: []
  };
  // assign source and target
  edge.fromNodeId = edgeAttributes[0]['id'];
  edge.toNodeId = edgeAttributes[1]['id'];
  const edgeStop = edgePoints[0];
  const edgeStart = edgePoints[1];

  // determine edge style (straight or curved)
  let allPointsOnLine = true;
  let slope, intercept;
  if (edgeStop.x != edgeStart.x) {
    slope = (edgeStop.y - edgeStart.y) / (edgeStop.x - edgeStart.x);
    intercept = edgeStart.y - slope * edgeStart.x;
  } else {
    // edge is parallel to y-axis
    slope = Infinity;
    intercept = Infinity;
  }
  for (let i = 2; i < edgePoints.length; i++) {
    const point = edgePoints[i];
    if (!isPointOnLine(slope, intercept, point, edgeStart.x)) {
      allPointsOnLine = false;
      break;
    }
  }
  if (!allPointsOnLine) {
    // determine the control point values
    addEdgeControlPoints(
      edgePoints,
      edgeStart,
      edgeStop,
      edge,
      slope,
      intercept
    );
  }

  return edge;
};

const isPointOnLine = (
  slope: number,
  intercept: number,
  point: Point,
  startX: number
) => {
  if (slope != Infinity) {
    const threshold = 0.2;
    return Math.abs(point.y - (point.x * slope + intercept)) <= threshold;
  }
  return point.x == startX;
};

const addEdgeControlPoints = (
  edgePoints: Point[],
  edgeStart: Point,
  edgeStop: Point,
  edge: Edge,
  slope: number,
  intercept: number
) => {
  const additionalPoints = edgePoints.slice(2); // all points except the first two are control points
  const edgeLength = Math.sqrt(
    (edgeStop.x - edgeStart.x) ** 2 + (edgeStop.y - edgeStart.y) ** 2
  );
  for (const point of additionalPoints) {
    if (slope == 0 || slope == Infinity) {
      continue;
    } else {
      // 2 perpendicular straights: m1 * m2 = -1
      const slopePerpendicular = -1 / slope;
      const interceptPerpendicular =
        -1 * point.x * slopePerpendicular + point.y;
      // m1 * x + n1 = m2 * x + n2
      const intersectionX =
        (interceptPerpendicular - intercept) / (slope - slopePerpendicular);
      const intersectionY = slope * intersectionX + intercept;

      // distance between the control point and the straight from start to endnode
      const distanceWeight = 1; // decides the impact of the control point for the curve (should be <= 1 to avoid edges dissapear on startup)
      let distance =
        distanceWeight *
        Math.sqrt(
          (intersectionX - point.x) ** 2 + (intersectionY - point.y) ** 2
        );
      if (
        (intersectionY < point.y && edgeStart.x < edgeStop.x) ||
        (intersectionY > point.y && edgeStart.x > edgeStop.x)
      ) {
        // direction from the startpoint
        distance *= -1;
      }

      // get fractional distance from control point to the start node
      const distanceToStartpoint = Math.sqrt(
        (intersectionX - edgeStart.x) ** 2 + (intersectionY - edgeStart.y) ** 2
      );
      const weight = distanceToStartpoint / edgeLength;
      if (
        !edge.controlPointDistances.length ||
        edge.controlPointDistances[edge.controlPointDistances.length - 1] !=
          distance
      ) {
        edge.controlPointDistances.push(distance);
        edge.controlPointWeights.push(weight);
      } else {
        edge.controlPointWeights[edge.controlPointWeights.length - 1] = weight;
      }
    }
  }
};

/**
 * Convert the nodes, edges and containers into expressions that are readable for cytoscape
 * @param nodes array of Node objects
 * @param edges array of Edge objects
 * @param containers array of Container objects
 * @returns cytoscape expressions for all input objects that can be passed to cytoscape to draw a graph
 */
const getFinalGraphElements = (
  nodes: Array<Node>,
  edges: Array<Edge>,
  containers: Array<Container>
) => {
  // convert graph elements into objects that are readable by cytoscape
  const cytoscapeExpressions = [];

  // create container expressions
  for (const container of containers) {
    cytoscapeExpressions.push({
      group: 'nodes',
      data: {
        id: container.id,
        label: container.label,
        tippyContent: container.label,
        parent: container.parentId,
        level: container.level,
        yShift: 0
      },
      classes: ['container'],
      style: { 'background-color': container.fillColor }
    });
  }
  for (const node of nodes) {
    // create node expressions
    for (const expression of TransformNodeIntoCytoscapeExpression(node)) {
      cytoscapeExpressions.push(expression);
    }
  }

  for (const edge of edges) {
    let classNames = [];
    if (edge.controlPointDistances.length) {
      classNames = ['bezier'];
    } else {
      classNames = ['straight'];
    }
    cytoscapeExpressions.push(
      TransformEdgeIntoCytoscapeExpression(edge, classNames)
    );
  }
  return cytoscapeExpressions;
};
/**
 * Parses an Edge Object into a cytoscape expression
 * @param edge the edge to be parsed
 * @param classNames the edges classes
 * @returns edge as a cytoscape expression
 */
const TransformEdgeIntoCytoscapeExpression = (
  edge: Edge,
  classNames: string[]
) => {
  return {
    group: 'edges',
    data: { source: edge.fromNodeId, target: edge.toNodeId },
    classes: classNames,
    style: {
      'control-point-distances': edge.controlPointDistances,
      'control-point-weights': edge.controlPointWeights
    }
  };
};

/**
 * Parses a Node Object into a cytoscape expression
 * @param node the node to be parsed
 * @returns node as a cytoscape expression
 */
const TransformNodeIntoCytoscapeExpression = (node: Node) => {
  const expressions = [];
  let classNames: string[];
  if (node.shape == 'ellipse') {
    classNames = ['single_node', 'upper_round_node'];
  } else {
    classNames = ['transition_node'];
  }

  if (node.tokenLabel != '') {
    // node has a token -> create parent object to visualize label and token
    // actual node, labeled with the token
    expressions.push({
      group: 'nodes',
      data: {
        id: node.id,
        parent: node.id + '_token',
        label: node.tokenLabel,
        tippyContent: node.label
      },
      classes: ['single_node', 'token_node'],
      position: { x: node.xPosition, y: node.yPosition },
      style: { 'background-color': node.fillColor }
    });

    // parent container, labeled with the actual label
    expressions.push({
      group: 'nodes',
      classes: ['upper_round_node', 'token_label'],
      data: {
        id: node.id + '_token',
        label: '',
        tippyContent: node.label,
        parent: node.parentId
      }
    });
  } else {
    expressions.push({
      group: 'nodes',
      data: {
        id: node.id,
        label: '',
        tippyContent: node.label,
        parent: node.parentId
      },
      classes: classNames,
      position: { x: node.xPosition, y: node.yPosition },
      style: { 'background-color': node.fillColor }
    });
  }

  return expressions;
};

export const elementCreationExportsForTesting = {
  splitDotfile,
  buildTreeStructure,
  parseElementsFromDotFileString,
  addEdgeControlPoints,
  getFinalGraphElements,
  TransformEdgeIntoCytoscapeExpression,
  TransformNodeIntoCytoscapeExpression
};
