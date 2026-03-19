import React, { useState, useEffect } from 'react';
import { useTaskStore } from '../store/useTaskStore';
import { useAuthStore } from '../../auth/authStore';

type TabType = 'details' | 'subtasks' | 'comments' | 'attachments' | 'time' | 'activity';

const TaskModal: React.FC = () => {
  const {
    selectedTask,
    selectedTaskDetails,
    closeTaskModal,
    updateTask,
    deleteTask,
    assignTask,
    updateTaskStatus,
    createSubtask,
    toggleSubtask,
    deleteSubtask,
    addComment,
    deleteComment,
  } = useTaskStore();

  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('details');
  const [editMode, setEditMode] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  
  // Subtask state
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  
  // Comment state
  const [newComment, setNewComment] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(false);

  useEffect(() => {
    if (selectedTask) {
      setEditedTitle(selectedTask.title);
      setEditedDescription(selectedTask.description || '');
    }
  }, [selectedTask]);

  if (!selectedTask) return null;

  const handleSaveEdit = async () => {
    await updateTask(selectedTask.id, {
      title: editedTitle,
      description: editedDescription,
    });
    setEditMode(false);
  };

  const handleAssign = async (assigneeId: string | null) => {
    await assignTask(selectedTask.id, assigneeId);
  };

  const handleStatusChange = async (status: string) => {
    await updateTaskStatus(selectedTask.id, status);
  };

  const handleAddSubtask = async () => {
    if (newSubtaskTitle.trim()) {
      await createSubtask(selectedTask.id, newSubtaskTitle.trim());
      setNewSubtaskTitle('');
    }
  };

  const handleAddComment = async () => {
    if (newComment.trim()) {
      await addComment(selectedTask.id, newComment.trim(), isInternalComment);
      setNewComment('');
    }
  };

  const tabs = [
    { id: 'details', label: 'Details', icon: '📋' },
    { id: 'subtasks', label: 'Subtasks', icon: '✅', count: selectedTaskDetails?.subtasks.length || 0 },
    { id: 'comments', label: 'Comments', icon: '💬', count: selectedTaskDetails?.comments.length || 0 },
    { id: 'attachments', label: 'Attachments', icon: '📎', count: selectedTaskDetails?.attachments?.length || 0 },
    { id: 'time', label: 'Time', icon: '⏱️' },
    { id: 'activity', label: 'Activity', icon: '📜', count: selectedTaskDetails?.activities.length || 0 },
  ] as const;

  const priorities = [
    { value: 'lowest', label: 'Lowest', color: '#6B7280' },
    { value: 'low', label: 'Low', color: '#16A34A' },
    { value: 'medium', label: 'Medium', color: '#CA8A04' },
    { value: 'high', label: 'High', color: '#EA580C' },
    { value: 'highest', label: 'Highest', color: '#DC2626' },
  ];

  const statuses = [
    { value: 'pending', label: 'Pending', color: '#6B7280' },
    { value: 'assigned', label: 'Assigned', color: '#3B82F6' },
    { value: 'in_progress', label: 'In Progress', color: '#8B5CF6' },
    { value: 'waiting_client', label: 'Waiting for Client', color: '#F59E0B' },
    { value: 'completed', label: 'Completed', color: '#10B981' },
    { value: 'closed', label: 'Closed', color: '#6B7280' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg">{selectedTask.task_number}</span>
            <div className="relative">
              <select
                value={selectedTask.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ borderColor: statuses.find(s => s.value === selectedTask.status)?.color }}
              >
                {statuses.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            onClick={closeTaskModal}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel - Task Info */}
          <div className="flex-1 p-6 overflow-y-auto">
            {editMode ? (
              <div className="space-y-4">
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="w-full text-xl font-semibold px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Task title"
                />
                <textarea
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  className="w-full h-40 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Add a description..."
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveEdit}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditMode(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-800">{selectedTask.title}</h2>
                  <button
                    onClick={() => setEditMode(true)}
                    className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
                  >
                    Edit
                  </button>
                </div>
                {selectedTask.description && (
                  <div className="prose max-w-none mb-6">
                    <p className="text-gray-600 whitespace-pre-wrap">{selectedTask.description}</p>
                  </div>
                )}
              </div>
            )}

            {/* Tabs Content */}
            <div className="mt-6">
              {activeTab === 'details' && (
                <div className="space-y-6">
                  {/* Priority */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                    <div className="flex gap-2">
                      {priorities.map((priority) => (
                        <button
                          key={priority.value}
                          onClick={() => updateTask(selectedTask.id, { priority: priority.value as any })}
                          className={`px-3 py-1.5 rounded text-sm ${
                            selectedTask.priority === priority.value
                              ? 'bg-blue-100 text-blue-700 border-2 border-blue-500'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {priority.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                      <input
                        type="date"
                        value={selectedTask.start_date || ''}
                        onChange={(e) => updateTask(selectedTask.id, { start_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                      <input
                        type="date"
                        value={selectedTask.due_date || ''}
                        onChange={(e) => updateTask(selectedTask.id, { due_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Time Tracking */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Hours</label>
                      <input
                        type="number"
                        step="0.5"
                        value={selectedTask.estimated_hours || ''}
                        onChange={(e) => updateTask(selectedTask.id, { estimated_hours: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Actual Hours</label>
                      <input
                        type="number"
                        step="0.5"
                        value={selectedTask.actual_hours || 0}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                      />
                    </div>
                  </div>

                  {/* Labels */}
                  {selectedTask.labels && selectedTask.labels.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Labels</label>
                      <div className="flex flex-wrap gap-2">
                        {selectedTask.labels.map((label) => (
                          <span
                            key={label.id}
                            className="px-3 py-1 text-sm rounded-full"
                            style={{ backgroundColor: label.color + '20', color: label.color }}
                          >
                            {label.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Completion Notes */}
                  {selectedTask.completion_notes && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Completion Notes</label>
                      <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">
                        {selectedTask.completion_notes}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'subtasks' && (
                <div className="space-y-4">
                  {/* Add Subtask */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      placeholder="Add a subtask..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onKeyPress={(e) => e.key === 'Enter' && handleAddSubtask()}
                    />
                    <button
                      onClick={handleAddSubtask}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Add
                    </button>
                  </div>

                  {/* Subtask List */}
                  <div className="space-y-2">
                    {selectedTaskDetails?.subtasks.map((subtask) => (
                      <div
                        key={subtask.id}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                      >
                        <input
                          type="checkbox"
                          checked={subtask.is_completed}
                          onChange={() => toggleSubtask(subtask.id, !subtask.is_completed)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className={`flex-1 ${subtask.is_completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                          {subtask.title}
                        </span>
                        {subtask.completed_at && (
                          <span className="text-xs text-gray-500">
                            Completed {new Date(subtask.completed_at).toLocaleDateString()}
                          </span>
                        )}
                        <button
                          onClick={() => deleteSubtask(subtask.id)}
                          className="p-1 text-gray-400 hover:text-red-500"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                    {(!selectedTaskDetails?.subtasks || selectedTaskDetails.subtasks.length === 0) && (
                      <p className="text-gray-500 text-center py-4">No subtasks yet</p>
                    )}
                  </div>

                  {/* Progress */}
                  {selectedTaskDetails?.subtasks && selectedTaskDetails.subtasks.length > 0 && (
                    <div className="mt-4">
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Progress</span>
                        <span>
                          {selectedTaskDetails.subtasks.filter(s => s.is_completed).length} / {selectedTaskDetails.subtasks.length} completed
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${(selectedTaskDetails.subtasks.filter(s => s.is_completed).length / selectedTaskDetails.subtasks.length) * 100}%`
                          }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'comments' && (
                <div className="space-y-4">
                  {/* Add Comment */}
                  <div className="space-y-2">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
                    />
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-sm text-gray-600">
                        <input
                          type="checkbox"
                          checked={isInternalComment}
                          onChange={(e) => setIsInternalComment(e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        Internal note (not visible to client)
                      </label>
                      <button
                        onClick={handleAddComment}
                        disabled={!newComment.trim()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        Add Comment
                      </button>
                    </div>
                  </div>

                  {/* Comment List */}
                  <div className="space-y-4">
                    {selectedTaskDetails?.comments.map((comment) => (
                      <div key={comment.id} className={`p-4 rounded-lg ${comment.is_internal ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-medium">
                              {comment.author_name?.charAt(0) || '?'}
                            </div>
                            <div>
                              <span className="font-medium text-gray-800">{comment.author_name}</span>
                              {comment.is_internal && (
                                <span className="ml-2 px-2 py-0.5 bg-yellow-200 text-yellow-800 text-xs rounded">Internal</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">
                              {new Date(comment.created_at).toLocaleString()}
                            </span>
                            {comment.author?.id === user?.id && (
                              <button
                                onClick={() => deleteComment(comment.id)}
                                className="p-1 text-gray-400 hover:text-red-500"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                      </div>
                    ))}
                    {(!selectedTaskDetails?.comments || selectedTaskDetails.comments.length === 0) && (
                      <p className="text-gray-500 text-center py-4">No comments yet</p>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'attachments' && (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-gray-600 mb-2">Drag and drop files here or click to upload</p>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      Upload Files
                    </button>
                  </div>

                  {selectedTaskDetails?.attachments && selectedTaskDetails.attachments.length > 0 && (
                    <div className="space-y-2">
                      {selectedTaskDetails.attachments.map((attachment) => (
                        <div key={attachment.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <div className="flex-1">
                            <p className="font-medium text-gray-800">{attachment.file_name}</p>
                            <p className="text-xs text-gray-500">
                              {(attachment.file_size / 1024).toFixed(1)} KB • Uploaded by {attachment.uploaded_by_name}
                            </p>
                          </div>
                          <button className="p-2 text-gray-400 hover:text-blue-600">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'time' && (
                <div className="space-y-4">
                  {/* Time Log Summary */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm text-blue-600">Estimated</p>
                      <p className="text-2xl font-bold text-blue-800">
                        {selectedTask.estimated_hours || 0}h
                      </p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <p className="text-sm text-green-600">Logged</p>
                      <p className="text-2xl font-bold text-green-800">
                        {selectedTask.actual_hours || 0}h
                      </p>
                    </div>
                  </div>

                  {/* Time Log List */}
                  <div>
                    <h4 className="font-medium text-gray-800 mb-3">Time Entries</h4>
                    {selectedTaskDetails?.timeLogs && selectedTaskDetails.timeLogs.length > 0 ? (
                      <div className="space-y-2">
                        {selectedTaskDetails.timeLogs.map((log) => (
                          <div key={log.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                              <p className="font-medium text-gray-800">{log.duration_formatted}</p>
                              <p className="text-sm text-gray-500">{log.description || 'No description'}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-600">{log.user_name}</p>
                              <p className="text-xs text-gray-500">
                                {new Date(log.started_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">No time logged yet</p>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'activity' && (
                <div className="space-y-3">
                  {selectedTaskDetails?.activities.map((activity) => (
                    <div key={activity.id} className="flex gap-3 p-3">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs">📋</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-800">
                          <span className="font-medium">{activity.user_name}</span>{' '}
                          {activity.description || activity.action_display}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(activity.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {(!selectedTaskDetails?.activities || selectedTaskDetails.activities.length === 0) && (
                    <p className="text-gray-500 text-center py-4">No activity yet</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Tabs */}
          <div className="w-64 bg-gray-50 border-l border-gray-200 flex flex-col">
            {/* Tabs */}
            <div className="p-2 space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`w-full px-3 py-2 text-left rounded-lg flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span className="flex-1 text-sm">{tab.label}</span>
                  {'count' in tab && tab.count > 0 && (
                    <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded-full">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Sidebar Info */}
            <div className="mt-auto p-4 border-t border-gray-200 space-y-4">
              {/* Assignee */}
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Assignee</label>
                {selectedTask.assignee ? (
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-medium">
                      {selectedTask.assignee_name?.charAt(0) || '?'}
                    </div>
                    <span className="text-sm text-gray-800">{selectedTask.assignee_name}</span>
                    <button
                      onClick={() => handleAssign(null)}
                      className="ml-auto text-gray-400 hover:text-red-500"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {/* TODO: Show user picker */}}
                    className="w-full px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-gray-400"
                  >
                    + Assign
                  </button>
                )}
              </div>

              {/* Reporter */}
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Reporter</label>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-400 text-white flex items-center justify-center text-sm font-medium">
                    {selectedTask.reporter_name?.charAt(0) || '?'}
                  </div>
                  <span className="text-sm text-gray-800">{selectedTask.reporter_name}</span>
                </div>
              </div>

              {/* Created/Updated */}
              <div className="text-xs text-gray-500 space-y-1">
                <p>Created: {new Date(selectedTask.created_at).toLocaleString()}</p>
                <p>Updated: {new Date(selectedTask.updated_at).toLocaleString()}</p>
              </div>

              {/* Delete Button */}
              <button
                onClick={async () => {
                  if (confirm('Are you sure you want to delete this task?')) {
                    await deleteTask(selectedTask.id);
                  }
                }}
                className="w-full px-3 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
              >
                Delete Task
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskModal;
