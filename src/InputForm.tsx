import { useState, FormEvent, ChangeEvent } from 'react';
import './InputForm.css';

interface InputFormProps {
  onAddEntry: (entry: { id: number; title: string; text: string }) => void;
}

export default function InputForm({ onAddEntry }: InputFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    text: ''
  });

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (formData.title.trim() && formData.text.trim()) {
      onAddEntry({ 
        ...formData, 
        id: Date.now()
      });
      setFormData({ title: '', text: '' });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="input-form">
      <h2 className="form-title">Add New Entry</h2>
      
      <div className="form-group">
        <label htmlFor="title" className="form-label">
          Title <span className="required">*</span>
        </label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="Enter a title for your entry..."
          className="form-input"
          required
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="text" className="form-label">
          Text Content <span className="required">*</span>
        </label>
        <textarea
          id="text"
          name="text"
          value={formData.text}
          onChange={handleChange}
          placeholder="Enter your text content here..."
          rows={4}
          className="form-textarea"
          required
        />
      </div>
      
      <div className="form-actions">
        <button type="submit" className="submit-btn">
          Add to Table
        </button>
        <button 
          type="button" 
          className="clear-btn"
          onClick={() => setFormData({ title: '', text: '' })}
        >
          Clear Form
        </button>
      </div>
    </form>
  );
}