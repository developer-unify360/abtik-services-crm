import React from 'react';
import type { Task } from '../api/TaskApi';

interface TaskCardProps {
  task: Task;
  onDragStart: () => void;
  onClick: () => void;
  getPriorityColor: (priority: string) => string;
  getTaskTypeIcon: (type: string) => string;
}

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onDragStart,
  onClick,
  getPriorityColor,
  getTaskTypeIcon,
}) => {
  // Format due date
  const formatDueDate = (date?: string) => {
    if (!date) return null;
    const dueDate = new Date(date);
    const today = new Date();
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { text: 'Overdue', className: 'text-red-600 bg-red-50' };
    } else if (diffDays === 0) {
      return { text: 'Today', className: 'text-orange-600 bg-orange-50' };
    } else if (diffDays <= 3) {
      return { text: `${diffDays}d`, className: 'text-orange-600 bg-orange-50' };
    } else if (diffDays <= 7) {
      return { text: `${diffDays}d`, className: 'text-yellow-600 bg-yellow-50' };
    } else {
      return { text: dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), className: 'text-gray-600 bg-gray-50' };
    }
  };

  const dueDateInfo = formatDueDate(task.due_date);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow group"
    >
      {/* Task Type & Priority */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1">
          <span className="text-sm" title={task.task_type}>
            {getTaskTypeIcon(task.task_type)}
          </span>
          <span className="text-xs text-gray-500 font-mono">{task.task_number}</span>
        </div>
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: getPriorityColor(task.priority) }}
          title={`Priority: ${task.priority_display}`}
        ></div>
      </div>

      {/* Title */}
      <h4 className="text-sm font-medium text-gray-800 mb-2 line-clamp-2">
        {task.title}
      </h4>

      {/* Labels */}
      {task.labels && task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.labels.slice(0, 3).map((label) => (
            <span
              key={label.id}
              className="px-2 py-0.5 text-xs rounded"
              style={{ backgroundColor: label.color + '20', color: label.color }}
            >
              {label.name}
            </span>
          ))}
          {task.labels.length > 3 && (
            <span className="px-2 py-0.5 text-xs text-gray-500">
              +{task.labels.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
        <div className="flex items-center gap-2">
          {/* Subtasks progress */}
          {task.subtasks_count > 0 && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <span>{task.subtasks_completed}/{task.subtasks_count}</span>
            </div>
          )}

          {/* Comments count */}
          {task.comments_count > 0 && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>{task.comments_count}</span>
            </div>
          )}

          {/* Attachments count */}
          {task.attachments_count > 0 && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              <span>{task.attachments_count}</span>
            </div>
          )}
        </div>

        {/* Due date & Assignee */}
        <div className="flex items-center gap-2">
          {dueDateInfo && (
            <span className={`text-xs px-1.5 py-0.5 rounded ${dueDateInfo.className}`}>
              {dueDateInfo.text}
            </span>
          )}
          {task.assignee ? (
            <div
              className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-medium"
              title={task.assignee_name}
            >
              {task.assignee_name?.charAt(0).toUpperCase() || '?'}
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500" title="Unassigned">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Blocked indicator */}
      {task.is_blocked && (
        <div className="absolute top-2 right-2">
          <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-xs rounded flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Blocked
          </span>
        </div>
      )}
    </div>
  );
};

export default TaskCard;
