export function exportGridToTS(grid: number[][]) {
    const rows = grid.length;
    const cols = grid[0]?.length || 0;

    let tsContent = `export const LANE_MAP = [\n`;

    grid.forEach(row => {
        tsContent += `  [${row.join(', ')}],\n`;
    });

    tsContent += `];\n\n`;
    tsContent += `export const GRID_SIZE = { rows: ${rows}, cols: ${cols} };\n`;
    tsContent += `export const UNIT_SIZE = 1;\n`;

    const blob = new Blob([tsContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'laneMap.ts';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}