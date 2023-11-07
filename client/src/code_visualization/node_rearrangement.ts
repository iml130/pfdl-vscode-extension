// SPDX-FileCopyrightText: The PFDL VS Code Extension Contributors
// SPDX-License-Identifier: MIT

/**
 * Takes all containers that should be checked to not overlap, as well as the current rotation status (true or false)
 * Moves the containers until there are no more overlaps.
 */
export const handleContainerOverlapping = (
  containerNodes: any[],
  isGraphRotated = false
) => {
  for (let i = 0; i < containerNodes.length - 1; i++) {
    const container1 = containerNodes[i];

    // read out all information about the containers positioning
    const c1BoundingBox = container1.renderedBoundingBox({
      includeLabels: false
    });
    const leftX1 = c1BoundingBox.x1;
    const rightX1 = c1BoundingBox.x2;
    const topY1 = c1BoundingBox.y1;
    const bottomY1 = c1BoundingBox.y2;

    // compare the current container with all other
    for (let j = i + 1; j < containerNodes.length; j++) {
      const container2 = containerNodes[j];
      if (container2.data('level') > container1.data('level')) {
        // only one-sided comparison necessary
        continue;
      }
      const c2BoundingBox = container2.renderedBoundingBox({
        includeLabels: false
      });
      const leftX2 = c2BoundingBox.x1;
      const rightX2 = c2BoundingBox.x2;
      const topY2 = c2BoundingBox.y1;
      const bottomY2 = c2BoundingBox.y2;

      const overlapX1 = leftX1 <= rightX2 && leftX1 >= leftX2; // the left x of container 1 overlaps with container 2
      const overlapX2 = leftX2 <= rightX1 && leftX2 >= leftX1; // the left x of container 2 overlaps with container 1
      const overlapY1 = topY1 <= bottomY2 && topY1 >= topY2; // the top y of container 1 overlaps with container 2
      const overlapY2 = topY2 <= bottomY1 && topY2 >= topY1; // the top y of container 2 overlaps with container 1

      if ((overlapX1 || overlapX2) && (overlapY1 || overlapY2)) {
        // we found an overlap
        let containerShift = 0;
        let shiftSign = 1;
        if (isGraphRotated) {
          if (overlapY1) {
            containerShift = (bottomY2 - topY1) / 2 + 5;
          } else {
            containerShift = (bottomY1 - topY2) / 2 + 5;
            shiftSign = -1;
          }
          // Save the y shift to apply it every time the graph gets rotated
          container1.data(
            'yShift',
            container1.data('yShift') + shiftSign * containerShift
          );
          container2.data(
            'yShift',
            container2.data('yShift') - shiftSign * containerShift
          );

          container1.shift('y', shiftSign * containerShift);
          container2.shift('y', -1 * shiftSign * containerShift);
        } else {
          if (overlapX1) {
            containerShift = (rightX2 - leftX1) / 2 + 5;
          } else {
            containerShift = (rightX1 - leftX2) / 2 + 5;
            shiftSign = -1;
          }

          container1.shift('x', shiftSign * containerShift);
          container2.shift('x', -1 * shiftSign * containerShift);
          // check if movement is relevant for previous containers
        }
        // check for the previous containers wether the shift caused new overlaps
        handleContainerOverlapping(containerNodes.slice(0, i), isGraphRotated);
      }
    }
  }
};

/**
 * Shift the container that would overlap otherwise when rotating the graph
 * @param container the container to shift
 * @param shiftDirection the direction / axis to shift the container on ('x' or 'y')
 * @param rotatedAfterwards boolean, that should be set to false if the graph is rotated before the rotaion process, true otherwise
 */
export const applyContainerShift = (
  container: any,
  shiftDirection: string,
  rotatedAfterwards: boolean
) => {
  let shiftValue = container.data('yShift');
  if (!rotatedAfterwards) {
    // if graph is rotated back, remove additional y-shifts
    shiftValue *= -1;
  }
  container.shift(shiftDirection, shiftValue);
};
