import React, { useState } from 'react';
import { useTaskStore } from '../store/useTaskStore';

interface CreateTaskModalProps {
  columnId: string | null;
  onClose: () => void;
}

const CreateTaskModal: React.FC<CreateTaskModalProps> = ({ columnId, onClose }) => {
  const { createTask, boards, labels, fetchLabels, isLoading } = useTaskStore();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [taskType, setTaskType] = useState<'task' | 'story' | 'bug'>('task');
  const [priority, setPriority] = useState<'lowest' | 'low' | 'medium' | 'high' | 'highest'>('medium');
  const [selectedBoard, setSelectedBoard] = useState(boards[0]?.id || '');
  const [selectedColumn, setSelectedColumn] = useState(columnId || '');
  const [dueDate, setDueDate] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);

  React.useEffect(() => {
    fetchLabels();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) return;

    try {
      await createTask({
        title: title.trim(),
        description: description.trim() || undefined,
        task_type: taskType,
        priority,
        board: selectedBoard as any,
        column: selectedColumn as any,
        due_date: dueDate || undefined,
        estimated_hours: estimatedHours ? parseFloat(estimatedHours) : undefined,
        labels: selectedLabels as any,
      });
      onClose();
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const taskTypes = [
    { value: 'task', label: 'Task', icon: '☑️' },
    { value: 'story', label: 'Story', icon: '📋' },
    { value: 'bug', label: 'Bug', icon: '🐛' },
  ];

  const priorities = [
    { value: 'lowest', label: 'Lowest', color: '#6B7280' },
    { value: 'low', label: 'Low', color: '#16A34A' },
    { value: 'medium', label: 'Medium', color: '#CA8A04' },
    { value: 'high', label: 'High', color: '#EA580C' },
    { value: 'highest', label: 'Highest', color: '#DC2626' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800">Create Task</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Summary *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more details..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Task Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Task Type</label>
            <div className="flex gap-2">
              {taskTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setTaskType(type.value as any)}
                  className={`px-3 py-2 rounded-lg flex items-center gap-2 ${
                    taskType === type.value
                      ? 'bg-blue-100 text-blue-700 border-2 border-blue-500'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span>{type.icon}</span>
                  <span>{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <div className="flex gap-2">
              {priorities.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriority(p.value as any)}
                  className={`px-3 py-1.5 rounded text-sm ${
                    priority === p.value
                      ? 'bg-blue-100 text-blue-700 border-2 border-blue-500'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  style={priority === p.value ? {} : { borderLeft: `3px solid ${p.color}` }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Board & Column */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Board</label>
              <select
                value={selectedBoard}
                onChange={(e) => setSelectedBoard(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {boards.map((board) => (
                  <option key={board.id} value={board.id}>
                    {board.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Column</label>
              <select
                value={selectedColumn}
                onChange={(e) => setSelectedColumn(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select column</option>
                {/* This would be populated from the board columns */}
              </select>
            </div>
          </div>

          {/* Due Date & Estimate */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Hours</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Labels */}
          {labels.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Labels</label>
              <div className="flex flex-wrap gap-2">
                {labels.map((label) => (
                  <button
                    key={label.id}
                    type="button"
                    onClick={() => {
                      if (selectedLabels.includes(label.id)) {
                        setSelectedLabels(selectedLabels.filter((id) => id !== label.id));
                      } else {
                        setSelectedLabels([...selectedLabels, label.id]);
                      }
                    }}
                    className={`px-3 py-1 text-sm rounded-full transition-colors ${
                      selectedLabels.includes(label.id)
                        ? 'ring-2 ring-offset-1'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                    style={{
                      backgroundColor: label.color + '20',
                      color: label.color,
                      borderColor: label.color,
                    }}
                  >
                    {label.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTaskModal;
