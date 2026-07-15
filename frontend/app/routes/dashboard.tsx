import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router";
import {
  Building2,
  Users,
  BedDouble,
  ClipboardCheck,
  TrendingUp,
  Clock,
  UserCheck,
  Play,
  CheckCircle,
  XCircle,
  Info,
  GripVertical,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DashboardLayout } from "~/components/layout/DashboardLayout";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "~/components/ui";
import { useAuthStore } from "~/lib/auth-store";
import { adminApi, groupsApi, studentsApi, type DashboardStats } from "~/lib/api";

export function meta() {
  return [
    { title: "Dashboard - Hostel Allocation System" },
    { name: "description", content: "Dashboard overview" },
  ];
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <Card className="hover:shadow-xl transition-shadow">
      <CardContent className="flex items-center gap-4">
        <div
          className={`w-14 h-14 rounded-xl flex items-center justify-center ${color}`}
        >
          <Icon className="w-7 h-7 text-white" />
        </div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SortableHostelItem({ id, hostel, eligibility }: { id: number, hostel: any, eligibility: any }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="p-4 bg-white rounded-xl border border-indigo-100 shadow-sm flex items-center gap-3 hover:shadow-md transition-shadow relative bg-white z-10">
      <div {...attributes} {...listeners} className="cursor-grab touch-none p-2 -ml-2 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600">
        <GripVertical className="w-5 h-5" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
          <Building2 className="w-4 h-4 text-indigo-500" />
          <p className="font-bold text-slate-900">{hostel.name}</p>
        </div>
        <div className="space-y-1">
          {hostel.wings.map((wing: any) => (
            <div key={wing.name} className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600 font-medium">{wing.name} Wing</span>
                <div className="flex items-center gap-2">
                  {eligibility.showRoommateLimits && (
                    <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-100">
                      MAX {wing.maxRoommates}
                    </span>
                  )}
                  {eligibility.showBatchCapacity && (
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">
                      {wing.totalSpots} SPOTS
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StudentDashboard() {
  const { user, checkAuth } = useAuthStore();
  const student = user?.student;
  const [groupCount, setGroupCount] = useState<number>(0);
  const [invitationCount, setInvitationCount] = useState<number>(0);
  const [currentRoom, setCurrentRoom] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [appsEnabled, setAppsEnabled] = useState(true);
  const [eligibility, setEligibility] = useState<any>(null);
  const [preferences, setPreferences] = useState<number[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setPreferences((items) => {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleApply = async () => {
    if (
      !confirm(
        "Are you ready to submit your official hostel application? Your timestamp will be recorded now.",
      )
    )
      return;
    setIsSubmitting(true);
    setSubmitError("");
    try {
      await studentsApi.submitApplication(preferences);
      await checkAuth(); // Refresh user data to get the new timestamp
    } catch (err: any) {
      setSubmitError(
        err.response?.data?.message || "Failed to submit application",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasApplied = !!student?.hasSubmitted;

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        const [groupRes, invitationsRes, meRes, statusRes] = await Promise.all([
          groupsApi.getMyGroup(),
          groupsApi.getMyInvitations(),
          studentsApi.getMe(),
          adminApi.getApplicationsEnabled().catch(() => ({ data: { enabled: true } })),
          studentsApi.getMyEligibility().catch(() => ({ data: { enabled: false, hostels: [] } })),
        ]);

        if (groupRes.data) {
          setGroupCount(groupRes.data.memberCount || 0);
        }
        setInvitationCount(invitationsRes.data?.length || 0);

        if (meRes.data?.currentRoom) {
          setCurrentRoom(meRes.data.currentRoom);
        }
        setAppsEnabled(statusRes.data.enabled ?? true);
        setEligibility(eligibilityRes.data);
        if (eligibilityRes.data?.hostels) {
          setPreferences(eligibilityRes.data.hostels.map((h: any) => h.id));
        }
      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
      }
    };

    fetchStudentData();
  }, []);

  return (
    <>
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Welcome, {student?.fullName || "Student"}! 👋
          </h1>
          <p className="text-slate-600 mt-1">
            Here's an overview of your hostel allocation status
          </p>
        </div>

        {/* Application Submission Status */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 min-w-[280px]">
          {hasApplied ? (
            <div className="flex items-center gap-3 text-green-700">
              <CheckCircle className="w-8 h-8" />
              <div>
                <p className="font-bold">Application Submitted</p>
                <p className="text-xs text-slate-600">
                  Recorded:{" "}
                  {new Date(student.applicationTimestamp!).toLocaleString()}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-amber-600 flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {!appsEnabled ? "Hostel applications are currently closed." : "Hostel application not submitted yet!"}
              </p>
              <Button
                onClick={handleApply}
                disabled={isSubmitting || !appsEnabled}
                className="w-full"
                size="sm"
              >
                {!appsEnabled ? "Submissions Closed" : isSubmitting ? "Submitting..." : "Submit Application Now"}
              </Button>
              {submitError && (
                <p className="text-xs text-red-500 mt-1">{submitError}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={Users}
          label="My Group Size"
          value={groupCount}
          color="bg-indigo-600"
        />
        <StatCard
          icon={UserCheck}
          label="Pending Invitations"
          value={invitationCount}
          color="bg-amber-600"
        />
        <StatCard
          icon={BedDouble}
          label="Room Allocation"
          value={currentRoom ? `Room ${currentRoom.roomNumber}` : "Pending"}
          color={currentRoom ? "bg-green-600" : "bg-purple-600"}
        />
        <StatCard
          icon={Clock}
          label="Year"
          value={`${student?.year || 1}${getOrdinalSuffix(student?.year || 1)} Year`}
          color="bg-slate-700"
        />
      </div>

      {/* Student Info Card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-slate-900">Your Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Roll Number</span>
                <span className="font-bold text-slate-900">
                  {student?.rollNumber || "N/A"}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Full Name</span>
                <span className="font-bold text-slate-900">
                  {student?.fullName || "N/A"}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Year</span>
                <span className="font-bold text-slate-900">
                  {student?.year
                    ? `${student.year}${getOrdinalSuffix(student.year)} Year`
                    : "N/A"}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-500 font-medium">Program</span>
                <span className="font-bold text-slate-900">{student?.program || "N/A"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-slate-900">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Link
                to="/groups"
                className="flex items-center gap-3 p-4 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors border border-indigo-100"
              >
                <Users className="w-6 h-6 text-indigo-600" />
                <div>
                  <p className="font-bold text-slate-900">
                    Create or Join Groups
                  </p>
                  <p className="text-sm text-slate-600">
                    Form groups with your friends
                  </p>
                </div>
              </Link>
              <Link
                to="/groups"
                className="flex items-center gap-3 p-4 rounded-lg bg-amber-50 hover:bg-amber-100 transition-colors border border-amber-100"
              >
                <ClipboardCheck className="w-6 h-6 text-amber-600" />
                <div>
                  <p className="font-bold text-slate-900">Check Invitations</p>
                  <p className="text-sm text-slate-600">
                    View pending group invitations
                  </p>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {eligibility?.enabled && eligibility.hostels?.length > 0 && (
        <Card className="mt-6 border-indigo-100 bg-gradient-to-br from-white to-indigo-50/30 overflow-hidden">
          <CardHeader className="border-b border-indigo-100/50 bg-white/50">
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                <Info className="w-5 h-5 text-indigo-600" />
              </div>
              Your Allocation Eligibility
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-sm text-slate-500 mb-4">
              Drag and drop to rank your preferred hostels. Your preferences will be submitted in this exact order.
            </p>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={preferences} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col gap-3">
                  {preferences.map((id) => {
                    const hostel = eligibility.hostels.find((h: any) => h.id === id);
                    if (!hostel) return null;
                    return <SortableHostelItem key={id} id={id} hostel={hostel} eligibility={eligibility} />;
                  })}
                </div>
              </SortableContext>
            </DndContext>
          </CardContent>
        </Card>
      )}
    </>
  );
}

function WardenDashboard({ stats }: { stats: DashboardStats | null }) {
  // Calculate allocation rate safely
  const allocationRate = stats?.totalStudents
    ? Math.round(((stats.latestAllocationRun?.allocatedStudents || 0) / stats.totalStudents) * 100)
    : 0;

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard 🏠</h1>
        <p className="text-gray-600 mt-1">
          Manage hostels, rooms, and allocations
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={Building2}
          label="Total Hostels"
          value={stats?.totalHostels || 0}
          color="bg-indigo-500"
        />
        <StatCard
          icon={BedDouble}
          label="Total Rooms"
          value={stats?.totalRooms || 0}
          color="bg-blue-500"
        />
        <StatCard
          icon={Users}
          label="Registered Students"
          value={stats?.totalStudents || 0}
          color="bg-green-500"
        />
        <StatCard
          icon={TrendingUp}
          label="Allocation Rate"
          value={`${allocationRate}%`}
          color="bg-purple-500"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <a
                href="/admin"
                className="flex items-center gap-3 p-4 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors"
              >
                <Building2 className="w-6 h-6 text-indigo-600" />
                <div>
                  <p className="font-medium text-gray-900">Open Admin Panel</p>
                  <p className="text-sm text-gray-500">
                    Manage hostels, rooms, and allocations
                  </p>
                </div>
              </a>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.latestAllocationRun ? (
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 rounded-lg bg-gray-50 border border-gray-100">
                  <div className={`p-2 rounded-full shrink-0 ${
                    stats.latestAllocationRun.status === 'completed' ? 'bg-green-100' :
                    stats.latestAllocationRun.status === 'failed' ? 'bg-red-100' : 'bg-blue-100'
                  }`}>
                    {stats.latestAllocationRun.status === 'completed' ? <CheckCircle className="w-5 h-5 text-green-600" /> :
                     stats.latestAllocationRun.status === 'failed' ? <XCircle className="w-5 h-5 text-red-600" /> :
                     <Play className="w-5 h-5 text-blue-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      Allocation Run #{stats.latestAllocationRun.id.slice(0, 8)}
                    </p>
                    <p className="text-sm text-gray-600 capitalize mt-0.5">
                      Status: {stats.latestAllocationRun.status}
                    </p>
                    {stats.latestAllocationRun.status === 'completed' && (
                      <p className="text-sm text-gray-600 mt-1 font-medium text-indigo-600">
                        {stats.latestAllocationRun.allocatedStudents} / {stats.latestAllocationRun.totalStudents} Allocated
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(stats.latestAllocationRun.startTime).toLocaleString()}
                    </p>
                  </div>
                </div>
                
                <Link
                  to="/admin?tab=allocation"
                  className="block text-center text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                >
                  View Full History →
                </Link>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No recent activity</p>
                <p className="text-sm">Allocation logs will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function getOrdinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    if (isAuthenticated && user?.role === "warden") {
      adminApi.getDashboardStats()
        .then((res) => setStats(res.data))
        .catch((err) => console.error("Failed to load stats", err));
    }
  }, [isAuthenticated, user]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        {user?.role === "warden" ? <WardenDashboard stats={stats} /> : <StudentDashboard />}
      </div>
    </DashboardLayout>
  );
}
