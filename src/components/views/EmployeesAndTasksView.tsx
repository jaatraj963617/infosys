import { useMemo, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Clock,
  Edit3,
  ListTodo,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import type {
  CurrencyCode,
  EmployeeRecord,
  EmployeeStatus,
  ShopProfile,
  TaskPriority,
  TaskRecord,
  TaskStatus,
} from '../../types/bi';
import { fmtCurrency, fmtNumber } from '../../utils/analytics';
import { getCurrencyMeta } from '../../utils/businessConfig';
import { formatFriendlyFirestoreError } from '../../firebase';

interface EmployeesAndTasksViewProps {
  currency: CurrencyCode;
  shopProfile: ShopProfile;
  employees: EmployeeRecord[];
  tasks: TaskRecord[];
  onAddEmployee: (employee: Omit<EmployeeRecord, 'id'>) => Promise<void>;
  onUpdateEmployee: (
    id: string,
    patch: Partial<
      Pick<
        EmployeeRecord,
        'name' | 'role' | 'department' | 'phone' | 'email' | 'monthlySalary' | 'status' | 'joinedDate'
      >
    >
  ) => Promise<void>;
  onDeleteEmployee: (id: string) => Promise<void>;
  onAddTask: (task: Omit<TaskRecord, 'id'>) => Promise<void>;
  onUpdateTask: (
    id: string,
    patch: Partial<
      Pick<TaskRecord, 'title' | 'description' | 'status' | 'priority' | 'assigneeId' | 'assigneeName' | 'dueDate'>
    >
  ) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
}

const TASK_STATUSES: TaskStatus[] = ['Pending', 'In Progress', 'Completed'];
const TASK_PRIORITIES: TaskPriority[] = ['Low', 'Medium', 'High'];
const EMPLOYEE_STATUSES: EmployeeStatus[] = ['Active', 'On Leave', 'Inactive'];

const TASK_STATUS_META: Record<
  TaskStatus,
  {
    textClass: string;
    selectClass: string;
    icon: typeof Clock;
  }
> = {
  Pending: {
    textClass: 'text-amber-700',
    selectClass: 'border-amber-200 bg-amber-50/70 text-amber-900',
    icon: Clock,
  },
  'In Progress': {
    textClass: 'text-blue-700',
    selectClass: 'border-blue-200 bg-blue-50/70 text-blue-900',
    icon: RefreshCw,
  },
  Completed: {
    textClass: 'text-emerald-700',
    selectClass: 'border-emerald-200 bg-emerald-50/70 text-emerald-900',
    icon: CheckCircle2,
  },
};

const PRIORITY_TEXT_COLOR: Record<TaskPriority, string> = {
  High: 'text-rose-700',
  Medium: 'text-amber-700',
  Low: 'text-slate-600',
};

const EMPLOYEE_STATUS_COLOR: Record<EmployeeStatus, string> = {
  Active: 'text-emerald-700 border-emerald-200 bg-emerald-50/70',
  'On Leave': 'text-amber-800 border-amber-200 bg-amber-50/70',
  Inactive: 'text-slate-600 border-slate-200 bg-slate-100',
};

export function EmployeesAndTasksView({
  currency,
  shopProfile,
  employees,
  tasks,
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
}: EmployeesAndTasksViewProps) {
  const currencyMeta = getCurrencyMeta(currency);
  const [activeTab, setActiveTab] = useState<'tasks' | 'employees'>('tasks');

  // Task Filters
  const [statusFilter, setStatusFilter] = useState<'ALL' | TaskStatus>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | TaskPriority>('ALL');
  const [taskSearch, setTaskSearch] = useState('');

  // Task Form State
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskStatus, setTaskStatus] = useState<TaskStatus>('Pending');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('Medium');
  const [taskAssigneeId, setTaskAssigneeId] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskFormError, setTaskFormError] = useState<string | null>(null);
  const [isSavingTask, setIsSavingTask] = useState(false);

  // Task Row Action State
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [confirmDeleteTaskId, setConfirmDeleteTaskId] = useState<string | null>(null);
  const [taskTableError, setTaskTableError] = useState<string | null>(null);

  // Employee Filters & Form State
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [empName, setEmpName] = useState('');
  const [empRole, setEmpRole] = useState('');
  const [empDepartment, setEmpDepartment] = useState('');
  const [empPhone, setEmpPhone] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [empSalary, setEmpSalary] = useState('');
  const [empStatus, setEmpStatus] = useState<EmployeeStatus>('Active');
  const [empJoinedDate, setEmpJoinedDate] = useState('');
  const [empFormError, setEmpFormError] = useState<string | null>(null);
  const [isSavingEmployee, setIsSavingEmployee] = useState(false);

  const [busyEmployeeId, setBusyEmployeeId] = useState<string | null>(null);
  const [confirmDeleteEmployeeId, setConfirmDeleteEmployeeId] = useState<string | null>(null);
  const [empTableError, setEmpTableError] = useState<string | null>(null);

  const taskStats = useMemo(() => {
    const pending = tasks.filter((t) => t.status === 'Pending').length;
    const inProgress = tasks.filter((t) => t.status === 'In Progress').length;
    const completed = tasks.filter((t) => t.status === 'Completed').length;
    const total = tasks.length;
    const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, pending, inProgress, completed, completionPct };
  }, [tasks]);

  const employeeStats = useMemo(() => {
    const active = employees.filter((e) => e.status === 'Active');
    const onLeave = employees.filter((e) => e.status === 'On Leave').length;
    const monthlyPayroll = active.reduce((sum, e) => sum + (Number(e.monthlySalary) || 0), 0);
    return {
      total: employees.length,
      activeCount: active.length,
      onLeave,
      monthlyPayroll,
    };
  }, [employees]);

  const tasksByEmployee = useMemo(() => {
    const counts = new Map<string, { open: number; completed: number }>();
    tasks.forEach((task) => {
      if (!task.assigneeId) return;
      const entry = counts.get(task.assigneeId) || { open: 0, completed: 0 };
      if (task.status === 'Completed') {
        entry.completed += 1;
      } else {
        entry.open += 1;
      }
      counts.set(task.assigneeId, entry);
    });
    return counts;
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const q = taskSearch.toLowerCase().trim();
    return tasks.filter((task) => {
      if (statusFilter !== 'ALL' && task.status !== statusFilter) return false;
      if (priorityFilter !== 'ALL' && task.priority !== priorityFilter) return false;
      if (!q) return true;
      return (
        task.title.toLowerCase().includes(q) ||
        (task.description || '').toLowerCase().includes(q) ||
        (task.assigneeName || '').toLowerCase().includes(q)
      );
    });
  }, [tasks, statusFilter, priorityFilter, taskSearch]);

  const filteredEmployees = useMemo(() => {
    const q = employeeSearch.toLowerCase().trim();
    if (!q) return employees;
    return employees.filter(
      (emp) =>
        emp.name.toLowerCase().includes(q) ||
        emp.role.toLowerCase().includes(q) ||
        (emp.department || '').toLowerCase().includes(q) ||
        (emp.phone || '').toLowerCase().includes(q)
    );
  }, [employees, employeeSearch]);

  const resetTaskForm = () => {
    setEditingTaskId(null);
    setTaskTitle('');
    setTaskDescription('');
    setTaskStatus('Pending');
    setTaskPriority('Medium');
    setTaskAssigneeId('');
    setTaskDueDate('');
    setTaskFormError(null);
  };

  const openNewTaskForm = () => {
    resetTaskForm();
    setShowTaskForm(true);
  };

  const openEditTaskForm = (task: TaskRecord) => {
    setEditingTaskId(task.id);
    setTaskTitle(task.title);
    setTaskDescription(task.description || '');
    setTaskStatus(task.status);
    setTaskPriority(task.priority);
    setTaskAssigneeId(task.assigneeId || '');
    setTaskDueDate(task.dueDate || '');
    setTaskFormError(null);
    setShowTaskForm(true);
  };

  const handleTaskSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSavingTask) return;
    setTaskFormError(null);

    const cleanTitle = taskTitle.trim();
    const cleanDescription = taskDescription.trim();

    if (cleanTitle.length < 2 || cleanTitle.length > 140) {
      setTaskFormError('Task title must be between 2 and 140 characters.');
      return;
    }
    if (cleanDescription.length > 400) {
      setTaskFormError('Task description must be 400 characters or fewer.');
      return;
    }
    if (taskDueDate && !/^\d{4}-\d{2}-\d{2}$/.test(taskDueDate)) {
      setTaskFormError('Due date must be a valid YYYY-MM-DD date.');
      return;
    }

    const matchedEmployee = employees.find((emp) => emp.id === taskAssigneeId);
    const assigneeId = matchedEmployee ? matchedEmployee.id : '';
    const assigneeName = matchedEmployee ? matchedEmployee.name : '';

    setIsSavingTask(true);
    try {
      if (editingTaskId) {
        await onUpdateTask(editingTaskId, {
          title: cleanTitle,
          description: cleanDescription,
          status: taskStatus,
          priority: taskPriority,
          assigneeId,
          assigneeName,
          dueDate: taskDueDate,
        });
      } else {
        await onAddTask({
          title: cleanTitle,
          description: cleanDescription || undefined,
          status: taskStatus,
          priority: taskPriority,
          assigneeId: assigneeId || undefined,
          assigneeName: assigneeName || undefined,
          dueDate: taskDueDate || undefined,
        });
      }
      resetTaskForm();
      setShowTaskForm(false);
    } catch (err) {
      setTaskFormError(formatFriendlyFirestoreError(err));
    } finally {
      setIsSavingTask(false);
    }
  };

  const handleQuickStatusChange = async (taskId: string, nextStatus: TaskStatus) => {
    setTaskTableError(null);
    setBusyTaskId(taskId);
    try {
      await onUpdateTask(taskId, { status: nextStatus });
    } catch (err) {
      setTaskTableError(formatFriendlyFirestoreError(err));
    } finally {
      setBusyTaskId(null);
    }
  };

  const handleConfirmDeleteTask = async (taskId: string) => {
    setTaskTableError(null);
    setBusyTaskId(taskId);
    try {
      await onDeleteTask(taskId);
      setConfirmDeleteTaskId(null);
    } catch (err) {
      setTaskTableError(formatFriendlyFirestoreError(err));
    } finally {
      setBusyTaskId(null);
    }
  };

  const resetEmployeeForm = () => {
    setEditingEmployeeId(null);
    setEmpName('');
    setEmpRole('');
    setEmpDepartment('');
    setEmpPhone('');
    setEmpEmail('');
    setEmpSalary('');
    setEmpStatus('Active');
    setEmpJoinedDate('');
    setEmpFormError(null);
  };

  const openNewEmployeeForm = () => {
    resetEmployeeForm();
    setShowEmployeeForm(true);
  };

  const openEditEmployeeForm = (emp: EmployeeRecord) => {
    setEditingEmployeeId(emp.id);
    setEmpName(emp.name);
    setEmpRole(emp.role);
    setEmpDepartment(emp.department || '');
    setEmpPhone(emp.phone || '');
    setEmpEmail(emp.email || '');
    setEmpSalary(String(emp.monthlySalary ?? 0));
    setEmpStatus(emp.status);
    setEmpJoinedDate(emp.joinedDate || '');
    setEmpFormError(null);
    setShowEmployeeForm(true);
  };

  const handleEmployeeSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSavingEmployee) return;
    setEmpFormError(null);

    const cleanName = empName.trim();
    const cleanRole = empRole.trim();
    const cleanDept = empDepartment.trim();
    const cleanPhone = empPhone.trim();
    const cleanEmail = empEmail.trim();
    const parsedSalary = empSalary.trim() === '' ? 0 : Number(empSalary);

    if (cleanName.length < 2 || cleanName.length > 100) {
      setEmpFormError('Employee name must be 2–100 characters.');
      return;
    }
    if (cleanRole.length < 2 || cleanRole.length > 80) {
      setEmpFormError('Role / title must be 2–80 characters.');
      return;
    }
    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setEmpFormError('Enter a valid email address or leave it blank.');
      return;
    }
    if (!Number.isFinite(parsedSalary) || parsedSalary < 0 || parsedSalary > 100000000) {
      setEmpFormError('Monthly salary must be 0 or greater.');
      return;
    }
    if (empJoinedDate && !/^\d{4}-\d{2}-\d{2}$/.test(empJoinedDate)) {
      setEmpFormError('Joined date must be a valid YYYY-MM-DD date.');
      return;
    }

    setIsSavingEmployee(true);
    try {
      if (editingEmployeeId) {
        await onUpdateEmployee(editingEmployeeId, {
          name: cleanName,
          role: cleanRole,
          department: cleanDept,
          phone: cleanPhone,
          email: cleanEmail,
          monthlySalary: parsedSalary,
          status: empStatus,
          joinedDate: empJoinedDate,
        });
      } else {
        await onAddEmployee({
          name: cleanName,
          role: cleanRole,
          department: cleanDept || undefined,
          phone: cleanPhone || undefined,
          email: cleanEmail || undefined,
          monthlySalary: parsedSalary,
          status: empStatus,
          joinedDate: empJoinedDate || undefined,
        });
      }
      resetEmployeeForm();
      setShowEmployeeForm(false);
    } catch (err) {
      setEmpFormError(formatFriendlyFirestoreError(err));
    } finally {
      setIsSavingEmployee(false);
    }
  };

  const handleEmployeeStatusChange = async (employeeId: string, nextStatus: EmployeeStatus) => {
    setEmpTableError(null);
    setBusyEmployeeId(employeeId);
    try {
      await onUpdateEmployee(employeeId, { status: nextStatus });
    } catch (err) {
      setEmpTableError(formatFriendlyFirestoreError(err));
    } finally {
      setBusyEmployeeId(null);
    }
  };

  const handleConfirmDeleteEmployee = async (employeeId: string) => {
    setEmpTableError(null);
    setBusyEmployeeId(employeeId);
    try {
      await onDeleteEmployee(employeeId);
      setConfirmDeleteEmployeeId(null);
    } catch (err) {
      setEmpTableError(formatFriendlyFirestoreError(err));
    } finally {
      setBusyEmployeeId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Summary Strip (Interactive Status Filter Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => {
            setActiveTab('tasks');
            setStatusFilter('ALL');
          }}
          aria-pressed={activeTab === 'tasks' && statusFilter === 'ALL'}
          className={`text-left bg-white rounded-xl p-5 border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
            activeTab === 'tasks' && statusFilter === 'ALL'
              ? 'border-violet-400 ring-1 ring-violet-200'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>All Tasks</span>
            <ListTodo className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 font-mono-num text-2xl font-bold text-slate-900">
            {fmtNumber(taskStats.total, currency)}
          </div>
          <div className="mt-1 text-xs text-slate-500 tabular-nums truncate">
            {fmtNumber(employeeStats.activeCount, currency)} active team · {shopProfile.shopName}
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('tasks');
            setStatusFilter((prev) => (prev === 'Pending' ? 'ALL' : 'Pending'));
          }}
          aria-pressed={activeTab === 'tasks' && statusFilter === 'Pending'}
          className={`text-left bg-white rounded-xl p-5 border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
            activeTab === 'tasks' && statusFilter === 'Pending'
              ? 'border-amber-400 ring-1 ring-amber-200'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Pending</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 font-mono-num text-2xl font-bold text-amber-700">
            {fmtNumber(taskStats.pending, currency)}
          </div>
          <div className="mt-1 text-xs text-slate-500">Awaiting kickoff or assignment</div>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('tasks');
            setStatusFilter((prev) => (prev === 'In Progress' ? 'ALL' : 'In Progress'));
          }}
          aria-pressed={activeTab === 'tasks' && statusFilter === 'In Progress'}
          className={`text-left bg-white rounded-xl p-5 border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
            activeTab === 'tasks' && statusFilter === 'In Progress'
              ? 'border-blue-400 ring-1 ring-blue-200'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>In Progress</span>
            <RefreshCw className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 font-mono-num text-2xl font-bold text-blue-700">
            {fmtNumber(taskStats.inProgress, currency)}
          </div>
          <div className="mt-1 text-xs text-slate-500">Currently being worked on</div>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('tasks');
            setStatusFilter((prev) => (prev === 'Completed' ? 'ALL' : 'Completed'));
          }}
          aria-pressed={activeTab === 'tasks' && statusFilter === 'Completed'}
          className={`text-left bg-white rounded-xl p-5 border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
            activeTab === 'tasks' && statusFilter === 'Completed'
              ? 'border-emerald-400 ring-1 ring-emerald-200'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 font-mono-num text-2xl font-bold text-emerald-700">
            {fmtNumber(taskStats.completed, currency)}
          </div>
          <div className="mt-1 text-xs text-slate-500 tabular-nums">
            {taskStats.completionPct}% completion rate
          </div>
        </button>
      </div>

      {/* Section Switcher: Tasks vs Employees */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div
          role="tablist"
          aria-label="Employees and Tasks sections"
          className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'tasks'}
            onClick={() => setActiveTab('tasks')}
            className={`min-h-[38px] px-4 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 ${
              activeTab === 'tasks'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ClipboardList className="w-4 h-4 text-violet-600" />
            <span>Tasks</span>
            <span className="font-mono-num text-xs text-slate-500">({taskStats.total})</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'employees'}
            onClick={() => setActiveTab('employees')}
            className={`min-h-[38px] px-4 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 ${
              activeTab === 'employees'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4 text-violet-600" />
            <span>Employees</span>
            <span className="font-mono-num text-xs text-slate-500">({employeeStats.total})</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="text-xs text-slate-500 tabular-nums mr-1">
            Monthly Active Payroll:{' '}
            <span className="font-mono-num font-semibold text-slate-900">
              {fmtCurrency(employeeStats.monthlyPayroll, currency)}
            </span>
          </div>
          {activeTab === 'tasks' ? (
            <button
              type="button"
              onClick={() => (showTaskForm ? (setShowTaskForm(false), resetTaskForm()) : openNewTaskForm())}
              className="min-h-[40px] px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-xs sm:text-sm font-semibold text-white inline-flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              <Plus className="w-4 h-4" />
              <span>{showTaskForm ? 'Close Task Form' : 'Add Task'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() =>
                showEmployeeForm ? (setShowEmployeeForm(false), resetEmployeeForm()) : openNewEmployeeForm()
              }
              className="min-h-[40px] px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-xs sm:text-sm font-semibold text-white inline-flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              <UserPlus className="w-4 h-4" />
              <span>{showEmployeeForm ? 'Close Employee Form' : 'Add Employee'}</span>
            </button>
          )}
        </div>
      </div>

      {/* TASKS TAB */}
      {activeTab === 'tasks' && (
        <div className="space-y-5">
          {/* Add / Edit Task Form */}
          {showTaskForm && (
            <form
              onSubmit={handleTaskSubmit}
              className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4"
            >
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {editingTaskId ? 'Edit Task' : 'Create New Task'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Set task status (Pending, In Progress, or Completed), priority, due date, and assignee
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowTaskForm(false);
                    resetTaskForm();
                  }}
                  className="text-xs font-medium text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
              </div>

              {taskFormError && (
                <div
                  role="alert"
                  className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{taskFormError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="md:col-span-2">
                  <label htmlFor="taskTitleInput" className="block text-xs font-medium text-slate-700 mb-1">
                    Task Title *
                  </label>
                  <input
                    id="taskTitleInput"
                    type="text"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder="e.g. Reconcile weekly UPI settlements"
                    maxLength={140}
                    required
                    className="w-full min-h-[38px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                <div>
                  <label htmlFor="taskStatusInput" className="block text-xs font-medium text-slate-700 mb-1">
                    Status *
                  </label>
                  <select
                    id="taskStatusInput"
                    value={taskStatus}
                    onChange={(e) => setTaskStatus(e.target.value as TaskStatus)}
                    className="w-full min-h-[38px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    {TASK_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="taskPriorityInput" className="block text-xs font-medium text-slate-700 mb-1">
                    Priority
                  </label>
                  <select
                    id="taskPriorityInput"
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
                    className="w-full min-h-[38px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    {TASK_PRIORITIES.map((prio) => (
                      <option key={prio} value={prio}>
                        {prio}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="taskAssigneeInput" className="block text-xs font-medium text-slate-700 mb-1">
                    Assign To Employee (Optional)
                  </label>
                  <select
                    id="taskAssigneeInput"
                    value={taskAssigneeId}
                    onChange={(e) => setTaskAssigneeId(e.target.value)}
                    className="w-full min-h-[38px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="">Unassigned</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="taskDueDateInput" className="block text-xs font-medium text-slate-700 mb-1">
                    Due Date (Optional)
                  </label>
                  <input
                    id="taskDueDateInput"
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full min-h-[38px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                <div className="md:col-span-2 lg:col-span-4">
                  <label htmlFor="taskDescInput" className="block text-xs font-medium text-slate-700 mb-1">
                    Description / Instructions (Optional)
                  </label>
                  <textarea
                    id="taskDescInput"
                    rows={2}
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    placeholder="Add clear instructions, checklist items, or context..."
                    maxLength={400}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowTaskForm(false);
                    resetTaskForm();
                  }}
                  className="min-h-[38px] px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingTask}
                  className="min-h-[38px] px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-xs font-semibold text-white inline-flex items-center gap-2"
                >
                  {isSavingTask && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {isSavingTask ? 'Saving Task...' : editingTaskId ? 'Update Task' : 'Save Task'}
                </button>
              </div>
            </form>
          )}

          {/* Tasks Filter Toolbar & Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-200 space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Operational Tasks</h2>
                  <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                    Showing {fmtNumber(filteredTasks.length, currency)} of {fmtNumber(tasks.length, currency)} tasks
                  </p>
                </div>

                {/* Status Filter Segmented Buttons */}
                <div
                  role="group"
                  aria-label="Filter tasks by status"
                  className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg self-start lg:self-auto"
                >
                  {(
                    [
                      { id: 'ALL', label: 'All', count: taskStats.total },
                      { id: 'Pending', label: 'Pending', count: taskStats.pending },
                      { id: 'In Progress', label: 'In Progress', count: taskStats.inProgress },
                      { id: 'Completed', label: 'Completed', count: taskStats.completed },
                    ] as const
                  ).map((opt) => {
                    const isActive = statusFilter === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        aria-pressed={isActive}
                        onClick={() => setStatusFilter(opt.id)}
                        className={`min-h-[34px] px-3 py-1 rounded-md text-xs font-semibold transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                          isActive
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <span>{opt.label}</span>
                        <span className="font-mono-num text-[11px] text-slate-500">({opt.count})</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Search, Status Select, and Priority Filter */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-6 relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={taskSearch}
                    onChange={(e) => setTaskSearch(e.target.value)}
                    placeholder="Search task title, instructions, or assignee..."
                    aria-label="Search tasks"
                    className="w-full min-h-[38px] pl-9 pr-3 rounded-lg border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="taskStatusDropdownFilter" className="sr-only">
                    Filter by status
                  </label>
                  <select
                    id="taskStatusDropdownFilter"
                    aria-label="Status filter"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as 'ALL' | TaskStatus)}
                    className="w-full min-h-[38px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-xs sm:text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="ALL">All Statuses</option>
                    {TASK_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        Status: {status}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="taskPriorityFilter" className="sr-only">
                    Filter by priority
                  </label>
                  <select
                    id="taskPriorityFilter"
                    aria-label="Priority filter"
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value as 'ALL' | TaskPriority)}
                    className="w-full min-h-[38px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-xs sm:text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="ALL">All Priorities</option>
                    {TASK_PRIORITIES.map((prio) => (
                      <option key={prio} value={prio}>
                        Priority: {prio}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {taskTableError && (
                <div
                  role="alert"
                  className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{taskTableError}</span>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500">
                  <tr>
                    <th className="text-left py-3 px-4">Task</th>
                    <th className="text-left py-3 px-4 whitespace-nowrap">Assignee</th>
                    <th className="text-left py-3 px-4 whitespace-nowrap">Priority</th>
                    <th className="text-left py-3 px-4 whitespace-nowrap">Due Date</th>
                    <th className="text-left py-3 px-4 whitespace-nowrap">Status</th>
                    <th className="text-right py-3 px-4 whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 px-4">
                        <div className="max-w-md mx-auto space-y-2.5">
                          <div className="text-sm font-semibold text-slate-800">
                            {tasks.length === 0
                              ? 'No operational tasks added yet'
                              : `No tasks match ${
                                  statusFilter === 'ALL' ? 'your current filters' : `"${statusFilter}" status`
                                }`}
                          </div>
                          <p className="text-xs text-slate-500">
                            {tasks.length === 0
                              ? 'Create your first task to assign work to team members and track progress from Pending to Completed.'
                              : 'Switch the status filter or clear your search query to view all saved tasks.'}
                          </p>
                          <div className="pt-1">
                            {tasks.length === 0 ? (
                              <button
                                type="button"
                                onClick={openNewTaskForm}
                                className="min-h-[36px] px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-xs font-semibold text-white inline-flex items-center gap-1.5"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Add First Task
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setStatusFilter('ALL');
                                  setPriorityFilter('ALL');
                                  setTaskSearch('');
                                }}
                                className="min-h-[36px] px-4 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
                              >
                                Show All Tasks
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.map((task) => {
                      const statusMeta = TASK_STATUS_META[task.status];
                      const StatusIcon = statusMeta.icon;
                      const isBusy = busyTaskId === task.id;
                      const isConfirmingDelete = confirmDeleteTaskId === task.id;
                      return (
                        <tr key={task.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 min-w-[240px]">
                            <div
                              className={`font-semibold ${
                                task.status === 'Completed'
                                  ? 'text-slate-500 line-through'
                                  : 'text-slate-900'
                              }`}
                            >
                              {task.title}
                            </div>
                            {task.description && (
                              <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                                {task.description}
                              </p>
                            )}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-700 whitespace-nowrap">
                            {task.assigneeName || <span className="text-slate-400">Unassigned</span>}
                          </td>
                          <td
                            className={`py-3 px-4 text-xs font-semibold whitespace-nowrap ${PRIORITY_TEXT_COLOR[task.priority]}`}
                          >
                            {task.priority}
                          </td>
                          <td className="py-3 px-4 font-mono-num text-xs text-slate-600 whitespace-nowrap">
                            {task.dueDate || '—'}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              <StatusIcon className={`w-3.5 h-3.5 shrink-0 ${statusMeta.textClass}`} />
                              <select
                                aria-label={`Status for ${task.title}`}
                                value={task.status}
                                disabled={isBusy}
                                onChange={(e) =>
                                  void handleQuickStatusChange(task.id, e.target.value as TaskStatus)
                                }
                                className={`min-h-[32px] px-2.5 py-1 rounded-lg border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-60 ${statusMeta.selectClass}`}
                              >
                                {TASK_STATUSES.map((s) => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            {isConfirmingDelete ? (
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => void handleConfirmDeleteTask(task.id)}
                                  className="min-h-[30px] px-2.5 rounded bg-rose-600 hover:bg-rose-700 text-xs font-semibold text-white"
                                >
                                  Delete
                                </button>
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => setConfirmDeleteTaskId(null)}
                                  className="min-h-[30px] px-2 rounded border border-slate-200 bg-white text-xs text-slate-600 hover:bg-slate-50"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => openEditTaskForm(task)}
                                  aria-label={`Edit ${task.title}`}
                                  className="min-h-[32px] min-w-[32px] inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-violet-700 hover:bg-violet-50 transition-colors"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteTaskId(task.id)}
                                  aria-label={`Delete ${task.title}`}
                                  className="min-h-[32px] min-w-[32px] inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* EMPLOYEES TAB */}
      {activeTab === 'employees' && (
        <div className="space-y-5">
          {/* Add / Edit Employee Form */}
          {showEmployeeForm && (
            <form
              onSubmit={handleEmployeeSubmit}
              className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4"
            >
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {editingEmployeeId ? 'Edit Employee Profile' : 'Add Team Member'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Manage staff roles, payroll allocation, and task assignment eligibility
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowEmployeeForm(false);
                    resetEmployeeForm();
                  }}
                  className="text-xs font-medium text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
              </div>

              {empFormError && (
                <div
                  role="alert"
                  className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{empFormError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div>
                  <label htmlFor="empNameInput" className="block text-xs font-medium text-slate-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    id="empNameInput"
                    type="text"
                    value={empName}
                    onChange={(e) => setEmpName(e.target.value)}
                    placeholder="e.g. Priya Sharma"
                    maxLength={100}
                    required
                    className="w-full min-h-[38px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                <div>
                  <label htmlFor="empRoleInput" className="block text-xs font-medium text-slate-700 mb-1">
                    Role / Designation *
                  </label>
                  <input
                    id="empRoleInput"
                    type="text"
                    value={empRole}
                    onChange={(e) => setEmpRole(e.target.value)}
                    placeholder="e.g. Store Manager"
                    maxLength={80}
                    required
                    className="w-full min-h-[38px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                <div>
                  <label htmlFor="empDeptInput" className="block text-xs font-medium text-slate-700 mb-1">
                    Department (Optional)
                  </label>
                  <input
                    id="empDeptInput"
                    type="text"
                    value={empDepartment}
                    onChange={(e) => setEmpDepartment(e.target.value)}
                    placeholder="e.g. Sales & Billing"
                    maxLength={80}
                    className="w-full min-h-[38px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                <div>
                  <label htmlFor="empSalaryInput" className="block text-xs font-medium text-slate-700 mb-1">
                    Monthly Salary ({currencyMeta.code})
                  </label>
                  <input
                    id="empSalaryInput"
                    type="number"
                    min="0"
                    step="0.01"
                    value={empSalary}
                    onChange={(e) => setEmpSalary(e.target.value)}
                    placeholder="0"
                    className="w-full min-h-[38px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm font-mono-num text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                <div>
                  <label htmlFor="empPhoneInput" className="block text-xs font-medium text-slate-700 mb-1">
                    Phone (Optional)
                  </label>
                  <input
                    id="empPhoneInput"
                    type="tel"
                    value={empPhone}
                    onChange={(e) => setEmpPhone(e.target.value)}
                    placeholder="+91 98201 11223"
                    maxLength={20}
                    className="w-full min-h-[38px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm font-mono-num text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                <div>
                  <label htmlFor="empEmailInput" className="block text-xs font-medium text-slate-700 mb-1">
                    Email (Optional)
                  </label>
                  <input
                    id="empEmailInput"
                    type="email"
                    value={empEmail}
                    onChange={(e) => setEmpEmail(e.target.value)}
                    placeholder="staff@shop.in"
                    maxLength={160}
                    className="w-full min-h-[38px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                <div>
                  <label htmlFor="empStatusInput" className="block text-xs font-medium text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    id="empStatusInput"
                    value={empStatus}
                    onChange={(e) => setEmpStatus(e.target.value as EmployeeStatus)}
                    className="w-full min-h-[38px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    {EMPLOYEE_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="empJoinedInput" className="block text-xs font-medium text-slate-700 mb-1">
                    Joined Date (Optional)
                  </label>
                  <input
                    id="empJoinedInput"
                    type="date"
                    value={empJoinedDate}
                    onChange={(e) => setEmpJoinedDate(e.target.value)}
                    className="w-full min-h-[38px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEmployeeForm(false);
                    resetEmployeeForm();
                  }}
                  className="min-h-[38px] px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEmployee}
                  className="min-h-[38px] px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-xs font-semibold text-white inline-flex items-center gap-2"
                >
                  {isSavingEmployee && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {isSavingEmployee
                    ? 'Saving Employee...'
                    : editingEmployeeId
                      ? 'Update Employee'
                      : 'Save Employee'}
                </button>
              </div>
            </form>
          )}

          {/* Employee Directory Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Employee Directory</h2>
                <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                  {fmtNumber(employeeStats.activeCount, currency)} active ·{' '}
                  {fmtNumber(employeeStats.onLeave, currency)} on leave ·{' '}
                  {fmtNumber(employeeStats.total, currency)} total staff
                </p>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  placeholder="Search name, role, department..."
                  aria-label="Search employees"
                  className="w-full min-h-[38px] pl-9 pr-3 rounded-lg border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>

            {empTableError && (
              <div
                role="alert"
                className="m-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{empTableError}</span>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500">
                  <tr>
                    <th className="text-left py-3 px-4">Employee</th>
                    <th className="text-left py-3 px-4">Role &amp; Dept</th>
                    <th className="text-left py-3 px-4 whitespace-nowrap">Contact</th>
                    <th className="text-right py-3 px-4 whitespace-nowrap">Monthly Salary</th>
                    <th className="text-right py-3 px-4 whitespace-nowrap">Assigned Tasks</th>
                    <th className="text-left py-3 px-4 whitespace-nowrap">Status</th>
                    <th className="text-right py-3 px-4 whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 px-4">
                        <div className="max-w-md mx-auto space-y-2.5">
                          <div className="text-sm font-semibold text-slate-800">
                            {employees.length === 0
                              ? 'No employees added yet'
                              : 'No matching team members found'}
                          </div>
                          <p className="text-xs text-slate-500">
                            {employees.length === 0
                              ? 'Add your staff members to track roles, monthly payroll, and assign operational tasks.'
                              : 'Try clearing your search query to see all employees.'}
                          </p>
                          {employees.length === 0 && (
                            <div className="pt-1">
                              <button
                                type="button"
                                onClick={openNewEmployeeForm}
                                className="min-h-[36px] px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-xs font-semibold text-white inline-flex items-center gap-1.5"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                Add First Employee
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((emp) => {
                      const assignedCounts = tasksByEmployee.get(emp.id) || { open: 0, completed: 0 };
                      const isBusy = busyEmployeeId === emp.id;
                      const isConfirmingDelete = confirmDeleteEmployeeId === emp.id;
                      return (
                        <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="font-semibold text-slate-900">{emp.name}</div>
                            {emp.joinedDate && (
                              <div className="text-[11px] font-mono-num text-slate-400">
                                Joined {emp.joinedDate}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-700 whitespace-nowrap">
                            <span className="font-medium text-slate-900">{emp.role}</span>
                            {emp.department && (
                              <span className="text-slate-500"> · {emp.department}</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-600 whitespace-nowrap">
                            <div>{emp.phone || '—'}</div>
                            {emp.email && <div className="text-[11px] text-slate-400">{emp.email}</div>}
                          </td>
                          <td className="py-3 px-4 text-right font-mono-num font-semibold text-slate-900 whitespace-nowrap">
                            {fmtCurrency(emp.monthlySalary, currency)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono-num text-xs text-slate-600 whitespace-nowrap">
                            {assignedCounts.open} open · {assignedCounts.completed} done
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <select
                              aria-label={`Status for ${emp.name}`}
                              value={emp.status}
                              disabled={isBusy}
                              onChange={(e) =>
                                void handleEmployeeStatusChange(emp.id, e.target.value as EmployeeStatus)
                              }
                              className={`min-h-[32px] px-2.5 py-1 rounded-lg border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-60 ${EMPLOYEE_STATUS_COLOR[emp.status]}`}
                            >
                              {EMPLOYEE_STATUSES.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            {isConfirmingDelete ? (
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => void handleConfirmDeleteEmployee(emp.id)}
                                  className="min-h-[30px] px-2.5 rounded bg-rose-600 hover:bg-rose-700 text-xs font-semibold text-white"
                                >
                                  Delete
                                </button>
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => setConfirmDeleteEmployeeId(null)}
                                  className="min-h-[30px] px-2 rounded border border-slate-200 bg-white text-xs text-slate-600 hover:bg-slate-50"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => openEditEmployeeForm(emp)}
                                  aria-label={`Edit ${emp.name}`}
                                  className="min-h-[32px] min-w-[32px] inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-violet-700 hover:bg-violet-50 transition-colors"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteEmployeeId(emp.id)}
                                  aria-label={`Delete ${emp.name}`}
                                  className="min-h-[32px] min-w-[32px] inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
