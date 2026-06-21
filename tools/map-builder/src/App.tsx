import { useState, useRef } from 'react'
import { exportGridToTS } from './utils/export';
import { parseLaneMap } from './utils/import';

const INITIAL_ROWS = 40;
const COLS = 30;

function App() {
  const [grid, setGrid] = useState<number[][]>(
    Array(INITIAL_ROWS).fill(0).map(() => Array(COLS).fill(0))
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCellClick = (r: number, c: number) => {
    const newGrid = [...grid];
    newGrid[r] = [...newGrid[r]];
    // Cycle from 0 up to 5, then back to 0
    newGrid[r][c] = newGrid[r][c] >= 5 ? 0 : newGrid[r][c] + 1;
    setGrid(newGrid);
  };

  const addRow = () => {
    const cols = grid[0]?.length || COLS;
    setGrid([...grid, Array(cols).fill(0)]);
  };

  const removeRow = () => {
    if (grid.length > 1) {
      setGrid(grid.slice(0, -1));
    }
  };

  const addColumn = () => {
    setGrid(grid.map(row => [...row, 0]));
  };

  const removeColumn = () => {
    if (grid[0]?.length > 1) {
      setGrid(grid.map(row => row.slice(0, -1)));
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const parsedGrid = parseLaneMap(content);
      if (parsedGrid) {
        setGrid(parsedGrid);
      } else {
        alert("Failed to parse laneMap.ts. Ensure it matches the expected format.");
      }
      // Reset input so the same file can be imported again
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8 flex flex-col items-center" style={{ fontFamily: 'sans-serif' }}>
      <h1 className="text-3xl font-bold mb-6" style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>Lane Map Builder</h1>

      <div className="flex gap-4 mb-4" style={{ display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'center' }}>
        <button onClick={addRow} style={{
          padding: '8px 16px', backgroundColor: '#3b82f6', color: 'white', borderRadius: '4px', cursor:
            'pointer', border: 'none'
        }}>Add Row</button>
        <button onClick={removeRow} style={{
          padding: '8px 16px', backgroundColor: '#ef4444', color: 'white', borderRadius: '4px', cursor:
            'pointer', border: 'none'
        }}>Remove Row</button>

        <button onClick={addColumn} style={{
          padding: '8px 16px', backgroundColor: '#3b82f6', color: 'white', borderRadius: '4px', cursor:
            'pointer', border: 'none'
        }}>Add Col</button>
        <button onClick={removeColumn} style={{
          padding: '8px 16px', backgroundColor: '#ef4444', color: 'white', borderRadius: '4px', cursor:
            'pointer', border: 'none'
        }}>Remove Col</button>

        <div style={{ width: '1px', height: '24px', backgroundColor: '#ccc', margin: '0 10px' }} />

        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept=".ts,.js,.txt"
          onChange={onFileChange}
        />
        <button onClick={handleImportClick} style={{
          padding: '8px 16px', backgroundColor: '#6366f1', color: 'white', borderRadius: '4px', cursor:
            'pointer', border: 'none'
        }}>Import laneMap.ts</button>

        <button onClick={() => exportGridToTS(grid)} style={{
          padding: '8px 16px', backgroundColor: '#22c55e', color: 'white', borderRadius:
            '4px', cursor: 'pointer', border: 'none'
        }}>Export laneMap.ts</button>
      </div>

      <div className="bg-white p-4 rounded shadow" style={{
        backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        overflow: 'auto', maxWidth: '95vw'
      }}>
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