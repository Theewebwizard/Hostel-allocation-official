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
} from "lucide-react";
import { DashboardLayout } from "~/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui";
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

function StudentDashboard() {
  const { user } = useAuthStore();
  const student = user?.student;
  const [groupCount, setGroupCount] = useState<number>(0);
  const [invitationCount, setInvitationCount] = useState<number>(0);
  const [currentRoom, setCurrentRoom] = useState<any>(null);

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        const [groupRes, invitationsRes, meRes] = await Promise.all([
          groupsApi.getMyGroup(),
          groupsApi.getMyInvitations(),
          studentsApi.getMe(),
        ]);
        
        if (groupRes.data) {
          setGroupCount(groupRes.data.memberCount || 0);
        }
        setInvitationCount(invitationsRes.data?.length || 0);
        
        if (meRes.data?.currentRoom) {
          setCurrentRoom(meRes.data.currentRoom);
        }
      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
      }
    };

    fetchStudentData();
  }, []);

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">
          Welcome, {student?.fullName || "Student"}! 👋
        </h1>
        <p className="text-slate-600 mt-1">
          Here's an overview of your hostel allocation status
        </p>
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
