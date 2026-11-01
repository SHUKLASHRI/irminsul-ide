export const cytoscapeTheme: any[] = [
  // Base node styling
  {
    selector: 'node',
    style: {
      'label': 'data(name)',
      'color': '#f8fafc',
      'font-family': "Consolas, 'Courier New', monospace",
      'font-size': 12,
      'font-weight': 600,
      'text-valign': 'center',
      'text-halign': 'center',
      'text-outline-color': '#07090e',
      'text-outline-width': 2,
      'width': 44,
      'height': 44,
      'background-color': '#111827',
      'border-width': 2.5,
      'border-color': '#64748b',
      'transition-property': 'background-color, border-color, width, height, opacity',
      'transition-duration': 0.2,
      'cursor': 'pointer',
    },
  },
  // Class node
  {
    selector: 'node[kind = "class"]',
    style: {
      'shape': 'round-rectangle',
      'width': 50,
      'height': 50,
      'border-color': '#38bdf8',
      'background-color': '#0c2338',
      'color': '#e0f2fe',
    },
  },
  // Function node
  {
    selector: 'node[kind = "function"]',
    style: {
      'shape': 'ellipse',
      'width': 44,
      'height': 44,
      'border-color': '#a855f7',
      'background-color': '#211235',
      'color': '#f3e8ff',
    },
  },
  // Class Method (function with class_owner)
  {
    selector: 'node[?class_owner]',
    style: {
      'shape': 'round-diamond',
      'border-color': '#c084fc',
      'background-color': '#2e1065',
    },
  },
  // Base edge styling
  {
    selector: 'edge',
    style: {
      'curve-style': 'bezier',
      'target-arrow-shape': 'triangle',
      'arrow-scale': 1.1,
      'line-color': '#334155',
      'target-arrow-color': '#334155',
      'width': 1.8,
      'opacity': 0.65,
      'transition-property': 'line-color, target-arrow-color, width, opacity',
      'transition-duration': 0.2,
    },
  },
  // 'calls' edge
  {
    selector: 'edge[type = "calls"]',
    style: {
      'line-color': '#6366f1',
      'target-arrow-color': '#6366f1',
      'opacity': 0.75,
    },
  },
  // 'instantiates' edge
  {
    selector: 'edge[type = "instantiates"]',
    style: {
      'line-color': '#38bdf8',
      'target-arrow-color': '#38bdf8',
      'line-style': 'dashed',
      'opacity': 0.85,
    },
  },
  // 'inherits' edge
  {
    selector: 'edge[type = "inherits"]',
    style: {
      'line-color': '#10b981',
      'target-arrow-color': '#10b981',
      'target-arrow-shape': 'triangle-backcurve',
      'width': 2.4,
      'opacity': 0.9,
    },
  },
  // Selected node
  {
    selector: 'node:selected, node.selected',
    style: {
      'border-color': '#ffffff',
      'border-width': 4,
      'background-color': '#1e293b',
      'shadow-blur': 25,
      'shadow-color': '#38bdf8',
      'shadow-opacity': 0.8,
      'width': 56,
      'height': 56,
      'font-size': 14,
      'z-index': 999,
    },
  },
  // Direct caller highlight
  {
    selector: 'node.caller-highlight',
    style: {
      'border-color': '#fbbf24',
      'border-width': 3,
      'background-color': '#451a03',
      'shadow-blur': 18,
      'shadow-color': '#fbbf24',
      'shadow-opacity': 0.7,
    },
  },
  // Direct callee highlight
  {
    selector: 'node.callee-highlight',
    style: {
      'border-color': '#34d399',
      'border-width': 3,
      'background-color': '#064e3b',
      'shadow-blur': 18,
      'shadow-color': '#34d399',
      'shadow-opacity': 0.7,
    },
  },
  // Highlighted connected edge
  {
    selector: 'edge.highlighted',
    style: {
      'width': 3,
      'opacity': 1,
      'line-color': '#38bdf8',
      'target-arrow-color': '#38bdf8',
      'z-index': 998,
    },
  },
  // Circular dependency edge
  {
    selector: 'edge.cycle-edge',
    style: {
      'line-color': '#f43f5e',
      'target-arrow-color': '#f43f5e',
      'width': 3.5,
      'opacity': 1,
      'z-index': 1000,
    },
  },
  // Circular dependency node
  {
    selector: 'node.cycle-node',
    style: {
      'border-color': '#f43f5e',
      'border-width': 3.5,
      'background-color': '#4c0519',
      'shadow-blur': 20,
      'shadow-color': '#f43f5e',
      'shadow-opacity': 0.9,
      'z-index': 1000,
    },
  },
  // Dead code node
  {
    selector: 'node.dead-node',
    style: {
      'opacity': 0.35,
      'border-color': '#64748b',
      'border-style': 'dashed',
      'background-color': '#0f172a',
      'color': '#64748b',
    },
  },
  // Dimmed element (during focused view)
  {
    selector: '.dimmed',
    style: {
      'opacity': 0.15,
    },
  },
];
