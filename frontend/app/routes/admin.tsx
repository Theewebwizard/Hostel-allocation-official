import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Building2,
  Users,
  DoorOpen,
  Settings,
  Play,
  RefreshCw,
  Plus,
  Trash2,
  Edit,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "~/components/ui";
import { DashboardLayout } from "~/components/layout/DashboardLayout";
import { useAuthStore } from "~/lib/auth-store";
import {
  adminApi,
  type DashboardStats,
  type Hostel,
  type Room,
  type AllocationRule,
  type AllocationRun,
} from "~/lib/api";

export function meta() {
  return [
    { title: "Admin Dashboard - Hostel Allocation System" },
    {
      name: "description",
      content: "Manage hostels, rooms, and allocation rules",
    },
  ];
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const {
    user,
    isAuthenticated,
    checkAuth,
    isLoading: authLoading,
  } = useAuthStore();
  const [activeTab, setActiveTab] = useState<
    "overview" | "hostels" | "rooms" | "rules" | "allocation"
  >("overview");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [rules, setRules] = useState<AllocationRule[]>([]);
  const [allocationRuns, setAllocationRuns] = useState<AllocationRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form states
  const [showHostelForm, setShowHostelForm] = useState(false);
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [selectedHostelId, setSelectedHostelId] = useState<number | null>(null);

  // Hostel form
  const [hostelForm, setHostelForm] = useState({
    name: "",
    genderType: "male",
  });

  // Room form
  const [roomForm, setRoomForm] = useState({
    hostelId: 0,
    roomNumber: "",
    floor: 0,
    wing: "",
    capacity: 2,
    roomType: "double",
  });

  // Bulk room form
  const [showBulkRoomForm, setShowBulkRoomForm] = useState(false);
  const [bulkRoomForm, setBulkRoomForm] = useState({
    hostelId: 0,
    wing: "",
    floor: 0,
    startRoomNumber: 101,
    count: 10,
    capacity: 2,
    roomType: "double",
  });

  // Rule form
  const [ruleForm, setRuleForm] = useState({
    hostelId: null as number | null,
    year: null as number | null,
    roomType: "",
    isAllowed: true,
    priority: 0,
    description: "",
  });

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
      loadData();
    }
  }, [isAuthenticated, user]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, hostelsRes, roomsRes, rulesRes, runsRes] =
        await Promise.all([
          adminApi.getDashboardStats(),
          adminApi.getAllHostels(),
          adminApi.getAllRooms(),
          adminApi.getAllRules(),
          adminApi.getAllocationRuns(),
        ]);
      setStats(statsRes.data);
      setHostels(hostelsRes.data);
      setRooms(roomsRes.data);
      setRules(rulesRes.data);
      setAllocationRuns(runsRes.data);
    } catch (err) {
      console.error("Error loading data:", err);
      setError("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateHostel = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      await adminApi.createHostel(hostelForm);
      setSuccess("Hostel created successfully");
      setShowHostelForm(false);
      setHostelForm({ name: "", genderType: "male" });
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create hostel");
    }
  };

  const handleDeleteHostel = async (id: number) => {
    if (!confirm("Are you sure you want to delete this hostel?")) return;
    setError("");
    setSuccess("");
    try {
      await adminApi.deleteHostel(id);
      setSuccess("Hostel deleted");
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to delete hostel");
    }
  };

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
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create room");
    }
  };

  const handleBulkCreateRooms = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      const result = await adminApi.bulkCreateRooms(bulkRoomForm);
      setSuccess(`Created ${result.data.length} rooms successfully`);
      setShowBulkRoomForm(false);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create rooms");
    }
  };

  const handleDeleteRoom = async (id: number) => {
    if (!confirm("Are you sure you want to delete this room?")) return;
    setError("");
    try {
      await adminApi.deleteRoom(id);
      setSuccess("Room deleted");
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to delete room");
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      await adminApi.createRule({
        hostelId: ruleForm.hostelId || undefined,
        year: ruleForm.year || undefined,
        roomType: ruleForm.roomType || undefined,
        isAllowed: ruleForm.isAllowed,
        priority: ruleForm.priority,
        description: ruleForm.description || undefined,
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
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create rule");
    }
  };

  const handleDeleteRule = async (id: number) => {
    if (!confirm("Are you sure you want to delete this rule?")) return;
    setError("");
    try {
      await adminApi.deleteRule(id);
      setSuccess("Rule deleted");
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to delete rule");
    }
  };

  const handleTriggerAllocation = async () => {
    if (
      !confirm(
        "Are you sure you want to run the allocation? This will assign students to rooms based on current rules.",
      )
    )
      return;
    setError("");
    setSuccess("");
    try {
      await adminApi.triggerAllocation();
      setSuccess(
        "Allocation process started! Check the Allocation tab for status.",
      );
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to start allocation");
    }
  };

  if (authLoading || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  const filteredRooms = selectedHostelId
    ? rooms.filter((r) => r.hostelId === selectedHostelId)
    : rooms;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Admin Dashboard
            </h1>
            <p className="text-gray-600">
              Manage hostels, rooms, and allocation rules
            </p>
          </div>
          <Button onClick={loadData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            {[
              { id: "overview", label: "Overview", icon: Building2 },
              { id: "hostels", label: "Hostels", icon: Building2 },
              { id: "rooms", label: "Rooms", icon: DoorOpen },
              { id: "rules", label: "Rules", icon: Settings },
              { id: "allocation", label: "Allocation", icon: Play },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Students</p>
                    <p className="text-3xl font-bold">{stats.totalStudents}</p>
                  </div>
                  <Users className="w-8 h-8 text-indigo-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Groups</p>
                    <p className="text-3xl font-bold">{stats.totalGroups}</p>
                    <p className="text-xs text-gray-400">
                      {stats.studentsInGroups} students in groups
                    </p>
                  </div>
                  <Users className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Beds</p>
                    <p className="text-3xl font-bold">{stats.totalBeds}</p>
                    <p className="text-xs text-gray-400">
                      {stats.totalRooms} rooms in {stats.totalHostels} hostels
                    </p>
                  </div>
                  <DoorOpen className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Active Rules</p>
                    <p className="text-3xl font-bold">{stats.totalRules}</p>
                  </div>
                  <Settings className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Hostels Tab */}
        {activeTab === "hostels" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Hostels</h2>
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
                    className="flex gap-4 items-end"
                  >
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-1">
                        Name
                      </label>
                      <Input
                        placeholder="e.g., BH-1"
                        value={hostelForm.name}
                        onChange={(e) =>
                          setHostelForm({ ...hostelForm, name: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="w-40">
                      <label className="block text-sm font-medium mb-1">
                        Gender Type
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        value={hostelForm.genderType}
                        onChange={(e) =>
                          setHostelForm({
                            ...hostelForm,
                            genderType: e.target.value,
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
                <Card key={hostel.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{hostel.name}</h3>
                        <p className="text-sm text-gray-500 capitalize">
                          {hostel.genderType}
                        </p>
                        <p className="text-xs text-gray-400">
                          {rooms.filter((r) => r.hostelId === hostel.id).length}{" "}
                          rooms
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteHostel(hostel.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Rooms Tab */}
        {activeTab === "rooms" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold">Rooms</h2>
                <select
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  value={selectedHostelId || ""}
                  onChange={(e) =>
                    setSelectedHostelId(
                      e.target.value ? parseInt(e.target.value) : null,
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

            {showBulkRoomForm && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Bulk Create Rooms</CardTitle>
                </CardHeader>
                <CardContent>
                  <form
                    onSubmit={handleBulkCreateRooms}
                    className="grid grid-cols-2 md:grid-cols-4 gap-4"
                  >
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Hostel
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        value={bulkRoomForm.hostelId}
                        onChange={(e) =>
                          setBulkRoomForm({
                            ...bulkRoomForm,
                            hostelId: parseInt(e.target.value),
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
                        required
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
                            floor: parseInt(e.target.value),
                          })
                        }
                        required
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
                            startRoomNumber: parseInt(e.target.value),
                          })
                        }
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Count
                      </label>
                      <Input
                        type="number"
                        value={bulkRoomForm.count}
                        onChange={(e) =>
                          setBulkRoomForm({
                            ...bulkRoomForm,
                            count: parseInt(e.target.value),
                          })
                        }
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Capacity
                      </label>
                      <Input
                        type="number"
                        value={bulkRoomForm.capacity}
                        onChange={(e) =>
                          setBulkRoomForm({
                            ...bulkRoomForm,
                            capacity: parseInt(e.target.value),
                          })
                        }
                        required
                      />
                    </div>
                    <div className="col-span-2 flex items-end gap-2">
                      <Button type="submit">Create Rooms</Button>
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

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">Hostel</th>
                    <th className="px-4 py-3 text-left">Room #</th>
                    <th className="px-4 py-3 text-left">Wing</th>
                    <th className="px-4 py-3 text-left">Floor</th>
                    <th className="px-4 py-3 text-left">Capacity</th>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredRooms.slice(0, 50).map((room) => (
                    <tr key={room.id}>
                      <td className="px-4 py-3">
                        {hostels.find((h) => h.id === room.hostelId)?.name}
                      </td>
                      <td className="px-4 py-3">{room.roomNumber}</td>
                      <td className="px-4 py-3">{room.wing || "-"}</td>
                      <td className="px-4 py-3">{room.floor ?? "-"}</td>
                      <td className="px-4 py-3">{room.capacity}</td>
                      <td className="px-4 py-3">{room.roomType}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            room.status === "available"
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {room.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDeleteRoom(room.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredRooms.length > 50 && (
                <p className="text-sm text-gray-500 p-4">
                  Showing first 50 rooms of {filteredRooms.length}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Rules Tab */}
        {activeTab === "rules" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Allocation Rules</h2>
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
                    Define allocation constraints
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form
                    onSubmit={handleCreateRule}
                    className="grid grid-cols-2 md:grid-cols-3 gap-4"
                  >
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Hostel (optional)
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        value={ruleForm.hostelId || ""}
                        onChange={(e) =>
                          setRuleForm({
                            ...ruleForm,
                            hostelId: e.target.value
                              ? parseInt(e.target.value)
                              : null,
                          })
                        }
                      >
                        <option value="">Any Hostel</option>
                        {hostels.map((h) => (
                          <option key={h.id} value={h.id}>
                            {h.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Year (optional)
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        value={ruleForm.year || ""}
                        onChange={(e) =>
                          setRuleForm({
                            ...ruleForm,
                            year: e.target.value
                              ? parseInt(e.target.value)
                              : null,
                          })
                        }
                      >
                        <option value="">Any Year</option>
                        <option value="1">1st Year</option>
                        <option value="2">2nd Year</option>
                        <option value="3">3rd Year</option>
                        <option value="4">4th Year</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Room Type (optional)
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        value={ruleForm.roomType}
                        onChange={(e) =>
                          setRuleForm({ ...ruleForm, roomType: e.target.value })
                        }
                      >
                        <option value="">Any Type</option>
                        <option value="single">Single</option>
                        <option value="double">Double</option>
                        <option value="triple">Triple</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Allowed?
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        value={ruleForm.isAllowed ? "true" : "false"}
                        onChange={(e) =>
                          setRuleForm({
                            ...ruleForm,
                            isAllowed: e.target.value === "true",
                          })
                        }
                      >
                        <option value="true">Allowed</option>
                        <option value="false">Not Allowed</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Priority
                      </label>
                      <Input
                        type="number"
                        value={ruleForm.priority}
                        onChange={(e) =>
                          setRuleForm({
                            ...ruleForm,
                            priority: parseInt(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Description
                      </label>
                      <Input
                        placeholder="e.g., 2nd year in BH-4"
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

            <div className="space-y-2">
              {rules.map((rule) => (
                <Card key={rule.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            rule.isAllowed
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {rule.isAllowed ? "ALLOW" : "DENY"}
                        </span>
                        <div>
                          <p className="font-medium">
                            {rule.description || `Rule #${rule.id}`}
                          </p>
                          <p className="text-sm text-gray-500">
                            {rule.hostel?.name || "Any Hostel"} |
                            {rule.year ? ` Year ${rule.year}` : " Any Year"} |
                            {rule.roomType || " Any Type"} | Priority:{" "}
                            {rule.priority}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {rules.length === 0 && (
                <p className="text-gray-500 text-center py-8">
                  No rules defined. The allocation will use default behavior.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Allocation Tab */}
        {activeTab === "allocation" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Allocation Management</h2>
              <Button onClick={handleTriggerAllocation}>
                <Play className="w-4 h-4 mr-2" />
                Run Allocation
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Allocation Runs</CardTitle>
                <CardDescription>
                  History of allocation executions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {allocationRuns.length > 0 ? (
                  <div className="space-y-3">
                    {allocationRuns.map((run) => (
                      <div
                        key={run.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium">
                            Run {run.id.slice(0, 8)}...
                          </p>
                          <p className="text-sm text-gray-500">
                            Started: {new Date(run.startTime).toLocaleString()}
                          </p>
                          {run.endTime && (
                            <p className="text-sm text-gray-500">
                              Ended: {new Date(run.endTime).toLocaleString()}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <span
                            className={`px-3 py-1 rounded-full text-sm ${
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
                          {run.status === "completed" && (
                            <p className="text-sm text-gray-500 mt-1">
                              {run.allocatedStudents}/{run.totalStudents}{" "}
                              allocated
                            </p>
                          )}
                          {run.errorMessage && (
                            <p className="text-sm text-red-500 mt-1">
                              {run.errorMessage}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    No allocation runs yet. Click "Run Allocation" to start.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
