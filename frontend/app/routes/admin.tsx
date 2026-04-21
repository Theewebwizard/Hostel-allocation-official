import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  Building2,
  Users,
  DoorOpen,
  Settings,
  Play,
  RefreshCw,
  Plus,
  Trash2,
  Save,
  X,
  Check,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Calendar,
  Edit2,
  Home,
  LogOut,
  ArrowLeftRight,
  Info,
  LayoutGrid,
  ClipboardCheck,
  UserMinus,
  Upload,
  History,
  RotateCcw,
} from "lucide-react";
import { Tooltip } from "react-tooltip";
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "~/components/ui";
import { useAuthStore } from "~/lib/auth-store";
import { RulesMatrix } from "~/components/admin/RulesMatrix";
import {
  adminApi,
  studentsApi,
  swapsApi,
  api,
  type DashboardStats,
  type Hostel,
  type Room,
  type AllocationRule,
  type AllocationRun,
  type AllocationResult,
  type SwapRequest,
  type SwapChain,
  type WingParticipationSetting,
  type AllocationPolicy,
  type Student,
  type AdministrativeAction,
} from "~/lib/api";

export function meta() {
  return [
    { title: "Admin Panel - Hostel Allocation System" },
    {
      name: "description",
      content: "Manage hostels, rooms, rules, and allocations",
    },
  ];
}

type ActiveSection =
  | "hostels"
  | "rooms"
  | "rules"
  | "students"
  | "groups"
  | "allocation"
  | "swaps"
  | "settings";

export default function AdminPage() {
  const navigate = useNavigate();
  const {
    user,
    isAuthenticated,
    checkAuth,
    isLoading: authLoading,
    logout,
  } = useAuthStore();

  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as ActiveSection) || "hostels";
  const [activeSection, setActiveSection] = useState<ActiveSection>(initialTab);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [hostelHierarchy, setHostelHierarchy] = useState<any[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [rules, setRules] = useState<AllocationRule[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [allocationRuns, setAllocationRuns] = useState<AllocationRun[]>([]);
  const [allocationResults, setAllocationResults] =
    useState<AllocationResult[]>([]);
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([]);
  const [swapChains, setSwapChains] = useState<SwapChain[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [wingSettings, setWingSettings] = useState<
    WingParticipationSetting[]
  >([]);
  const [viewingRunId, setViewingRunId] = useState<string | null>(null);
  const [adminActions, setAdminActions] = useState<AdministrativeAction[]>([]);
  const [revertingActionId, setRevertingActionId] = useState<string | null>(null);
  const [revertConfirmText, setRevertConfirmText] = useState("");
  const [isReverting, setIsReverting] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isPublishingRun, setIsPublishingRun] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Mid-Session Operations States
  const [isEvicting, setIsEvicting] = useState(false);
  const [evictionSummary, setEvictionSummary] = useState<any[] | null>(null);
  const [parsedRollNumbers, setParsedRollNumbers] = useState<string[]>([]);
  const [resetYear, setResetYear] = useState<string>("all");
  const [isResetting, setIsResetting] = useState(false);

  // Form visibility
  const [showHostelForm, setShowHostelForm] = useState(false);
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [showBulkRoomForm, setShowBulkRoomForm] = useState(false);
  const [showRuleForm, setShowRuleForm] = useState(false);

  // Edit states
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editedStudent, setEditedStudent] = useState<Partial<Student>>({});

  // Filter and pagination
  const [selectedHostelFilter, setSelectedHostelFilter] = useState<
    number | null
  >(null);
  const [visibleRoomsCount, setVisibleRoomsCount] = useState(50);
  const [visibleResultsCount, setVisibleResultsCount] = useState(30);

  // Additional Filters
  const [studentYearFilter, setStudentYearFilter] = useState<number | null>(null);
  const [studentProgramFilter, setStudentProgramFilter] = useState("");
  const [studentGenderFilter, setStudentGenderFilter] = useState("");
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [roomStatusFilter, setRoomStatusFilter] = useState("");

  // Allocation policy
  const [allocationPolicy, setAllocationPolicyState] =
    useState<AllocationPolicy>("group_based");
  const [savedAllocationPolicy, setSavedAllocationPolicy] =
    useState<AllocationPolicy>("group_based");
  const [isSavingPolicy, setIsSavingPolicy] = useState(false);

  // Application Control
  const [applicationsEnabled, setApplicationsEnabledState] = useState(true);
  const [savedApplicationsEnabled, setSavedApplicationsEnabled] =
    useState(true);
  const [isSavingAppStatus, setIsSavingAppStatus] = useState(false);

  // Form data
  const [hostelForm, setHostelForm] = useState({
    name: "",
    genderType: "male",
  });


  const happinessStats = useMemo(() => {
    const counts = { 100: 0, 60: 0, 50: 0, 30: 0, 0: 0 };
    allocationResults.forEach((r) => {
      const h = r.happiness;
      if (h === 100) counts[100]++;
      else if (h >= 60) counts[60]++;
      else if (h >= 50) counts[50]++;
      else if (h >= 30) counts[30]++;
      else counts[0]++;
    });

    return counts;
  }, [allocationResults]);

  const combinedResults = useMemo(() => {
    return allocationResults.map(r => ({
      ...r,
      isUnallocated: r.roomId === null || r.roomId === undefined || r.hostelName === "Unallocated"
    }));
  }, [allocationResults]);
  const [roomForm, setRoomForm] = useState({
    hostelId: 0,
    roomNumber: "",
    floor: 0,
    wing: "",
    capacity: 2,
    roomType: "double",
  });
  const [bulkRoomForm, setBulkRoomForm] = useState({
    hostelId: 0,
    wing: "",
    floor: 0,
    startRoomNumber: 101,
    count: 10,
    capacity: 2,
    roomType: "double",
  });
  const [ruleForm, setRuleForm] = useState({
    hostelId: null as number | null,
    year: null as number | null,
    roomType: "",
    isAllowed: true,
    priority: 0,
    description: "",
  });

  // Scheduling
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");

  // Allocation mode
  const [allocationMode, setAllocationMode] = useState<
    "group_based" | "fcfs" | "wing_fcfs"
  >("group_based");

  // Run Configuration Modal
  const [showRunModal, setShowRunModal] = useState(false);
  const [runConfig, setRunConfig] = useState<{
    targetYears: number[];
    targetPrograms: string[];
  }>({ targetYears: [], targetPrograms: [] });

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login");
    } else if (!authLoading && user?.role !== "warden") {
      navigate("/dashboard");
    }
  }, [isAuthenticated, authLoading, user, navigate]);

  useEffect(() => {
    if (isAuthenticated && user?.role === "warden") {
      loadAllData();
    }
  }, [isAuthenticated, user]);

  const loadAllData = async () => {
    setIsLoading(true);
    setError("");
    try {
      const [
        statsRes,
        hostelsRes,
        roomsRes,
        rulesRes,
        runsRes,
        studentsRes,
        swapsRes,
        cyclesRes,
        wingRes,
        policyRes,
        groupsRes,
        hierarchyRes,
        appStatusRes,
        actionsRes,
      ] = await Promise.all([
        adminApi.getDashboardStats(),
        adminApi.getAllHostels(),
        adminApi.getAllRooms(),
        adminApi.getAllRules(),
        adminApi.getAllocationRuns(),
        studentsApi.getAll().catch(() => ({ data: [] })),
        swapsApi.getAll().catch(() => ({ data: [] })),
        swapsApi.detectCycles().catch(() => ({ data: [] })),
        adminApi.getWingParticipationSettings().catch(() => ({ data: [] })),
        adminApi.getAllocationPolicy().catch(() => ({ data: { policy: "group_based" as AllocationPolicy } })),
        adminApi.getAllGroups().catch(() => ({ data: [] })),
        adminApi.getHostelHierarchy().catch(() => ({ data: [] })),
        adminApi.getApplicationsEnabled().catch(() => ({ data: { enabled: true } })),
        adminApi.getAdminActions().catch(() => ({ data: [] })),
      ]);
      setStats(statsRes.data);
      setHostels(hostelsRes.data);
      setHostelHierarchy(hierarchyRes.data || []);
      setRooms(roomsRes.data);
      setRules(rulesRes.data);
      setAllocationRuns(runsRes.data);
      setStudents(studentsRes.data || []);
      setSwapRequests(swapsRes.data || []);
      setSwapChains(cyclesRes.data || []);
      setWingSettings(wingRes.data || []);
      setAllocationPolicyState(policyRes.data.policy || "group_based");
      setSavedAllocationPolicy(policyRes.data.policy || "group_based");
      setApplicationsEnabledState(appStatusRes.data.enabled ?? true);
      setSavedApplicationsEnabled(appStatusRes.data.enabled ?? true);
      setGroups(groupsRes.data || []);
      setAdminActions(actionsRes.data || []);
    } catch (err: any) {
      if (err.response?.status !== 401) {
        setError("Failed to load data. Make sure the backend is running.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // CRUD handlers for Hostels
  const handleCreateHostel = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      await adminApi.createHostel(hostelForm);
      setSuccess("Hostel created successfully");
      setShowHostelForm(false);
      setHostelForm({ name: "", genderType: "male" });
      loadAllData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create hostel");
    }
  };

  const handleDeleteHostel = async (id: number) => {
    if (!confirm("Delete this hostel?")) return;
    try {
      await adminApi.deleteHostel(id);
      setSuccess("Hostel deleted");
      loadAllData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to delete hostel");
    }
  };

  // CRUD handlers for Rooms
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      await adminApi.createRoom(roomForm);
      setSuccess("Room created successfully");
      setShowRoomForm(false);
      setRoomForm({
        hostelId: 0,
        roomNumber: "",
        floor: 0,
        wing: "",
        capacity: 2,
        roomType: "double",
      });
      loadAllData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create room");
    }
  };

  const handleBulkCreateRooms = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      await adminApi.bulkCreateRooms(bulkRoomForm);
      setSuccess(`Created ${bulkRoomForm.count} rooms successfully`);
      setShowBulkRoomForm(false);
      loadAllData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create rooms");
    }
  };

  const handleDeleteRoom = async (id: number) => {
    if (!confirm("Delete this room?")) return;
    try {
      await adminApi.deleteRoom(id);
      loadAllData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to delete room");
    }
  };

  // CRUD handlers for Rules
  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      await adminApi.createRule({
        ...ruleForm,
        hostelId: ruleForm.hostelId || undefined,
        year: ruleForm.year || undefined,
        roomType: ruleForm.roomType || undefined,
      });
      setSuccess("Rule created successfully");
      setShowRuleForm(false);
      setRuleForm({
        hostelId: null,
        year: null,
        roomType: "",
        isAllowed: true,
        priority: 0,
        description: "",
      });
      loadAllData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create rule");
    }
  };

  const handleDeleteRule = async (id: number) => {
    if (!confirm("Delete this rule?")) return;
    try {
      await adminApi.deleteRule(id);
      loadAllData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to delete rule");
    }
  };

  // Student editing
  const handleEditStudent = (student: Student) => {
    setEditingStudentId(student.userId);
    setEditedStudent({ ...student });
  };

  const handleSaveStudent = async () => {
    if (!editingStudentId) return;
    setError("");
    setSuccess("");
    try {
      // Call API to update student
      await studentsApi.update(editingStudentId, editedStudent);
      setSuccess("Student updated successfully");
      setEditingStudentId(null);
      setEditedStudent({});
      loadAllData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update student");
    }
  };

  const handleCancelEdit = () => {
    setEditingStudentId(null);
    setEditedStudent({});
  };

  // Allocation
  const handleRunAllocation = async (config?: { targetYears: number[]; targetPrograms: string[] }) => {
    setShowRunModal(false);
    setError("");
    setSuccess("");
    try {
      const payload: { allocationMode: typeof allocationMode; targetYears?: number[]; targetPrograms?: string[] } = {
        allocationMode,
        ...(config?.targetYears?.length ? { targetYears: config.targetYears } : {}),
        ...(config?.targetPrograms?.length ? { targetPrograms: config.targetPrograms } : {}),
      };
      const res = await adminApi.triggerAllocation(payload);
      setSuccess("Allocation started! Polling for results...");
      loadAllData();
      pollAllocationStatus(res.data.id);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to start allocation");
    }
  };

  const handlePublishAndCommit = async (runId: string) => {
    if (
      !confirm(
        "Publish & Commit this allocation?\n\nThis will:\n1. Finalize the results (visible to students)\n2. Lock the room assignments (protected from future runs)\n3. Commit rooms and update student profiles.\n\nAre you sure?"
      )
    )
      return;

    setIsPublishingRun(runId);
    setError("");
    setSuccess("");
    try {
      const res = await adminApi.publishAndCommitRun(runId);
      setSuccess(
        `Allocation published! ${res.data.count} students have been assigned to their rooms.`
      );
      loadAllData();
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to publish and commit allocation"
      );
    } finally {
      setIsPublishingRun(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      // Parse CSV: split by newlines, then by common separators, take first column, filter out header/empty
      const lines = text.split(/\r?\n/);
      const rollNumbers = lines
        .map(line => {
          // Support multiple separators: comma, pipe, tab, semicolon
          const separators = [',', '|', '\t', ';'];
          let firstCol = line;
          
          for (const sep of separators) {
            if (line.includes(sep)) {
              firstCol = line.split(sep)[0];
              break;
            }
          }
          
          return firstCol ? firstCol.replace(/['"]+/g, '').trim() : '';
        })
        .filter(rn => {
          if (!rn) return false;
          const lower = rn.toLowerCase();
          return lower !== 'roll number' && lower !== 'rollnumber' && lower !== 'roll_number';
        });
      
      setParsedRollNumbers([...new Set(rollNumbers)]); // Use Set to avoid duplicates
      setEvictionSummary(null); // Clear previous summary when new file loaded
    };
    reader.readAsText(file);
  };

  const handleBulkEvict = async () => {
    if (parsedRollNumbers.length === 0) {
      setError("Please upload a CSV with roll numbers first.");
      return;
    }

    if (!confirm(`Are you sure you want to evict ${parsedRollNumbers.length} students?\n\nThis will permanently remove their room assignments and free up the beds.`)) {
      return;
    }

    setIsEvicting(true);
    setError("");
    setSuccess("");
    try {
      const res = await adminApi.bulkEvictStudents(parsedRollNumbers);
      setSuccess(res.data.message);
      setEvictionSummary(res.data.summary);
      setParsedRollNumbers([]); // Clear after success
      loadAllData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to evict students");
    } finally {
      setIsEvicting(false);
    }
  };

  const handleResetStatus = async () => {
    const yearLabel = resetYear === "all" ? "all students" : `Year ${resetYear} students`;
    if (!confirm(`This will allow ${yearLabel} to submit new applications. Are you sure?`)) {
      return;
    }

    setIsResetting(true);
    setError("");
    setSuccess("");
    try {
      const year = resetYear === "all" ? undefined : parseInt(resetYear);
      const res = await adminApi.resetApplicationStatus(year);
      setSuccess(res.data.message);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to reset status");
    } finally {
      setIsResetting(false);
    }
  };

  const handleRollback = async () => {
    if (revertConfirmText !== "REVERT") {
      setError("Please type 'REVERT' to confirm the rollback.");
      return;
    }

    if (!revertingActionId) return;

    setIsReverting(true);
    setError("");
    try {
      await adminApi.rollbackAction(revertingActionId);
      setSuccess("Action rolled back successfully!");
      setRevertingActionId(null);
      setRevertConfirmText("");
      loadAllData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to rollback action.");
    } finally {
      setIsReverting(false);
    }
  };

  const pollAllocationStatus = async (runId: string) => {
    const checkStatus = async () => {
      try {
        const res = await adminApi.getAllocationRun(runId);
        if (res.data.status === "completed") {
          setSuccess("Allocation completed successfully!");
          const resultsRes = await adminApi.getAllocationResults(runId);
          setAllocationResults(resultsRes.data || []);
          loadAllData();
        } else if (res.data.status === "failed") {
          setError(
            "Allocation failed: " + (res.data.errorMessage || "Unknown error")
          );
          loadAllData();
        } else {
          setTimeout(checkStatus, 3000);
        }
      } catch (err) {
        console.error("Error polling status:", err);
      }
    };
    setTimeout(checkStatus, 2000);
  };

  const handleViewResults = async (runId: string) => {
    try {
      const res = await adminApi.getAllocationResults(runId);
      setAllocationResults(res.data);
      setViewingRunId(runId);
      setVisibleResultsCount(30); // Reset the pagination count when viewing new results
      loadAllData(); // Refresh run data to get the latest total/allocated counts
    } catch (err) {
      console.error("Failed to fetch results", err);
    }
  };

  const handleDeleteRun = async (runId: string) => {
    if (!confirm("Are you sure you want to delete this allocation run? This will permanently remove all assignments associated with it.")) {
      return;
    }

    try {
      await adminApi.deleteAllocationRun(runId);
      setSuccess("Allocation run deleted successfully.");
      loadAllData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to delete allocation run");
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const filteredRooms = rooms.filter((r) => {
    const matchesHostel = !selectedHostelFilter || r.hostelId === selectedHostelFilter;
    const matchesStatus = !roomStatusFilter || r.status === roomStatusFilter;
    return matchesHostel && matchesStatus;
  });

  const filteredStudents = students.filter((s) => {
    const matchesYear = !studentYearFilter || s.year === studentYearFilter;
    const matchesProgram =
      !studentProgramFilter || s.program === studentProgramFilter;
    const matchesGender =
      !studentGenderFilter || s.gender === studentGenderFilter;
    const matchesSearch =
      !studentSearchQuery ||
      s.rollNumber.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
      s.fullName.toLowerCase().includes(studentSearchQuery.toLowerCase());
    return matchesYear && matchesProgram && matchesGender && matchesSearch;
  });

  const sidebarItems = [
    { id: "hostels", label: "Hostels", icon: Building2, count: hostels.length },
    { id: "rooms", label: "Rooms", icon: DoorOpen, count: rooms.length },
    { id: "rules", label: "Rules", icon: Settings, count: rules.length },
    { id: "students", label: "Students", icon: Users, count: students.length },
    { id: "groups", label: "Groups", icon: Users, count: groups.length },
    { id: "allocation", label: "Allocation", icon: Play },
    {
      id: "swaps",
      label: "Room Swaps",
      icon: ArrowLeftRight,
      count: swapRequests.filter(
        (s) => s.status === "pending" || s.status === "accepted",
      ).length,
    },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <>
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-slate-200">
          <h1 className="text-xl font-bold text-slate-900">Admin Panel</h1>
          <p className="text-sm font-medium text-slate-600 mt-1">Hostel Management</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id as ActiveSection)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-colors ${
                activeSection === item.id
                  ? "bg-indigo-50 text-indigo-700 font-bold border-r-4 border-indigo-600 rounded-r-none"
                  : "text-slate-700 hover:bg-slate-50 font-medium"
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </div>
              {item.count !== undefined && (
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    activeSection === item.id
                      ? "bg-indigo-200 text-indigo-900"
                      : "bg-slate-200 text-slate-800"
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200 space-y-2">
          <Button onClick={loadAllData} variant="outline" className="w-full">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Data
          </Button>
          <button
            onClick={() => navigate("/dashboard")}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg"
          >
            <Home className="w-4 h-4" />
            Back to Dashboard
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {/* Messages */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
              <XCircle className="w-5 h-5 shrink-0" />
              <span className="flex-1">{error}</span>
              <button onClick={() => setError("")}>
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3 text-green-700">
              <CheckCircle className="w-5 h-5 shrink-0" />
              <span className="flex-1">{success}</span>
              <button onClick={() => setSuccess("")}>
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* HOSTELS SECTION */}
          {activeSection === "hostels" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Hostels</h2>
                  <p className="text-slate-600">Manage hostel buildings</p>
                </div>
                <Button onClick={() => setShowHostelForm(!showHostelForm)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Hostel
                </Button>
              </div>

              {showHostelForm && (
                <Card>
                  <CardContent className="pt-6">
                    <form
                      onSubmit={handleCreateHostel}
                      className="flex gap-4 items-end flex-wrap"
                    >
                      <div className="flex-1 min-w-50">
                        <label className="block text-sm font-medium mb-1">
                          Hostel Name
                        </label>
                        <Input
                          placeholder="e.g., BH-1, GH-1"
                          value={hostelForm.name}
                          onChange={(e) =>
                            setHostelForm({
                              ...hostelForm,
                              name: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                      <div className="w-40">
                        <label className="block text-sm font-semibold text-slate-700 mb-1">
                          Gender Type
                        </label>
                        <select
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500"
                          value={hostelForm.genderType}
                          onChange={(e) =>
                            setHostelForm({
                              ...hostelForm,
                              genderType: e.target.value as any,
                            })
                          }
                        >
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="co-ed">Co-ed</option>
                        </select>
                      </div>
                      <Button type="submit">Create</Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowHostelForm(false)}
                      >
                        Cancel
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {hostelHierarchy.map((hostel) => (
                  <Card
                    key={hostel.id}
                    className="hover:shadow-md transition-all border-slate-200 "
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2 text-slate-900 ">
                            <Building2 className="w-5 h-5 text-indigo-600" />
                            {hostel.name}
                          </CardTitle>
                          <CardDescription className="text-slate-500 ">
                            Gender: {hostel.genderType}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedHostelFilter(hostel.id);
                              setActiveSection("rooms");
                            }}
                          >
                            View Rooms
                          </Button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteHostel(hostel.id);
                            }}
                            className="text-red-500 hover:bg-red-50  p-2 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <p className="text-sm font-bold text-slate-700  flex items-center gap-2">
                          <LayoutGrid className="w-4 h-4" />
                          Floors: {hostel.floors?.length || 0}
                        </p>
                        <div className="space-y-3">
                          {hostel.floors?.map((floor: any) => (
                            <div
                              key={floor.floor}
                              className="p-3 bg-slate-50  rounded-lg border border-slate-100 "
                            >
                              <p className="font-bold text-slate-900  text-sm mb-2">
                                Floor {floor.floor}
                              </p>
                              <div className="grid grid-cols-1 gap-2">
                                {floor.wings.map((wing: any, idx: number) => (
                                  <div
                                    key={idx}
                                    className="flex items-center justify-between text-xs p-2 bg-white  rounded border border-slate-100 "
                                  >
                                    <span className="font-medium text-slate-700 ">
                                      Wing {wing.wing}
                                    </span>
                                    <span className="text-slate-500  font-medium">
                                      {wing.roomCount} rooms • {wing.capacityType}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {hostelHierarchy.length === 0 && (
                  <div className="col-span-full text-center py-12 text-gray-500  bg-white  rounded-lg border border-dashed ">
                    <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300 " />
                    <p>No hostels yet. Click "Add Hostel" to create one.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ROOMS SECTION */}
          {activeSection === "rooms" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Rooms</h2>
                  <p className="text-slate-600">Manage room inventory</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowBulkRoomForm(!showBulkRoomForm)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Bulk Add
                  </Button>
                  <Button onClick={() => setShowRoomForm(!showRoomForm)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Room
                  </Button>
                </div>
              </div>

              {/* Filter */}
              <div className="flex items-center gap-4 bg-white p-4 rounded-lg border">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-semibold text-slate-700">
                    Hostel:
                  </label>
                  <select
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500"
                    value={selectedHostelFilter || ""}
                    onChange={(e) =>
                      setSelectedHostelFilter(
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                  >
                    <option value="">All Hostels</option>
                    {hostels.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-semibold text-slate-700">
                    Status:
                  </label>
                  <select
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500"
                    value={roomStatusFilter}
                    onChange={(e) => setRoomStatusFilter(e.target.value)}
                  >
                    <option value="">All Statuses</option>
                    <option value="available">Available</option>
                    <option value="occupied">Occupied</option>
                  </select>
                </div>
                <span className="ml-auto text-sm font-medium text-slate-600">
                  Showing {filteredRooms.length} rooms
                </span>
              </div>

              {showRoomForm && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Add Single Room</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form
                      onSubmit={handleCreateRoom}
                      className="grid grid-cols-2 md:grid-cols-4 gap-4"
                    >
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">
                          Hostel *
                        </label>
                        <select
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500"
                          value={roomForm.hostelId}
                          onChange={(e) =>
                            setRoomForm({
                              ...roomForm,
                              hostelId: Number(e.target.value),
                            })
                          }
                          required
                        >
                          <option value={0}>Select Hostel</option>
                          {hostels.map((h) => (
                            <option key={h.id} value={h.id}>
                              {h.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Room Number *
                        </label>
                        <Input
                          placeholder="e.g., 101"
                          value={roomForm.roomNumber}
                          onChange={(e) =>
                            setRoomForm({
                              ...roomForm,
                              roomNumber: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Wing
                        </label>
                        <Input
                          placeholder="e.g., A, B"
                          value={roomForm.wing}
                          onChange={(e) =>
                            setRoomForm({ ...roomForm, wing: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Floor
                        </label>
                        <Input
                          type="number"
                          value={roomForm.floor}
                          onChange={(e) =>
                            setRoomForm({
                              ...roomForm,
                              floor: Number(e.target.value),
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Capacity
                        </label>
                        <Input
                          type="number"
                          min={1}
                          value={roomForm.capacity}
                          onChange={(e) =>
                            setRoomForm({
                              ...roomForm,
                              capacity: Number(e.target.value),
                            })
                          }
                        />
                      </div>
                      <div className="col-span-2 flex items-end gap-2">
                        <Button type="submit">Create Room</Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowRoomForm(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              {showBulkRoomForm && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Bulk Create Rooms
                    </CardTitle>
                    <CardDescription>
                      Create multiple rooms at once
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form
                      onSubmit={handleBulkCreateRooms}
                      className="grid grid-cols-2 md:grid-cols-4 gap-4"
                    >
                      <div>
                        <label className="block text-sm font-semibold text-slate-700  mb-1">
                          Hostel *
                        </label>
                        <select
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white  text-slate-900  focus:ring-2 focus:ring-indigo-500"
                          value={bulkRoomForm.hostelId || ""}
                          onChange={(e) =>
                            setBulkRoomForm({
                              ...bulkRoomForm,
                              hostelId: Number(e.target.value),
                            })
                          }
                          required
                        >
                          <option value="">Select Hostel</option>
                          {hostels.map((h) => (
                            <option key={h.id} value={h.id}>
                              {h.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700  mb-1">
                          Wing
                        </label>
                        <Input
                          placeholder="e.g., A"
                          value={bulkRoomForm.wing}
                          onChange={(e) =>
                            setBulkRoomForm({
                              ...bulkRoomForm,
                              wing: e.target.value,
                            })
                          }
                          className=" "
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700  mb-1">
                          Floor
                        </label>
                        <Input
                          type="number"
                          value={bulkRoomForm.floor}
                          onChange={(e) =>
                            setBulkRoomForm({
                              ...bulkRoomForm,
                              floor: Number(e.target.value),
                            })
                          }
                          className=" "
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700  mb-1">
                          Start Room #
                        </label>
                        <Input
                          type="number"
                          value={bulkRoomForm.startRoomNumber}
                          onChange={(e) =>
                            setBulkRoomForm({
                              ...bulkRoomForm,
                              startRoomNumber: Number(e.target.value),
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Number of Rooms
                        </label>
                        <Input
                          type="number"
                          min={1}
                          value={bulkRoomForm.count}
                          onChange={(e) =>
                            setBulkRoomForm({
                              ...bulkRoomForm,
                              count: Number(e.target.value),
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Capacity Each
                        </label>
                        <Input
                          type="number"
                          min={1}
                          value={bulkRoomForm.capacity}
                          onChange={(e) =>
                            setBulkRoomForm({
                              ...bulkRoomForm,
                              capacity: Number(e.target.value),
                            })
                          }
                        />
                      </div>
                      <div className="col-span-2 flex items-end gap-2">
                        <Button type="submit">
                          Create {bulkRoomForm.count} Rooms
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowBulkRoomForm(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              {/* Rooms Table */}
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                            Room #
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                            Hostel
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                            Wing
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                            Floor
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                            Capacity
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                            Status
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {filteredRooms.slice(0, visibleRoomsCount).map((room) => (
                          <tr key={room.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
                            <td className="px-4 py-3 font-semibold text-slate-900">
                              {room.roomNumber}
                            </td>
                            <td className="px-4 py-3 text-slate-800">
                              {hostels.find((h) => h.id === room.hostelId)
                                ?.name || "-"}
                            </td>
                            <td className="px-4 py-3 text-slate-700">{room.wing || "-"}</td>
                            <td className="px-4 py-3 text-slate-700">{room.floor ?? "-"}</td>
                            <td className="px-4 py-3 text-slate-700">{room.capacity}</td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-1 text-xs font-semibold rounded-full border ${
                                  room.status === "available"
                                    ? "bg-green-50 text-green-700 border-green-200"
                                    : "bg-yellow-50 text-yellow-700 border-yellow-200"
                                }`}
                              >
                                {room.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => handleDeleteRoom(room.id)}
                                className="text-red-500 hover:bg-red-50 p-1 rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {filteredRooms.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      <DoorOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No rooms found. Add rooms to get started.</p>
                    </div>
                  )}
                  {filteredRooms.length > visibleRoomsCount && (
                    <div className="p-4 border-t text-center">
                      <p className="text-sm text-gray-500 mb-2">
                        Showing first {visibleRoomsCount} of {filteredRooms.length} rooms
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => setVisibleRoomsCount(prev => prev + 50)}
                      >
                        Load More
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* RULES SECTION */}
          {activeSection === "rules" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">
                    Allocation Eligibility
                  </h2>
                  <p className="text-slate-500 font-medium">
                    Simplified management of hostel-year restrictions
                  </p>
                </div>
              </div>

              <RulesMatrix 
                hostels={hostels} 
                onSuccess={(msg) => setSuccess(msg)}
                onError={(msg) => setError(msg)}
              />
            </div>
          )}

          {/* STUDENTS SECTION */}
          {activeSection === "students" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Students</h2>
                  <p className="text-slate-600 font-medium">
                    View and edit student information
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded-lg shadow-sm border">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Search Roll # or Name</label>
                  <Input
                    placeholder="Search..."
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                    className="h-9 text-slate-900 bg-white border-slate-300 focus:border-indigo-500 placeholder:text-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Year</label>
                  <select
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm h-9 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500"
                    value={studentYearFilter || ""}
                    onChange={(e) => setStudentYearFilter(e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">All Years</option>
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Program</label>
                  <select
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm h-9 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500"
                    value={studentProgramFilter}
                    onChange={(e) => setStudentProgramFilter(e.target.value)}
                  >
                    <option value="">All Programs</option>
                    <option value="CSE">CSE</option>
                    <option value="ECE">ECE</option>
                    <option value="CCE">CCE</option>
                    <option value="ME">ME</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Gender</label>
                  <select
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm h-9 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500"
                    value={studentGenderFilter}
                    onChange={(e) => setStudentGenderFilter(e.target.value)}
                  >
                    <option value="">All Genders</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              </div>

              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                            Roll Number
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                            Name
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                            Year
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                            Program
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                            Gender
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                            Status
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                            Actions
                          </th>
                        </tr>
                      </thead>
                              <tbody className="divide-y divide-slate-100">
                                {filteredStudents.map((student) => (
                                  <tr key={student.userId} className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
                                    {editingStudentId === student.userId ? (
                                      <>
                                        <td className="px-4 py-2">
                                          <Input
                                            value={editedStudent.rollNumber || ""}
                                            onChange={(e) =>
                                              setEditedStudent({
                                                ...editedStudent,
                                                rollNumber: e.target.value,
                                              })
                                            }
                                            className="h-8 text-sm text-slate-900 bg-white"
                                          />
                                        </td>
                                        <td className="px-4 py-2">
                                          <Input
                                            value={editedStudent.fullName || ""}
                                            onChange={(e) =>
                                              setEditedStudent({
                                                ...editedStudent,
                                                fullName: e.target.value,
                                              })
                                            }
                                            className="h-8 text-sm text-slate-900 bg-white"
                                          />
                                        </td>
                                        <td className="px-4 py-2">
                                          <select
                                            className="w-full px-2 py-1 border rounded text-sm text-slate-900 bg-white"
                                            value={editedStudent.year || 1}
                                            onChange={(e) =>
                                              setEditedStudent({
                                                ...editedStudent,
                                                year: Number(e.target.value),
                                              })
                                            }
                                          >
                                            {[1, 2, 3, 4].map((y) => (
                                              <option key={y} value={y}>
                                                {y}
                                              </option>
                                            ))}
                                          </select>
                                        </td>
                                        <td className="px-4 py-2">
                                          <select
                                            className="w-full px-2 py-1 border rounded text-sm text-slate-900 bg-white"
                                            value={editedStudent.program || ""}
                                            onChange={(e) =>
                                              setEditedStudent({
                                                ...editedStudent,
                                                program: e.target.value,
                                              })
                                            }
                                          >
                                            <option value="CSE">CSE</option>
                                            <option value="ECE">ECE</option>
                                            <option value="CCE">CCE</option>
                                            <option value="ME">ME</option>
                                          </select>
                                        </td>
                                        <td className="px-4 py-2">
                                          <select
                                            className="w-full px-2 py-1 border rounded text-sm text-slate-900 bg-white"
                                            value={editedStudent.gender || "male"}
                                            onChange={(e) =>
                                              setEditedStudent({
                                                ...editedStudent,
                                                gender: e.target.value as "male" | "female",
                                              })
                                            }
                                          >
                                            <option value="male">Male</option>
                                            <option value="female">Female</option>
                                          </select>
                                        </td>
                                        <td className="px-4 py-2">
                                          <div className="flex gap-1">
                                            <button
                                              onClick={handleSaveStudent}
                                              className="text-green-600 hover:bg-green-50 p-1 rounded"
                                            >
                                              <Save className="w-4 h-4" />
                                            </button>
                                            <button
                                              onClick={handleCancelEdit}
                                              className="text-slate-500 hover:bg-slate-100 p-1 rounded"
                                            >
                                              <X className="w-4 h-4" />
                                            </button>
                                          </div>
                                        </td>
                                      </>
                                    ) : (
                                      <>
                                        <td className="px-4 py-3 font-semibold text-slate-900">
                                          {student.rollNumber}
                                        </td>
                                        <td className="px-4 py-3 text-slate-800">
                                          {student.fullName}
                                        </td>
                                        <td className="px-4 py-3 text-slate-700">{student.year}</td>
                                        <td className="px-4 py-3 text-slate-700">{student.program}</td>
                                        <td className="px-4 py-3">
                                          <span
                                            className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                              student.gender === "male"
                                                ? "bg-blue-100 text-blue-700 border border-blue-200"
                                                : "bg-pink-100 text-pink-700 border border-pink-200"
                                            }`}
                                          >
                                            {student.gender}
                                          </span>
                                        </td>
                                        <td className="px-4 py-3">
                                          <span
                                            className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                              student.applicationStatus === "EVICTED"
                                                ? "bg-red-100 text-red-700 border border-red-200"
                                                : student.hasSubmitted
                                                ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                                : "bg-slate-100 text-slate-600 border border-slate-200"
                                            }`}
                                          >
                                            {student.applicationStatus === "EVICTED" ? "Evicted" : student.hasSubmitted ? "Applied" : "Not Applied"}
                                          </span>
                                        </td>
                                <td className="px-4 py-3">
                                  <button
                                    onClick={() => handleEditStudent(student)}
                                    className="text-indigo-600 hover:bg-indigo-50 p-1 rounded"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {students.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No students registered yet.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* GROUPS SECTION */}
          {activeSection === "groups" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Student Groups
                  </h2>
                  <p className="text-gray-500">
                    View all registered friend groups
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {groups.map((group) => (
                  <Card
                    key={group.id}
                    className="hover:shadow-md transition-shadow border-indigo-100"
                  >
                    <CardHeader className="pb-3 bg-indigo-50/50">
                      <CardTitle className="flex items-center justify-between text-lg">
                        <span className="flex items-center gap-2">
                          <Users className="w-5 h-5 text-indigo-600" />
                          {group.name}
                        </span>
                        <span className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full">
                          ID: {group.id}
                        </span>
                      </CardTitle>
                      <CardDescription>
                        {group.members?.length || 0} Members Confirmed
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="space-y-2">
                        {group.members?.map((member: any, idx: number) => (
                          <div
                            key={idx}
                            className="flex justify-between items-center p-2 bg-gray-50 rounded-lg border border-gray-100"
                          >
                            <div>
                              <p className="text-sm font-semibold text-gray-900">
                                {member.fullName}
                              </p>
                              <p className="text-xs text-gray-500">
                                {member.rollNumber} • {member.program}
                              </p>
                            </div>
                            <span className="text-xs px-2 py-1 bg-white border border-gray-200 text-gray-600 rounded shadow-xs">
                              Year {member.year}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {groups.length === 0 && (
                  <div className="col-span-full text-center py-12 text-gray-500 bg-white rounded-lg border border-dashed">
                    <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No groups have been formed yet.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ALLOCATION SECTION */}
          {activeSection === "allocation" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Allocation
                  </h2>
                  <p className="text-gray-500">
                    Run and manage room allocations
                  </p>
                </div>
              </div>

              {/* Run Allocation Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Play className="w-5 h-5 text-green-600" />
                    Run Allocation
                  </CardTitle>
                  <CardDescription>
                    Execute the allocation algorithm to assign students to rooms
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-500">Total Students</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {stats?.totalStudents || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">
                        Students in Groups
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {stats?.studentsInGroups || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Available Beds</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {stats?.totalBeds || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Active Rules</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {stats?.totalRules || 0}
                      </p>
                    </div>
                  </div>

                  {/* Schedule Option */}
                  <div className="p-4 border rounded-lg bg-white">
                    <h4 className="font-medium text-slate-700 mb-3 flex items-center gap-2">
                      <Calendar className="w-4 text-slate-700 h-4" />
                      Schedule Allocation (Optional)
                    </h4>
                    <div className="flex items-end gap-4 flex-wrap">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">
                          Date
                        </label>
                        <Input
                          type="date"
                          value={scheduleDate}
                          onChange={(e) => setScheduleDate(e.target.value)}
                          className="w-40 text-slate-900 bg-white border-slate-300"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">
                          Time
                        </label>
                        <Input
                          type="time"
                          value={scheduleTime}
                          onChange={(e) => setScheduleTime(e.target.value)}
                          className="w-32 text-slate-900 bg-white border-slate-300"
                        />
                      </div>
                      <Button
                        variant="outline"
                        disabled={!scheduleDate || !scheduleTime}
                      >
                        <Clock className="w-4 h-4 mr-2" />
                        Schedule
                      </Button>
                    </div>
                  </div>

                  {/* Allocation Mode Selector */}
                  <div className="p-4 border rounded-lg bg-white border-slate-200">
                    <h4 className="font-bold text-slate-800 mb-3">Allocation Mode</h4>
                    <select
                      value={allocationMode}
                      onChange={(e) =>
                        setAllocationMode(
                          e.target.value as "group_based" | "fcfs",
                        )
                      }
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="group_based">
                        Group-Based Optimization (Default)
                      </option>
                      <option value="fcfs">
                        First-Come-First-Serve (FCFS)
                      </option>
                      <option value="wing_fcfs">
                        Wing FCFS (Groups by Earliest Timestamp)
                      </option>
                    </select>
                    <p className="text-sm text-gray-600 mt-2">
                      {allocationMode === "fcfs"
                        ? "⏱️ Students allocated strictly by application timestamp, ignoring groups."
                        : allocationMode === "wing_fcfs"
                          ? "🏠 Groups allocated in FCFS order by their earliest member timestamp. Members placed in the same physical wing when possible."
                          : "👥 Groups optimized for proximity and cohesion. Students allocated together when possible."}
                    </p>
                  </div>

                  {/* Run Now Button */}
                  <Button
                    onClick={() => {
                      setRunConfig({ targetYears: [], targetPrograms: [] });
                      setShowRunModal(true);
                    }}
                    className="w-full"
                    size="lg"
                    disabled={allocationRuns.some(r => !r.finalized && (r.status === 'completed' || r.status === 'running' || r.status === 'queued'))}
                  >
                    <Play className="w-5 h-5 mr-2" />
                    Configure & Run Allocation
                  </Button>

                  {/* Run Configuration Modal */}
                  {showRunModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-4">
                          <h3 className="text-lg font-bold text-white">Configure Allocation Run</h3>
                          <p className="text-indigo-200 text-sm">Mode: <span className="font-semibold capitalize">{allocationMode.replace('_', ' ')}</span></p>
                        </div>
                        <div className="p-6 space-y-5">
                          {/* Info banner */}
                          <div className="flex gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
                            <Info className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>Only the selected cohort will be allocated into available beds. <strong>Locked allocations from previous finalized runs will not be affected.</strong> Leave all unchecked to run for the entire campus.</span>
                          </div>

                          {/* Target Years */}
                          <div>
                            <p className="text-sm font-semibold text-slate-700 mb-2">Target Years <span className="font-normal text-slate-400">(empty = all years)</span></p>
                            <div className="grid grid-cols-4 gap-2">
                              {[1, 2, 3, 4].map((yr) => (
                                <label key={yr} className="flex items-center gap-2 cursor-pointer p-2 border rounded-lg hover:bg-indigo-50 transition-colors">
                                  <input
                                    type="checkbox"
                                    checked={runConfig.targetYears.includes(yr)}
                                    onChange={(e) => {
                                      setRunConfig(prev => ({
                                        ...prev,
                                        targetYears: e.target.checked
                                          ? [...prev.targetYears, yr]
                                          : prev.targetYears.filter(y => y !== yr)
                                      }));
                                    }}
                                    className="accent-indigo-600"
                                  />
                                  <span className="text-sm font-medium text-slate-700">Year {yr}</span>
                                </label>
                              ))}
                            </div>
                          </div>

                          {/* Target Programs */}
                          <div>
                            <p className="text-sm font-semibold text-slate-700 mb-2">Target Programs <span className="font-normal text-slate-400">(empty = all programs)</span></p>
                            <div className="grid grid-cols-2 gap-2">
                              {Array.from(new Set(students.map(s => s.program).filter(Boolean))).sort().map((prog) => (
                                <label key={prog} className="flex items-center gap-2 cursor-pointer p-2 border rounded-lg hover:bg-indigo-50 transition-colors">
                                  <input
                                    type="checkbox"
                                    checked={runConfig.targetPrograms.includes(prog!)}
                                    onChange={(e) => {
                                      setRunConfig(prev => ({
                                        ...prev,
                                        targetPrograms: e.target.checked
                                          ? [...prev.targetPrograms, prog!]
                                          : prev.targetPrograms.filter(p => p !== prog)
                                      }));
                                    }}
                                    className="accent-indigo-600"
                                  />
                                  <span className="text-sm font-medium text-slate-700">{prog}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="border-t px-6 py-4 flex justify-between items-center gap-3">
                          <Button variant="outline" onClick={() => setShowRunModal(false)}>Cancel</Button>
                          <Button onClick={() => handleRunAllocation(runConfig)} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                            <Play className="w-4 h-4 mr-2" />
                            {runConfig.targetYears.length === 0 && runConfig.targetPrograms.length === 0
                              ? "Run Full Campus Allocation"
                              : `Run for ${[
                                  runConfig.targetYears.length ? `Year ${runConfig.targetYears.join(', ')}` : null,
                                  runConfig.targetPrograms.length ? runConfig.targetPrograms.join(', ') : null
                                ].filter(Boolean).join(' · ')}`
                            }
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Allocation History */}
              <Card>
                <CardHeader>
                  <CardTitle>Allocation History</CardTitle>
                  <CardDescription>Previous allocation runs</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {allocationRuns.map((run) => (
                      <div
                        key={run.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-4">
                          {run.status === "completed" && (
                            <CheckCircle className="w-6 h-6 text-green-500" />
                          )}
                          {run.status === "running" && (
                            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                          )}
                          {run.status === "failed" && (
                            <XCircle className="w-6 h-6 text-red-500" />
                          )}
                          {run.status === "queued" && (
                            <Clock className="w-6 h-6 text-yellow-500" />
                          )}
                          <div>
                            <p className="font-bold text-slate-900 text-base flex items-center gap-2">
                              Run #{run.id.slice(0, 8)}
                              {run.allocationMode && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-100">
                                  {run.allocationMode.replace("_", " ")}
                                </span>
                              )}
                              {run.finalized && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-bold border border-green-100">
                                  finalized
                                </span>
                              )}
                            </p>
                            <p className="text-sm font-semibold text-slate-600">
                              {new Date(run.startTime).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {run.status === "completed" && (
                            <>
                              <span className="text-sm text-gray-600">
                                {run.allocatedStudents}/{run.totalStudents} allocated
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewResults(run.id)}
                              >
                                View Results
                              </Button>
                              {!run.finalized && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteRun(run.id)}
                                  className="text-red-600 border-red-200 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                              {!run.finalized && (
                                 <Button
                                   variant="primary"
                                   size="sm"
                                   disabled={isPublishingRun === run.id}
                                   onClick={() => handlePublishAndCommit(run.id)}
                                   className="bg-green-600 hover:bg-green-700 text-white"
                                 >
                                   {isPublishingRun === run.id ? (
                                     <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                   ) : (
                                     <CheckCircle className="w-4 h-4 mr-1" />
                                   )}
                                   Publish & Commit
                                 </Button>
                               )}
                            </>
                          )}
                          <span
                            className={`px-3 py-1 text-xs font-medium rounded-full ${
                              run.status === "completed"
                                ? "bg-green-100 text-green-700"
                                : run.status === "running"
                                  ? "bg-blue-100 text-blue-700"
                                  : run.status === "failed"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {run.status}
                          </span>
                        </div>
                      </div>
                    ))}
                    {allocationRuns.length === 0 && (
                      <div className="text-center py-12 text-gray-500">
                        <Play className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>
                          No allocation runs yet. Click "Run Allocation Now" to
                          start.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Mid-Session Operations */}
              <Card className="border-amber-200 bg-amber-50/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-amber-800">
                    <UserMinus className="w-5 h-5" />
                    Mid-Session Operations
                  </CardTitle>
                  <CardDescription className="text-amber-700">
                    Bulk evict students (graduates/leavers) and free up their beds for new allocations.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col md:flex-row gap-4 items-start">
                    <div className="flex-1 w-full p-6 border-2 border-dashed border-amber-300 rounded-xl bg-white hover:border-amber-400 transition-colors group">
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="csv-evict-upload"
                      />
                      <label 
                        htmlFor="csv-evict-upload"
                        className="flex flex-col items-center cursor-pointer"
                      >
                        <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                          <Upload className="w-6 h-6 text-amber-600" />
                        </div>
                        <span className="text-sm font-bold text-slate-700">Upload Roll Numbers CSV</span>
                        <span className="text-xs text-slate-500 mt-1">First column should be Roll Number</span>
                      </label>
                    </div>

                    <div className="w-full md:w-64 space-y-3">
                      <div className="p-3 bg-white rounded-lg border border-amber-200 shadow-sm">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Parsed Students</p>
                        <p className="text-2xl font-black text-amber-600">{parsedRollNumbers.length}</p>
                      </div>
                      <Button
                        onClick={handleBulkEvict}
                        disabled={isEvicting || parsedRollNumbers.length === 0}
                        className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold"
                      >
                        {isEvicting ? (
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <UserMinus className="w-4 h-4 mr-2" />
                        )}
                        Evict & Free Beds
                      </Button>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-amber-200 mt-4">
                    <h5 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-amber-600" />
                      Reset Application Status
                    </h5>
                    <div className="flex gap-3">
                      <select 
                        value={resetYear}
                        onChange={(e) => setResetYear(e.target.value)}
                        className="flex-1 h-10 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="all">All Students</option>
                        <option value="1">Year 1</option>
                        <option value="2">Year 2</option>
                        <option value="3">Year 3</option>
                        <option value="4">Year 4</option>
                      </select>
                      <Button
                        onClick={handleResetStatus}
                        disabled={isResetting}
                        className="bg-slate-800 hover:bg-slate-900 text-white font-bold"
                      >
                        {isResetting ? (
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        ) : null}
                        {isResetting ? "Resetting..." : "Reset Status"}
                      </Button>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2">
                      Clears "Application Submitted" lock for selected cohort. Students will be able to apply again.
                    </p>
                  </div>

                  {evictionSummary && evictionSummary.length > 0 && (
                    <div className="mt-6 border rounded-xl overflow-hidden bg-white">
                      <div className="bg-slate-50 px-4 py-2 border-b flex justify-between items-center">
                        <h5 className="text-xs font-bold text-slate-700 uppercase">Eviction Summary</h5>
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">
                          {evictionSummary.length} Beds Freed
                        </span>
                      </div>
                      <div className="max-h-60 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 text-slate-500 sticky top-0">
                            <tr>
                              <th className="px-4 py-2 text-left font-bold">Roll Number</th>
                              <th className="px-4 py-2 text-left font-bold">Name</th>
                              <th className="px-4 py-2 text-left font-bold">Status</th>
                              <th className="px-4 py-2 text-left font-bold">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {evictionSummary.map((s, i) => (
                              <tr key={i} className="hover:bg-slate-50">
                                <td className="px-4 py-2 font-mono text-xs">{s.rollNumber}</td>
                                <td className="px-4 py-2 font-medium">{s.fullName}</td>
                                <td className="px-4 py-2">
                                  <span className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                                    {s.roomNumber === 'None' ? 'Unallocated' : `${s.hostelName} - ${s.roomNumber}`}
                                  </span>
                                </td>
                                <td className="px-4 py-2">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                                    s.status === 'room_freed' 
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                      : 'bg-blue-50 text-blue-700 border-blue-200'
                                  }`}>
                                    {s.status === 'room_freed' ? 'Room Freed' : 'Profile Reset'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* System Logs & Rollbacks */}
              <Card className="border-indigo-200 bg-indigo-50/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-indigo-800">
                    <History className="w-5 h-5" />
                    System Logs & Rollbacks
                  </CardTitle>
                  <CardDescription className="text-indigo-700">
                    Chronological record of major system changes. Rollbacks restore student and room states to the pre-action snapshot.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {adminActions.length > 0 ? (
                      adminActions.map((action) => (
                        <div 
                          key={action.id} 
                          className={`p-4 rounded-xl border flex items-center justify-between ${
                            action.isReverted 
                              ? "bg-slate-50 border-slate-200 opacity-60" 
                              : "bg-white border-indigo-100 shadow-sm"
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              action.actionType === "ALLOCATION" ? "bg-green-100 text-green-600" : "bg-amber-100 text-amber-600"
                            }`}>
                              {action.actionType === "ALLOCATION" ? <ClipboardCheck className="w-5 h-5" /> : <UserMinus className="w-5 h-5" />}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 leading-tight">
                                {action.description}
                                {action.isReverted && (
                                  <span className="ml-2 px-2 py-0.5 text-[10px] bg-slate-200 text-slate-600 rounded-full uppercase tracking-wider">Reverted</span>
                                )}
                              </p>
                              <p className="text-xs text-slate-500 mt-1">
                                {new Date(action.timestamp).toLocaleString()} • {action.performedBy}
                              </p>
                            </div>
                          </div>
                          {!action.isReverted && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setRevertingActionId(action.id)}
                              className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                            >
                              <RotateCcw className="w-4 h-4 mr-1.5" />
                              Undo
                            </Button>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-slate-400">
                        <History className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        <p className="text-sm">No administrative actions logged yet.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Allocation Results */}
              {allocationResults.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      Allocation Results
                    </CardTitle>
                    <CardDescription>
                      Review student room assignments before approving
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    {/* Happiness Summary Grid */}
                    <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="flex flex-col items-center p-2 bg-white rounded-lg border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-xs font-bold text-green-700">100%</span>
                          <Info 
                            className="w-3.5 h-3.5 text-slate-400 cursor-help" 
                            data-tooltip-id="h-100"
                            data-tooltip-content="Perfect Match: All group members allocated to the same wing and floor."
                          />
                        </div>
                        <span className="text-2xl font-bold text-slate-900">{happinessStats[100]}</span>
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Perfect</span>
                      </div>

                      <div className="flex flex-col items-center p-2 bg-white rounded-lg border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-xs font-bold text-blue-700">60%</span>
                          <Info 
                            className="w-3.5 h-3.5 text-slate-400 cursor-help" 
                            data-tooltip-id="h-60"
                            data-tooltip-content="Same Wing, Different Floor: Group members are in the same physical wing but split across floors."
                          />
                        </div>
                        <span className="text-2xl font-bold text-slate-900">{happinessStats[60]}</span>
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Wing Match</span>
                      </div>

                      <div className="flex flex-col items-center p-2 bg-white rounded-lg border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-xs font-bold text-indigo-700">50%</span>
                          <Info 
                            className="w-3.5 h-3.5 text-slate-400 cursor-help" 
                            data-tooltip-id="h-50"
                            data-tooltip-content="Individual Allocation / Same Hostel: Standard individual placement or group split across different wings."
                          />
                        </div>
                        <span className="text-2xl font-bold text-slate-900">{happinessStats[50]}</span>
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Standard</span>
                      </div>

                      <div className="flex flex-col items-center p-2 bg-white rounded-lg border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-xs font-bold text-amber-700">30%</span>
                          <Info 
                            className="w-3.5 h-3.5 text-slate-400 cursor-help" 
                            data-tooltip-id="h-30"
                            data-tooltip-content="Completely Separated: Group members were allocated to different hostels or completely different buildings."
                          />
                        </div>
                        <span className="text-2xl font-bold text-slate-900">{happinessStats[30]}</span>
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Separated</span>
                      </div>

                      <div className="flex flex-col items-center p-2 bg-white rounded-lg border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-xs font-bold text-red-700">0%</span>
                          <Info 
                            className="w-3.5 h-3.5 text-slate-400 cursor-help" 
                            data-tooltip-id="h-0"
                            data-tooltip-content="Not Allocated: Students who could not be placed in any room due to constraints or lack of capacity."
                          />
                        </div>
                        <span className="text-2xl font-bold text-slate-900">{happinessStats[0]}</span>
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Unallocated</span>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <Tooltip id="h-100" />
                      <Tooltip id="h-60" />
                      <Tooltip id="h-50" />
                      <Tooltip id="h-30" />
                      <Tooltip id="h-0" />
                      <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                              Student
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                              Hostel
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                              Room
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                              Wing/Floor
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                              Happiness
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {combinedResults
                            .slice(0, visibleResultsCount)
                            .map((result: any, idx) => {
                              const student = students.find(s => s.userId === result.studentId || s.userId === result.student_id);
                              return (
                                <tr key={idx} className={`hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0 ${result.isUnallocated ? "bg-red-50/30" : ""}`}>
                                  <td className="px-4 py-3 font-semibold text-slate-900">
                                    <div className="flex flex-col">
                                      <span>{student?.fullName || "Unknown Student"}</span>
                                      <span className="text-xs font-medium text-slate-500">{student?.rollNumber || result.studentId || result.student_id}</span>
                                    </div>
                                  </td>
                                  <td
                                    className={`px-4 py-3 font-medium ${result.isUnallocated ? "text-red-600" : "text-slate-800"}`}
                                  >
                                    {result.hostelName ||
                                      result.hostel_name ||
                                      "-"}
                                  </td>
                                  <td
                                    className={`px-4 py-3 ${result.isUnallocated ? "text-red-600" : "text-slate-900"}`}
                                  >
                                    {result.isUnallocated ? (
                                      <div className="flex flex-col">
                                        <span className="font-bold">Pending</span>
                                        <span className="text-xs italic opacity-80">
                                          {result.reason ||
                                            "No valid rooms found"}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="font-bold">
                                        {result.roomNumber ||
                                          result.room_number ||
                                          "-"}
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-slate-700">
                                    {result.wing || result.wing_name || "-"} / {result.floor ?? "-"}
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                      <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden border border-slate-100">
                                        <div
                                          className={`h-full rounded-full transition-all ${
                                            result.happiness >= 80
                                              ? "bg-green-500"
                                              : result.happiness >= 50
                                                ? "bg-yellow-500"
                                                : "bg-red-500"
                                          }`}
                                          style={{ width: `${result.happiness}%` }}
                                        />
                                      </div>
                                      <span className="text-sm font-bold text-slate-700">
                                        {result.happiness}%
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                    {combinedResults.length > visibleResultsCount && (
                      <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-center">
                        <Button
                          variant="outline"
                          onClick={() =>
                            setVisibleResultsCount((prev) => prev + 50)
                          }
                        >
                          Show More Results ({visibleResultsCount} of{" "}
                          {combinedResults.length})
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* SWAPS SECTION */}
          {activeSection === "swaps" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Room Swaps
                  </h2>
                  <p className="text-gray-500">
                    Manage student room swap requests
                  </p>
                </div>
                <Button onClick={loadAllData} variant="outline">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>

              {/* Detected Swap Cycles */}
              {swapChains.length > 0 && (
                <Card className="border-indigo-200 bg-indigo-50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-indigo-700">
                      <ArrowLeftRight className="w-5 h-5" />
                      Detected Swap Cycles ({swapChains.length})
                    </CardTitle>
                    <CardDescription>
                      These swap chains can be executed together for optimal
                      efficiency
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {swapChains.map((chain) => (
                        <div
                          key={chain.chainId}
                          className="p-4 bg-white rounded-lg border"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span className="font-medium text-indigo-700">
                              Chain of {chain.participants.length} students
                            </span>
                            {chain.canExecute && (
                              <Button
                                size="sm"
                                onClick={async () => {
                                  try {
                                    const requestIds = swapRequests
                                      .filter((r) =>
                                        chain.participants.some(
                                          (p) => p.studentId === r.requesterId,
                                        ),
                                      )
                                      .map((r) => r.id);
                                    await swapsApi.executeChain(requestIds);
                                    setSuccess(
                                      "Swap chain executed successfully!",
                                    );
                                    loadAllData();
                                  } catch (err: any) {
                                    setError(
                                      err.response?.data?.message ||
                                        "Failed to execute chain",
                                    );
                                  }
                                }}
                              >
                                Execute Chain
                              </Button>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-sm">
                            {chain.participants.map((p, i) => (
                              <span
                                key={p.studentId}
                                className="flex items-center gap-1"
                              >
                                <span className="px-2 py-1 bg-gray-100 rounded">
                                  {p.studentName}
                                </span>
                                {i < chain.participants.length - 1 && (
                                  <ArrowLeftRight className="w-4 h-4 text-gray-400" />
                                )}
                              </span>
                            ))}
                            <ArrowLeftRight className="w-4 h-4 text-indigo-500" />
                            <span className="text-indigo-600">(cycle)</span>
                          </div>
                          {chain.validationErrors &&
                            chain.validationErrors.length > 0 && (
                              <div className="mt-2 text-sm text-red-600">
                                Errors: {chain.validationErrors.join(", ")}
                              </div>
                            )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Pending/Accepted Swap Requests */}
              <Card>
                <CardHeader>
                  <CardTitle>Pending & Accepted Requests</CardTitle>
                  <CardDescription>
                    Swap requests awaiting admin action
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                            Requester
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                            Current Room
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                            Target Student
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                            Target Room
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                            Status
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {swapRequests
                          .filter(
                            (r) =>
                              r.status === "pending" || r.status === "accepted",
                          )
                          .map((req) => (
                            <tr key={req.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3">
                                <div>
                                  <p className="font-medium">
                                    {req.requesterName}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    {req.requesterRollNumber}
                                  </p>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <p>{req.requesterRoom.roomNumber}</p>
                                <p className="text-sm text-gray-500">
                                  {req.requesterRoom.hostelName}
                                </p>
                              </td>
                              <td className="px-4 py-3">
                                {req.targetStudentName || (
                                  <span className="text-gray-400">
                                    Open Request
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {req.targetRoom ? (
                                  <>
                                    <p>{req.targetRoom.roomNumber}</p>
                                    <p className="text-sm text-gray-500">
                                      {req.targetRoom.hostelName}
                                    </p>
                                  </>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                                    req.status === "accepted"
                                      ? "bg-green-100 text-green-700"
                                      : req.status === "pending"
                                        ? "bg-yellow-100 text-yellow-700"
                                        : "bg-gray-100 text-gray-700"
                                  }`}
                                >
                                  {req.status}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                {req.status === "accepted" &&
                                  req.targetStudentId && (
                                    <Button
                                      size="sm"
                                      onClick={async () => {
                                        try {
                                          await swapsApi.executeDirect(req.id);
                                          setSuccess(
                                            "Swap executed successfully!",
                                          );
                                          loadAllData();
                                        } catch (err: any) {
                                          setError(
                                            err.response?.data?.message ||
                                              "Failed to execute swap",
                                          );
                                        }
                                      }}
                                    >
                                      <Check className="w-4 h-4 mr-1" />
                                      Execute
                                    </Button>
                                  )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                    {swapRequests.filter(
                      (r) => r.status === "pending" || r.status === "accepted",
                    ).length === 0 && (
                      <div className="text-center py-12 text-gray-500">
                        <ArrowLeftRight className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>No pending or accepted swap requests</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* All Swap Requests */}
              <Card>
                <CardHeader>
                  <CardTitle>All Swap Requests</CardTitle>
                  <CardDescription>
                    Complete history of swap requests
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                            ID
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                            Requester
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                            Target
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                            Type
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                            Status
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                            Created
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {swapRequests.slice(0, 50).map((req) => (
                          <tr key={req.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-mono text-sm">
                              #{req.id}
                            </td>
                            <td className="px-4 py-3">{req.requesterName}</td>
                            <td className="px-4 py-3">
                              {req.targetStudentName || (
                                <span className="text-gray-400">Open</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-1 text-xs rounded-full ${
                                  req.swapType === "direct"
                                    ? "bg-blue-100 text-blue-700"
                                    : req.swapType === "chain"
                                      ? "bg-purple-100 text-purple-700"
                                      : "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {req.swapType}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  req.status === "completed"
                                    ? "bg-green-100 text-green-700"
                                    : req.status === "accepted"
                                      ? "bg-blue-100 text-blue-700"
                                      : req.status === "pending"
                                        ? "bg-yellow-100 text-yellow-700"
                                        : req.status === "rejected"
                                          ? "bg-red-100 text-red-700"
                                          : "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {req.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {new Date(req.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {swapRequests.length === 0 && (
                      <div className="text-center py-12 text-gray-500">
                        <ArrowLeftRight className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>No swap requests yet</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* SETTINGS SECTION */}
          {activeSection === "settings" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    Settings
                  </h2>
                  <p className="text-slate-500">
                    Configure global allocation behaviour
                  </p>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-indigo-600" />
                    Active Allocation Policy
                  </CardTitle>
                  <CardDescription>
                    Choose how students are assigned to rooms. This setting
                    affects all future allocation runs and student navigation.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Warning callout */}
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-amber-800">
                        Impact on Student Interface
                      </p>
                      <p className="text-sm text-amber-700 mt-1">
                        Setting the policy to{" "}
                        <strong>FCFS</strong> will{" "}
                        <strong>
                          hide the "My Group" tab from all students
                        </strong>{" "}
                        and display an FCFS mode notice in their sidebar. This
                        takes effect immediately without a page reload.
                      </p>
                    </div>
                  </div>

                  {/* Policy Selector Tiles */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Group-Based */}
                    <button
                      onClick={() => setAllocationPolicyState("group_based")}
                      className={`p-5 rounded-xl border-2 text-left transition-all ${
                        allocationPolicy === "group_based"
                          ? "border-indigo-500 bg-indigo-50 shadow-md"
                          : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30"
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            allocationPolicy === "group_based"
                              ? "bg-indigo-500"
                              : "bg-slate-100"
                          }`}
                        >
                          <Users
                            className={`w-5 h-5 ${allocationPolicy === "group_based" ? "text-white" : "text-slate-500"}`}
                          />
                        </div>
                        {savedAllocationPolicy === "group_based" && (
                          <span className="text-[10px] font-black px-2 py-0.5 bg-green-100 text-green-700 rounded-full border border-green-200">
                            CURRENTLY ACTIVE
                          </span>
                        )}
                        {allocationPolicy === "group_based" &&
                          savedAllocationPolicy !== "group_based" && (
                            <span className="text-[10px] font-black px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full border border-indigo-200">
                              SELECTED
                            </span>
                          )}
                      </div>
                      <p className="font-bold text-slate-900">Group-Based</p>
                      <p className="text-sm text-slate-500 mt-1">
                        Groups are optimized for wing proximity. Students with
                        friends get rooms together. (Default)
                      </p>
                    </button>

                    {/* FCFS */}
                    <button
                      onClick={() => setAllocationPolicyState("fcfs")}
                      className={`p-5 rounded-xl border-2 text-left transition-all ${
                        allocationPolicy === "fcfs"
                          ? "border-amber-500 bg-amber-50 shadow-md"
                          : "border-slate-200 bg-white hover:border-amber-300 hover:bg-amber-50/30"
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            allocationPolicy === "fcfs"
                              ? "bg-amber-500"
                              : "bg-slate-100"
                          }`}
                        >
                          <Clock
                            className={`w-5 h-5 ${allocationPolicy === "fcfs" ? "text-white" : "text-slate-500"}`}
                          />
                        </div>
                        {savedAllocationPolicy === "fcfs" && (
                          <span className="text-[10px] font-black px-2 py-0.5 bg-green-100 text-green-700 rounded-full border border-green-200">
                            CURRENTLY ACTIVE
                          </span>
                        )}
                        {allocationPolicy === "fcfs" &&
                          savedAllocationPolicy !== "fcfs" && (
                            <span className="text-[10px] font-black px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full border border-amber-200">
                              SELECTED
                            </span>
                          )}
                      </div>
                      <p className="font-bold text-slate-900">
                        First-Come-First-Serve
                      </p>
                      <p className="text-sm text-slate-500 mt-1">
                        Students allocated strictly by application timestamp.
                        Groups are ignored. Hides "My Group" tab.
                      </p>
                    </button>

                    {/* Wing-FCFS */}
                    <button
                      onClick={() => setAllocationPolicyState("wing_fcfs")}
                      className={`p-5 rounded-xl border-2 text-left transition-all ${
                        allocationPolicy === "wing_fcfs"
                          ? "border-blue-500 bg-blue-50 shadow-md"
                          : "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/30"
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            allocationPolicy === "wing_fcfs"
                              ? "bg-blue-500"
                              : "bg-slate-100"
                          }`}
                        >
                          <Building2
                            className={`w-5 h-5 ${allocationPolicy === "wing_fcfs" ? "text-white" : "text-slate-500"}`}
                          />
                        </div>
                        {savedAllocationPolicy === "wing_fcfs" && (
                          <span className="text-[10px] font-black px-2 py-0.5 bg-green-100 text-green-700 rounded-full border border-green-200">
                            CURRENTLY ACTIVE
                          </span>
                        )}
                        {allocationPolicy === "wing_fcfs" &&
                          savedAllocationPolicy !== "wing_fcfs" && (
                            <span className="text-[10px] font-black px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full border border-blue-200">
                              SELECTED
                            </span>
                          )}
                      </div>
                      <p className="font-bold text-slate-900">Wing FCFS</p>
                      <p className="text-sm text-slate-500 mt-1">
                        Groups allocated in FCFS order by earliest member
                        timestamp. Members placed in the same wing when
                        possible.
                      </p>
                    </button>
                  </div>

                  {/* Save Button */}
                  <div className="flex items-center gap-4 pt-2">
                    <Button
                      onClick={async () => {
                        setIsSavingPolicy(true);
                        setError("");
                        setSuccess("");
                        try {
                          await adminApi.setAllocationPolicy(allocationPolicy);
                          setSavedAllocationPolicy(allocationPolicy);
                          setSuccess(
                            `Policy updated to "${allocationPolicy}". Student sidebars will reflect this immediately.`,
                          );
                        } catch (err: any) {
                          setError(
                            err.response?.data?.message ||
                              "Failed to save policy",
                          );
                        } finally {
                          setIsSavingPolicy(false);
                        }
                      }}
                      disabled={isSavingPolicy}
                      className="px-8"
                    >
                      {isSavingPolicy ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Policy
                        </>
                      )}
                    </Button>
                    <p className="text-sm text-slate-500">
                      Currently active:{" "}
                      <span className="font-bold text-slate-800">
                        {allocationPolicy.replace("_", " ").toUpperCase()}
                      </span>
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-amber-100 bg-amber-50/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-900">
                    <ClipboardCheck className="w-5 h-5 text-amber-600" />
                    Application Window Control
                  </CardTitle>
                  <CardDescription>
                    Enable or disable the "Submit Application" button for students. 
                    This allows you to control exactly when students can start applying.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-amber-100">
                    <div>
                      <p className="font-bold text-slate-900">
                        Allow Submissions
                      </p>
                      <p className="text-sm text-slate-500">
                        {applicationsEnabled 
                          ? "Students can currently submit their official applications." 
                          : "Students cannot submit applications. The button is disabled."}
                      </p>
                    </div>
                    <Button
                      variant={applicationsEnabled ? "primary" : "outline"}
                      onClick={() => setApplicationsEnabledState(!applicationsEnabled)}
                      className={applicationsEnabled ? "bg-green-600 hover:bg-green-700" : ""}
                    >
                      {applicationsEnabled ? "Enabled" : "Disabled"}
                    </Button>
                  </div>

                  <div className="flex items-center gap-4 pt-2">
                    <Button
                      onClick={async () => {
                        setIsSavingAppStatus(true);
                        setError("");
                        setSuccess("");
                        try {
                          await adminApi.setApplicationsEnabled(applicationsEnabled);
                          setSavedApplicationsEnabled(applicationsEnabled);
                          setSuccess(
                            `Application submission ${applicationsEnabled ? "enabled" : "disabled"} successfully.`
                          );
                        } catch (err: any) {
                          setError(
                            err.response?.data?.message ||
                              "Failed to save application status",
                          );
                        } finally {
                          setIsSavingAppStatus(false);
                        }
                      }}
                      disabled={isSavingAppStatus || applicationsEnabled === savedApplicationsEnabled}
                      className="px-8"
                    >
                      {isSavingAppStatus ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Status"
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
    
    {/* Rollback Confirmation Modal */}
    {revertingActionId && (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl animate-in zoom-in duration-200">
          <CardHeader className="text-center pb-2">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <RotateCcw className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl font-black text-slate-900">Rollback Action?</CardTitle>
            <CardDescription className="text-slate-600 text-base">
              This will restore all student assignments and room statuses to the state they were in before this action. This cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            <div className="p-4 bg-red-50 rounded-xl border border-red-100">
              <p className="text-sm text-red-700 font-medium">
                To confirm, please type <span className="font-black underline italic">REVERT</span> below:
              </p>
              <Input
                value={revertConfirmText}
                onChange={(e) => setRevertConfirmText(e.target.value)}
                placeholder="Type REVERT here..."
                className="mt-3 bg-white border-red-200 focus:ring-red-500 text-center font-bold tracking-widest uppercase"
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 font-bold"
                onClick={() => {
                  setRevertingActionId(null);
                  setRevertConfirmText("");
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold"
                disabled={revertConfirmText !== "REVERT" || isReverting}
                onClick={handleRollback}
              >
                {isReverting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Execute Rollback"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )}
    </>
  );
}
