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

interface Student {
  id?: string;
  userId: string;
  rollNumber: string;
  fullName: string;
  year: number;
  program: string;
  gender: string;
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

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
      ]);
      setStats(statsRes.data);
      setHostels(hostelsRes.data);
      setRooms(roomsRes.data);
      setRules(rulesRes.data);
      setAllocationRuns(runsRes.data);
      setStudents(studentsRes.data || []);
      setSwapRequests(swapsRes.data || []);
      setSwapChains(cyclesRes.data || []);
      setWingSettings(wingRes.data || []);
      setAllocationPolicyState(policyRes.data.policy || "group_based");
      setSavedAllocationPolicy(policyRes.data.policy || "group_based");
      setGroups(groupsRes.data || []);
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
  const handleRunAllocation = async () => {
    if (
      !confirm(
        "Run allocation now? This will allocate students to rooms based on current rules.",
      )
    )
      return;
    setError("");
    setSuccess("");
    try {
      const res = await adminApi.triggerAllocation({ allocationMode });
      setSuccess("Allocation started! Polling for results...");
      loadAllData();
      pollAllocationStatus(res.data.id);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to start allocation");
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
            "Allocation failed: " + (res.data.errorMessage || "Unknown error"),
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

  const handleApproveAllocation = async (runId: string) => {
    if (
      !confirm("Finalize this allocation? Room assignments will be locked permanently.")
    )
      return;
    setError("");
    setSuccess("");
    try {
      await adminApi.finalizeAllocationRun(runId);
      setSuccess("Allocation finalized! Room assignments are now locked.");
      loadAllData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to finalize allocation");
    }
  };

  const handleCommitAllocation = async (runId: string) => {
    if (
      !confirm("Commit this allocation? Room statuses will be updated to occupied.")
    )
      return;
    setError("");
    setSuccess("");
    try {
      await adminApi.commitAllocationRun(runId);
      setSuccess("Allocation committed! Room statuses are now occupied.");
      loadAllData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to commit allocation");
    }
  };

  const handleViewResults = async (runId: string) => {
    try {
      const resultsRes = await adminApi.getAllocationResults(runId);
      setAllocationResults(resultsRes.data || []);
      setVisibleResultsCount(30); // Reset the pagination count when viewing new results
    } catch (err) {
      console.error("Failed to fetch results", err);
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

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {hostels.map((hostel) => (
                  <Card
                    key={hostel.id}
                    className="hover:shadow-md transition-all cursor-pointer border-transparent hover:border-indigo-200 active:scale-95"
                    onClick={() => {
                      setSelectedHostelFilter(hostel.id);
                      setActiveSection("rooms");
                    }}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {hostel.name}
                          </h3>
                          <span
                            className={`inline-block mt-1 px-2 py-0.5 text-xs font-semibold rounded-full border ${
                              hostel.genderType === "male"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : hostel.genderType === "female"
                                  ? "bg-pink-50 text-pink-700 border-pink-200"
                                  : "bg-purple-50 text-purple-700 border-purple-200"
                            }`}
                          >
                            {hostel.genderType}
                          </span>
                          <p className="text-sm font-medium text-slate-600 mt-2">
                            {
                              rooms.filter((r) => r.hostelId === hostel.id)
                                .length
                            }{" "}
                            rooms
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteHostel(hostel.id)}
                          className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {hostels.length === 0 && (
                  <div className="col-span-full text-center py-12 text-gray-500 bg-white rounded-lg border border-dashed">
                    <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
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
                        <label className="block text-sm font-semibold text-slate-700 mb-1">
                          Hostel *
                        </label>
                        <select
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500"
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
                        <label className="block text-sm font-medium mb-1">
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
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
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
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
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
                  <h2 className="text-2xl font-bold text-slate-900">
                    Allocation Rules
                  </h2>
                  <p className="text-slate-600 font-medium">
                    Configure allocation constraints
                  </p>
                </div>
                <Button onClick={() => setShowRuleForm(!showRuleForm)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Rule
                </Button>
              </div>

              {showRuleForm && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Create Rule</CardTitle>
                    <CardDescription>
                      Define who can be allocated where
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form
                      onSubmit={handleCreateRule}
                      className="grid grid-cols-2 md:grid-cols-3 gap-4"
                    >
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">
                          Hostel (optional)
                        </label>
                        <select
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500"
                          value={ruleForm.hostelId || ""}
                          onChange={(e) =>
                            setRuleForm({
                              ...ruleForm,
                              hostelId: e.target.value
                                ? Number(e.target.value)
                                : null,
                            })
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
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">
                          Year (optional)
                        </label>
                        <select
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500"
                          value={ruleForm.year || ""}
                          onChange={(e) =>
                            setRuleForm({
                              ...ruleForm,
                              year: e.target.value
                                ? Number(e.target.value)
                                : null,
                            })
                          }
                        >
                          <option value="">All Years</option>
                          <option value={1}>1st Year</option>
                          <option value={2}>2nd Year</option>
                          <option value={3}>3rd Year</option>
                          <option value={4}>4th Year</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">
                          Action
                        </label>
                        <select
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500"
                          value={ruleForm.isAllowed ? "allow" : "deny"}
                          onChange={(e) =>
                            setRuleForm({
                              ...ruleForm,
                              isAllowed: e.target.value === "allow",
                            })
                          }
                        >
                          <option value="allow">Allow</option>
                          <option value="deny">Deny</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Priority (higher = more important)
                        </label>
                        <Input
                          type="number"
                          value={ruleForm.priority}
                          onChange={(e) =>
                            setRuleForm({
                              ...ruleForm,
                              priority: Number(e.target.value),
                            })
                          }
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium mb-1">
                          Description
                        </label>
                        <Input
                          placeholder="e.g., 1st year students go to BH-1"
                          value={ruleForm.description}
                          onChange={(e) =>
                            setRuleForm({
                              ...ruleForm,
                              description: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="col-span-full flex gap-2">
                        <Button type="submit">Create Rule</Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowRuleForm(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-3">
                {rules.map((rule) => (
                  <Card key={rule.id}>
                    <CardContent className="py-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-3 h-3 rounded-full ${rule.isAllowed ? "bg-green-500" : "bg-red-500"}`}
                        />
                        <div>
                          <p className="font-bold text-slate-900 text-lg">
                            {rule.description || `Rule #${rule.id}`}
                          </p>
                          <p className="text-sm font-semibold text-slate-700">
                            {rule.hostelId
                              ? hostels.find((h) => h.id === rule.hostelId)
                                  ?.name
                              : "All Hostels"}
                            {rule.year
                              ? ` | Year ${rule.year}`
                              : " | All Years"}
                            {` | Priority: ${rule.priority}`}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="text-red-500 hover:bg-red-50 p-2 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </CardContent>
                  </Card>
                ))}
                {rules.length === 0 && (
                  <div className="text-center py-12 text-gray-500 bg-white rounded-lg border border-dashed">
                    <Settings className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>
                      No rules defined. Click "Add Rule" to create allocation
                      constraints.
                    </p>
                  </div>
                )}
              </div>
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
                                                gender: e.target.value,
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

                  {/* Finalized warning */}
                  {allocationRuns.some((r) => r.finalized) && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3 text-amber-700">
                      <CheckCircle className="w-5 h-5 shrink-0" />
                      <span>
                        An allocation has been finalized. Re-running is blocked to protect room assignments.
                      </span>
                    </div>
                  )}

                  {/* Run Now Button */}
                  <Button
                    onClick={handleRunAllocation}
                    className="w-full"
                    size="lg"
                    disabled={allocationRuns.some((r) => r.finalized)}
                  >
                    <Play className="w-5 h-5 mr-2" />
                    Run Allocation Now
                  </Button>
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
                                  onClick={() => handleApproveAllocation(run.id)}
                                >
                                  <Check className="w-4 h-4 mr-1" />
                                  Finalize
                                </Button>
                              )}
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleCommitAllocation(run.id)}
                              >
                                <Play className="w-4 h-4 mr-1" />
                                Commit Allocation
                              </Button>
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
                          {allocationResults
                            .slice(0, visibleResultsCount)
                            .map((result: any, idx) => {
                              const student = students.find(s => s.userId === result.studentId || s.userId === result.student_id);
                              return (
                                <tr key={idx} className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
                                  <td className="px-4 py-3 font-semibold text-slate-900">
                                    <div className="flex flex-col">
                                      <span>{student?.fullName || "Unknown Student"}</span>
                                      <span className="text-xs font-medium text-slate-500">{student?.rollNumber || result.studentId || result.student_id}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-slate-800 font-medium">
                                    {result.hostelName || result.hostel_name || "-"}
                                  </td>
                                  <td className="px-4 py-3 text-slate-900 font-bold">
                                    {result.roomNumber || result.room_number || "-"}
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
                    {allocationResults.length > visibleResultsCount && (
                      <div className="p-4 border-t text-center">
                        <p className="text-sm text-gray-500 mb-2">
                          Showing first {visibleResultsCount} of{" "}
                          {allocationResults.length} results
                        </p>
                        <Button
                          variant="outline"
                          onClick={() =>
                            setVisibleResultsCount((prev) => prev + 50)
                          }
                        >
                          Load More
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
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
