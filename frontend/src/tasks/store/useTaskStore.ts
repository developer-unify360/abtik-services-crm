import { create } from 'zustand';
import taskApi from '../api/TaskApi';
import type { Task, KanbanBoard, TaskBoard, TaskLabel, TaskSubtask, TaskComment, TaskActivity, TaskTimeLog, TaskAttachment } from '../api/TaskApi';

interface TaskState {
  // Kanban Board
  kanbanBoard: KanbanBoard | null;
  boards: TaskBoard[];
  labels: TaskLabel[];
  
  // Current selection
  selectedBoardId: string | null;
  selectedTask: Task | null;
  selectedTaskDetails: {
    subtasks: TaskSubtask[];
    comments: TaskComment[];
    activities: TaskActivity[];
    timeLogs: TaskTimeLog[];
    attachments: TaskAttachment[];
  } | null;
  
  // UI State
  isLoading: boolean;
  isTaskModalOpen: boolean;
  error: string | null;
  
  // Filters
  filters: {
    status?: string;
    priority?: string;
    assignee?: string;
    search?: string;
  };
  
  // Actions
  fetchKanbanBoard: (boardId?: string) => Promise<void>;
  fetchBoards: () => Promise<TaskBoard[]>;
  fetchLabels: () => Promise<void>;
  
  setSelectedBoard: (boardId: string) => void;
  setFilters: (filters: Partial<TaskState['filters']>) => void;
  
  // Task Actions
  createTask: (data: Partial<Task>) => Promise<Task>;
  updateTask: (taskId: string, data: Partial<Task>) => Promise<Task>;
  deleteTask: (taskId: string) => Promise<void>;
  moveTask: (taskId: string, columnId: string, position: number) => Promise<void>;
  assignTask: (taskId: string, assigneeId: string | null) => Promise<void>;
  updateTaskStatus: (taskId: string, status: string, notes?: string) => Promise<void>;
  
  // Task Details
  openTaskModal: (task: Task) => Promise<void>;
  closeTaskModal: () => void;
  fetchTaskDetails: (taskId: string) => Promise<void>;
  
  // Subtasks
  createSubtask: (taskId: string, title: string) => Promise<void>;
  toggleSubtask: (subtaskId: string, isCompleted: boolean) => Promise<void>;
  deleteSubtask: (subtaskId: string) => Promise<void>;
  
  // Comments
  addComment: (taskId: string, content: string, isInternal?: boolean) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  
  // Error handling
  setError: (error: string | null) => void;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  // Initial State
  kanbanBoard: null,
  boards: [],
  labels: [],
  selectedBoardId: null,
  selectedTask: null,
  selectedTaskDetails: null,
  isLoading: false,
  isTaskModalOpen: false,
  error: null,
  filters: {},
  
  // Fetch Kanban Board
  fetchKanbanBoard: async (boardId?: string) => {
    set({ isLoading: true, error: null });
    try {
      const board = await taskApi.getKanbanBoard(boardId);
      set({ kanbanBoard: board, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch kanban board', isLoading: false });
    }
  },
  
  // Fetch Boards
  fetchBoards: async (): Promise<TaskBoard[]> => {
  try {
    const boards = await taskApi.getBoards();

    set({ boards });

    if (boards.length > 0 && !get().selectedBoardId) {
      const defaultBoard = boards.find(b => b.is_default) || boards[0];
      set({ selectedBoardId: defaultBoard.id });
    }

    return boards; // ✅ IMPORTANT FIX
  } catch (error: any) {
    set({ error: error.message || 'Failed to fetch boards' });
    return []; // ✅ prevent undefined/void
  }
},
  
  // Fetch Labels
  fetchLabels: async () => {
    try {
      const labels = await taskApi.getLabels();
      set({ labels });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch labels' });
    }
  },
  
  // Set selected board
  setSelectedBoard: (boardId: string) => {
    set({ selectedBoardId: boardId });
    get().fetchKanbanBoard(boardId);
  },
  
  // Set filters
  setFilters: (filters: Partial<TaskState['filters']>) => {
    set((state) => ({ filters: { ...state.filters, ...filters } }));
  },
  
  // Create Task
  createTask: async (data: Partial<Task>) => {
    set({ isLoading: true, error: null });
    try {
      const task = await taskApi.createTask(data);
      // Refresh kanban board
      await get().fetchKanbanBoard(get().selectedBoardId || undefined);
      set({ isLoading: false });
      return task;
    } catch (error: any) {
      set({ error: error.message || 'Failed to create task', isLoading: false });
      throw error;
    }
  },
  
  // Update Task
  updateTask: async (taskId: string, data: Partial<Task>) => {
    set({ isLoading: true, error: null });
    try {
      const task = await taskApi.updateTask(taskId, data);
      // Refresh kanban board
      await get().fetchKanbanBoard(get().selectedBoardId || undefined);
      // Update selected task if it's the same
      if (get().selectedTask?.id === taskId) {
        set({ selectedTask: task });
      }
      set({ isLoading: false });
      return task;
    } catch (error: any) {
      set({ error: error.message || 'Failed to update task', isLoading: false });
      throw error;
    }
  },
  
  // Delete Task
  deleteTask: async (taskId: string) => {
    set({ isLoading: true, error: null });
    try {
      await taskApi.deleteTask(taskId);
      // Refresh kanban board
      await get().fetchKanbanBoard(get().selectedBoardId || undefined);
      set({ isLoading: false, isTaskModalOpen: false, selectedTask: null });
    } catch (error: any) {
      set({ error: error.message || 'Failed to delete task', isLoading: false });
      throw error;
    }
  },
  
  // Move Task
  moveTask: async (taskId: string, columnId: string, position: number) => {
    try {
      await taskApi.moveTask(taskId, columnId, position);
      // Refresh kanban board
      await get().fetchKanbanBoard(get().selectedBoardId || undefined);
    } catch (error: any) {
      set({ error: error.message || 'Failed to move task' });
      throw error;
    }
  },
  
  // Assign Task
  assignTask: async (taskId: string, assigneeId: string | null) => {
    try {
      const task = await taskApi.assignTask(taskId, assigneeId);
      // Refresh kanban board
      await get().fetchKanbanBoard(get().selectedBoardId || undefined);
      // Update selected task if it's the same
      if (get().selectedTask?.id === taskId) {
        set({ selectedTask: task });
      }
    } catch (error: any) {
      set({ error: error.message || 'Failed to assign task' });
      throw error;
    }
  },
  
  // Update Task Status
  updateTaskStatus: async (taskId: string, status: string, notes?: string) => {
    try {
      const task = await taskApi.updateTaskStatus(taskId, status, notes);
      // Refresh kanban board
      await get().fetchKanbanBoard(get().selectedBoardId || undefined);
      // Update selected task if it's the same
      if (get().selectedTask?.id === taskId) {
        set({ selectedTask: task });
      }
    } catch (error: any) {
      set({ error: error.message || 'Failed to update task status' });
      throw error;
    }
  },
  
  // Open Task Modal
  openTaskModal: async (task: Task) => {
    set({ selectedTask: task, isTaskModalOpen: true });
    await get().fetchTaskDetails(task.id);
  },
  
  // Close Task Modal
  closeTaskModal: () => {
    set({ 
      isTaskModalOpen: false, 
      selectedTask: null, 
      selectedTaskDetails: null 
    });
  },
  
  // Fetch Task Details
  fetchTaskDetails: async (taskId: string) => {
    set({ isLoading: true });
    try {
      const [subtasks, comments, activities, timeLogs, attachments] = await Promise.all([
        taskApi.getSubtasks(taskId),
        taskApi.getComments(taskId),
        taskApi.getActivities(taskId),
        taskApi.getTimeLogs(taskId),
        taskApi.getAttachments(taskId),
      ]);
      set({ 
        selectedTaskDetails: { subtasks, comments, activities, timeLogs, attachments },
        isLoading: false 
      });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch task details', isLoading: false });
    }
  },
  
  // Create Subtask
  createSubtask: async (taskId: string, title: string) => {
    try {
      await taskApi.createSubtask(taskId, title);
      await get().fetchTaskDetails(taskId);
      await get().fetchKanbanBoard(get().selectedBoardId || undefined);
    } catch (error: any) {
      set({ error: error.message || 'Failed to create subtask' });
      throw error;
    }
  },
  
  // Toggle Subtask
  toggleSubtask: async (subtaskId: string, isCompleted: boolean) => {
    const taskId = get().selectedTask?.id;
    if (!taskId) return;
    
    try {
      if (isCompleted) {
        await taskApi.completeSubtask(subtaskId);
      }
      await get().fetchTaskDetails(taskId);
      await get().fetchKanbanBoard(get().selectedBoardId || undefined);
    } catch (error: any) {
      set({ error: error.message || 'Failed to update subtask' });
      throw error;
    }
  },
  
  // Delete Subtask
  deleteSubtask: async (subtaskId: string) => {
    const taskId = get().selectedTask?.id;
    if (!taskId) return;
    
    try {
      await taskApi.deleteSubtask(subtaskId);
      await get().fetchTaskDetails(taskId);
      await get().fetchKanbanBoard(get().selectedBoardId || undefined);
    } catch (error: any) {
      set({ error: error.message || 'Failed to delete subtask' });
      throw error;
    }
  },
  
  // Add Comment
  addComment: async (taskId: string, content: string, isInternal = false) => {
    try {
      await taskApi.createComment(taskId, content, isInternal);
      await get().fetchTaskDetails(taskId);
    } catch (error: any) {
      set({ error: error.message || 'Failed to add comment' });
      throw error;
    }
  },
  
  // Delete Comment
  deleteComment: async (commentId: string) => {
    const taskId = get().selectedTask?.id;
    if (!taskId) return;
    
    try {
      await taskApi.deleteComment(commentId);
      await get().fetchTaskDetails(taskId);
    } catch (error: any) {
      set({ error: error.message || 'Failed to delete comment' });
      throw error;
    }
  },
  
  // Set Error
  setError: (error: string | null) => {
    set({ error });
  },
}));
