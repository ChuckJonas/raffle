import './Modal.css';

interface CountModalProps {
  counts: [string, number][];
  totalEntries: number;
  onClose: () => void;
}

export function CountModal({ counts, totalEntries, onClose }: CountModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📊 Entry Counts</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        
        <div className="modal-body">
          <table className="counts-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Entries</th>
                <th>Chance</th>
              </tr>
            </thead>
            <tbody>
              {counts.map(([name, count]) => (
                <tr key={name}>
                  <td className="name-cell">{name}</td>
                  <td className="count-cell">{count}</td>
                  <td className="chance-cell">
                    {((count / totalEntries) * 100).toFixed(1)}%
                    <div 
                      className="chance-bar"
                      style={{ width: `${(count / totalEntries) * 100}%` }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {counts.length === 0 && (
            <p className="no-data">No entries yet!</p>
          )}
        </div>
        
        <div className="modal-footer">
          <span className="total-info">
            Total: <strong>{totalEntries}</strong> entries across <strong>{counts.length}</strong> people
          </span>
        </div>
      </div>
    </div>
  );
}

