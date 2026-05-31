import { useState } from 'react'
import { exportGridToTS } from './utils/export';

const INITIAL_ROWS = 30;
const COLS = 7;

function App() {
  const [grid, setGrid] = useState<number[][]>(
    Array(INITIAL_ROWS).fill(0).map(() => Array(COLS).fill(0))
  );

  const handleCellClick = (r: number, c: number) => {
    const newGrid = [...grid];
    newGrid[r] = [...newGrid[r]];
    // Cycle from 0 up to 5, then back to 0
    newGrid[r][c] = newGrid[r][c] >= 5 ? 0 : newGrid[r][c] + 1;
    setGrid(newGrid);
  };

  const addRow = () => {
    setGrid([...grid, Array(COLS).fill(0)]);
  };

  const removeRow = () => {
    if (grid.length > 1) {
      setGrid(grid.slice(0, -1));
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8 flex flex-col items-center" style={{ fontFamily: 'sans-serif' }}>
      <h1 className="text-3xl font-bold mb-6" style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>Lane Map Builder</h1>

      <div className="flex gap-4 mb-4" style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button onClick={addRow} style={{
          padding: '8px 16px', backgroundColor: '#3b82f6', color: 'white', borderRadius: '4px', cursor:
            'pointer'
        }}>Add Row</button>
        <button onClick={removeRow} style={{
          padding: '8px 16px', backgroundColor: '#ef4444', color: 'white', borderRadius: '4px', cursor:
            'pointer'
        }}>Remove Row</button>
        <button onClick={() => exportGridToTS(grid)} style={{
          padding: '8px 16px', backgroundColor: '#22c55e', color: 'white', borderRadius:
            '4px', marginLeft: '20px', cursor: 'pointer'
        }}>Export laneMap.ts</button>
      </div>

      <div className="bg-white p-4 rounded shadow" style={{
        backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}>
      {grid.map((row, rIdx) => (
        <div key={rIdx} className="flex gap-1 mb-1" style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
          {row.map((cell, cIdx) => (
            <button
              key={`${rIdx}-${cIdx}`}
              onClick={() => handleCellClick(rIdx, cIdx)}
              style={{
                width: '40px',
                height: '40px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                cursor: 'pointer',
                backgroundColor: cell === 0 ? '#f9fafb' : '#2563eb',
                color: cell === 0 ? 'transparent' : 'white',
                opacity: cell === 0 ? 1 : 0.4 + (cell * 0.12)
              }}
            >
              {cell > 0 && `${cell}F`}
            </button>
          ))}
        </div>
      ))}
    </div>
</div >
)
}

export default App