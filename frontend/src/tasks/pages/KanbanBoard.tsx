import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useTaskStore } from '../store/useTaskStore';
import taskApi from '../api/TaskApi';
import type { Task, KanbanColumn } from '../api/TaskApi';
import TaskCard from '../components/TaskCard';
import TaskModal from '../components/TaskModal';
import CreateTaskModal from '../components/CreateTaskModal';


const KanbanBoard: React.FC = () => {
  const {
    kanbanBoard,
    boards,
    selectedBoardId,
    isLoading,
    isTaskModalOpen,
    fetchKanbanBoard,
    fetchBoards,
    setSelectedBoard,
    moveTask,
    openTaskModal,
    setError,
  } = useTaskStore();

  // Ensure boards is always an array
  const boardsList = Array.isArray(boards) ? boards : [];

  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createInColumn, setCreateInColumn] = useState<string | null>(null);
  const waitForBackendSafe = async () => {
  const maxAttempts = 10;

  for (let i = 1; i <= maxAttempts; i++) {
    try {
      await taskApi.getBoards();
      return;
    } catch (err: any) {
      if (err?.response?.status === 401) return; // backend is UP
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  throw new Error("Backend not ready");
};

const initialized = useRef(false);

useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const init = async () => {
      try {
        await waitForBackendSafe();

        const boards = await fetchBoards();

        if (boards?.length > 0) {
          const boardId = selectedBoardId || boards[0].id;
          await fetchKanbanBoard(boardId);
        }
      } catch (err) {
        console.error("Init failed:", err);
      }
    };

    init();
  }, []);

  useEffect(() => {
    if (selectedBoardId) {
      fetchKanbanBoard(selectedBoardId);
    }
  }, [selectedBoardId]);

  // Drag and Drop handlers
  const handleDragStart = useCallback((task: Task) => {
    setDraggedTask(task);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(async (column: KanbanColumn, e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedTask) return;

    const position = column.tasks?.length || 0;
    
    try {
      await moveTask(draggedTask.id, column.id, position);
    } catch (error) {
      console.error('Failed to move task:', error);
    } finally {
      setDraggedTask(null);
    }
  }, [draggedTask, moveTask]);

  const handleTaskClick = useCallback((task: Task) => {
    openTaskModal(task);
  }, [openTaskModal]);

  const handleCreateTask = useCallback((columnId: string) => {
    setCreateInColumn(columnId);
    setShowCreateModal(true);
  }, []);

  // Create default board with columns
  const createDefaultBoard = async () => {

    try {
      await waitForBackendSafe();
      const existingBoards = await taskApi.getBoards() as any[];
      let board = existingBoards.find((b) => b.name === 'Main Board');

      if (!board) {
        const created = await taskApi.createBoard({ name: 'Main Board', is_default: true });
        board = created;
      }

      if (!board) {
        throw new Error('Unable to determine board id after create');
      }

      const defaultColumns = [
        { name: 'To Do', status_key: 'pending', color: '#6B7280', position: 0 },
        { name: 'In Progress', status_key: 'in_progress', color: '#3B82F6', position: 1 },
        { name: 'Waiting for Client', status_key: 'waiting_client', color: '#F59E0B', position: 2 },
        { name: 'Completed', status_key: 'completed', color: '#10B981', position: 3 },
        { name: 'Closed', status_key: 'closed', color: '#6B7280', position: 4 },
      ];

      for (const col of defaultColumns) {
        await taskApi.createColumn({
          ...col,
          board: board.id,
        } as any);
      }

      await fetchBoards();
      await fetchKanbanBoard(board.id);
    } catch (error: any) {
      console.error('Failed to create default board:', error);
      if (setError) setError('Failed to create default board. Please try again.');
    }
  };

  // Priority color mapping
  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'highest': return '#DC2626';
      case 'high': return '#EA580C';
      case 'medium': return '#CA8A04';
      case 'low': return '#16A34A';
      case 'lowest': return '#6B7280';
      default: return '#6B7280';
    }
  };

  // Task type icon
  const getTaskTypeIcon = (type: string): string => {
    switch (type) {
      case 'bug': return '🐛';
      case 'story': return '📋';
      case 'epic': return '⚡';
      case 'subtask': return '📝';
      default: return '☑️';
    }
  };

  if (isLoading && !kanbanBoard) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-800">Task Board</h1>
            <select
              value={selectedBoardId || ''}
              onChange={(e) => setSelectedBoard(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={boardsList.length === 0}
            >
              {boardsList.length > 0 ? (
                boardsList.map((board) => (
                  <option key={board.id} value={board.id}>
                    {board.name}
                  </option>
                ))
              ) : (
                <option value="">No boards available</option>
              )}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleCreateTask('')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <span className="text-lg">+</span> Create Task
            </button>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-6">
        {kanbanBoard && kanbanBoard.columns.length > 0 ? (
          <div className="flex gap-4 h-full min-w-max">
            {kanbanBoard.columns.map((column) => (
              <div
                key={column.id}
                className="flex flex-col w-80 bg-gray-200 rounded-lg"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(column, e)}
              >
                {/* Column Header */}
                <div className="p-3 border-b border-gray-300">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: column.color }}
                      ></div>
                      <h3 className="font-semibold text-gray-700">{column.name}</h3>
                      <span className="px-2 py-0.5 bg-gray-300 text-gray-600 text-xs rounded-full">
                        {column.tasks?.length || 0}
                      </span>
                    </div>
                    <button
                      onClick={() => handleCreateTask(column.id)}
                      className="p-1 hover:bg-gray-300 rounded"
                      title="Add task"
                    >
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>
                  {column.WIP_LIMIT && (
                    <div className="mt-1 text-xs text-gray-500">
                      WIP Limit: {column.tasks?.length || 0}/{column.WIP_LIMIT}
                    </div>
                  )}
                </div>

                {/* Tasks */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {column.tasks?.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onDragStart={() => handleDragStart(task)}
                      onClick={() => handleTaskClick(task)}
                      getPriorityColor={getPriorityColor}
                      getTaskTypeIcon={getTaskTypeIcon}
                    />
                  ))}
                  {(!column.tasks || column.tasks.length === 0) && (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      Drop tasks here
                    </div>
                  )}
                </div>

                {/* Quick Add */}
                <div className="p-2 border-t border-gray-300">
                  <button
                    onClick={() => handleCreateTask(column.id)}
                    className="w-full py-2 text-sm text-gray-600 hover:bg-gray-300 rounded transition-colors flex items-center justify-center gap-1"
                  >
                    <span className="text-lg">+</span> Quick add
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-700 mb-2">No Board Found</h2>
              <p className="text-gray-500 mb-4">Click below to create your first board with default columns</p>
              <button
                onClick={createDefaultBoard}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Default Board
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Task Modal */}
      {isTaskModalOpen && <TaskModal />}

      {/* Create Task Modal */}
      {showCreateModal && (
        <CreateTaskModal
          columnId={createInColumn}
          onClose={() => {
            setShowCreateModal(false);
            setCreateInColumn(null);
          }}
        />
      )}
    </div>
  );
};

export default KanbanBoard;
