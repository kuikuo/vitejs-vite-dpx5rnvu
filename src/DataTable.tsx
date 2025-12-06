import './DataTable.css';

interface DataTableProps {
  data: Array<{
    id: string;
    title: string;
    text: string;
    problem: string;
    solution: string;
  }>;
  onDelete: (id: string) => void;
}

export default function DataTable({ data, onDelete }: DataTableProps) {
  if (data.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📄</div>
        <h3 className="empty-title">No entries yet</h3>
        <p className="empty-text">
          Start by adding entries using the form above or load sample data from the API.
        </p>
      </div>
    );
  }

  return (
    <div className="table-container-wrapper">
      <div className="table-container">
        <div className="table-header">
          <h2 className="table-title">Your Entries</h2>
          <div className="table-summary">
            <span className="count-badge">{data.length}</span>
            <span>entr{data.length === 1 ? 'y' : 'ies'} in table</span>
          </div>
        </div>

        {/* Scrollable table area */}
        <div className="table-scroll-area">
          <table className="data-table">
            <thead>
              <tr>
                <th className="column-title">Title</th>
                <th className="column-content">Problem</th>
                <th className="column-content">Solution</th>
                <th className="column-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((entry) => (
                <tr key={entry.id} className="table-row">
                  <td className="cell-title">
                    <div className="title-content">{entry.title}</div>
                  </td>
                  <td className="cell-content">
                    <div className="content-text">{entry.problem || '—'}</div>
                  </td>
                  <td className="cell-content">
                    <div className="content-text">{entry.solution || '—'}</div>
                  </td>
                  <td className="cell-actions">
                    <button
                      onClick={() => onDelete(entry.id)}
                      className="delete-btn"
                      title="Delete this entry"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}