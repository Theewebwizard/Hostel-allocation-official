import { useEffect, useState } from "react";
import { 
  Building2, 
  MapPin, 
  User, 
  Users, 
  Info, 
  Layout, 
  DoorOpen,
  ChevronRight,
  Sparkles
} from "lucide-react";
import { DashboardLayout } from "~/components/layout/DashboardLayout";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "~/components/ui";
import { allocationApi, type AllocationResult } from "~/lib/api";
import { useAuthStore } from "~/lib/auth-store";

export function meta() {
  return [
    { title: "Allocation Result - Hostel Allocation System" },
    { name: "description", content: "View your official hostel room assignment" },
  ];
}

export default function AllocationResultPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    result: AllocationResult;
    neighbors: AllocationResult[];
  } | null>(null);

  const isFemale = user?.student?.gender === "female";
  const theme = isFemale
    ? {
        primary: "indigo",
        accent: "purple",
        gradient: "from-purple-600 to-indigo-700",
        light: "bg-purple-50",
        border: "border-purple-100",
        text: "text-purple-700",
        icon: "text-purple-600",
      }
    : {
        primary: "blue",
        accent: "sky",
        gradient: "from-blue-600 to-indigo-700",
        light: "bg-blue-50",
        border: "border-blue-100",
        text: "text-blue-700",
        icon: "text-blue-600",
      };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await allocationApi.getMyAllocationResult();
        setData(res.data);
      } catch (err) {
        console.error("Failed to fetch allocation result", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className={`animate-spin rounded-full h-12 w-12 border-b-2 border-${theme.primary}-600`}></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!data || !data.result) {
    return (
      <DashboardLayout>
        <div className="p-8">
          <div className="max-w-2xl mx-auto text-center py-12">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-8 border border-slate-100 shadow-inner">
              <Info className="w-12 h-12 text-slate-300" />
            </div>
            <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">
              Allocation in Progress
            </h1>
            <p className="text-slate-500 text-xl mb-10 leading-relaxed">
              We're carefully processing all requests. Your official assignment 
              will appear here as soon as the Warden finalizes the run.
            </p>
            <Card className={`${theme.light} border-${theme.primary}-100 shadow-sm overflow-hidden`}>
              <CardContent className="pt-8 pb-8">
                <div className="flex gap-5 text-left items-center">
                  <div className={`p-3 bg-white rounded-xl shadow-sm ${theme.icon}`}>
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <div>
                    <p className={`font-black text-xl text-${theme.primary}-900`}>Stay Tuned!</p>
                    <p className={`text-${theme.primary}-700 font-medium mt-1`}>
                      You'll be notified as soon as your room and roommates are assigned.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const { result, neighbors } = data;
  const roommates = neighbors.filter(n => n.roomNumber === result.roomNumber);
  const wingMates = neighbors.filter(n => n.roomNumber !== result.roomNumber);

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto">
        <div className="mb-10">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">
            Room Assignment
          </h1>
          <p className="text-slate-500 mt-2 text-lg font-medium">
            Your official housing details for the upcoming semester
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Main Assignment Card */}
          <div className={`${result.groupId ? "lg:col-span-8" : "lg:col-span-12"} space-y-10`}>
            <Card className={`overflow-hidden border-none shadow-2xl relative bg-white`}>
              <div className="absolute top-6 right-6 z-10">
                <div className={`bg-white/20 backdrop-blur-xl text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest border border-white/30`}>
                  {result.groupId ? "Group Allocation" : "Individual Allocation"}
                </div>
              </div>
              <CardHeader className={`bg-linear-to-br ${theme.gradient} text-white pt-12 pb-20 px-8 relative overflow-hidden`}>
                {/* Decorative background element */}
                <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
                
                <div className="flex items-center gap-4 mb-6 relative z-10">
                  <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md border border-white/20 shadow-lg">
                    <Building2 className="w-8 h-8 text-white" />
                  </div>
                  <span className="font-black text-2xl tracking-tight">
                    {result.hostelName}
                  </span>
                </div>
                <CardTitle className="text-7xl font-black mb-4 tracking-tighter relative z-10">
                  {result.roomNumber}
                </CardTitle>
                <div className="flex items-center gap-8 text-white/80 font-bold relative z-10">
                  <div className="flex items-center gap-2.5">
                    <Layout className="w-5 h-5" />
                    Wing {result.wing || "A"}
                  </div>
                  <div className="flex items-center gap-2.5">
                    <MapPin className="w-5 h-5" />
                    Floor {result.floor}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 relative z-20 -mt-10 mx-8">
                <div className="grid grid-cols-2 bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden divide-x divide-slate-50">
                  <div className="p-8 text-center hover:bg-slate-50 transition-colors">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                      Happiness Score
                    </p>
                    <p className={`text-5xl font-black text-${theme.primary}-600`}>
                      {result.happiness}%
                    </p>
                  </div>
                  <div className="p-8 text-center hover:bg-slate-50 transition-colors">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                      Occupancy
                    </p>
                    <p className={`text-5xl font-black text-${theme.primary}-600 capitalize`}>
                      {result.room?.roomType || "Double"}
                    </p>
                  </div>
                </div>
              </CardContent>
              <div className="p-8 pt-4">
                <div className={`flex items-center gap-3 p-4 ${theme.light} rounded-2xl border ${theme.border}`}>
                  <Sparkles className={`w-5 h-5 ${theme.icon}`} />
                  <p className={`text-sm font-bold ${theme.text}`}>
                    This assignment is based on {result.groupId ? "your group's combined preferences" : "your individual application timestamp (FCFS)"}.
                  </p>
                </div>
              </div>
            </Card>

            {/* Roommates Section (Only if Group) */}
            {result.groupId && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 ${theme.light} rounded-lg ${theme.icon}`}>
                      <DoorOpen className="w-6 h-6" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Roommates</h2>
                  </div>
                  <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                    {roommates.length + 1} Total
                  </span>
                </div>
                
                {roommates.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {roommates.map((mate) => (
                      <Card key={mate.id} className="hover:shadow-lg transition-all group border-slate-200 bg-white rounded-2xl overflow-hidden">
                        <CardContent className="p-6 flex items-center gap-5">
                          <div className={`w-16 h-16 rounded-2xl ${theme.light} flex items-center justify-center border ${theme.border} group-hover:scale-105 transition-transform`}>
                            <User className={`w-8 h-8 ${theme.icon}`} />
                          </div>
                          <div>
                            <p className="text-xl font-black text-slate-900">{mate.student?.fullName}</p>
                            <p className="text-sm font-bold text-slate-500 tracking-tight mt-0.5">
                              {mate.student?.rollNumber}
                            </p>
                            <div className={`inline-flex items-center px-2 py-0.5 rounded-md ${theme.light} ${theme.text} text-[10px] font-black uppercase mt-2`}>
                              {mate.student?.program}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="bg-slate-50 border-dashed border-slate-300 rounded-3xl">
                    <CardContent className="py-12 text-center">
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100 shadow-sm">
                        <User className="w-8 h-8 text-slate-300" />
                      </div>
                      <p className="text-slate-500 font-bold text-lg">
                        Single Occupancy
                      </p>
                      <p className="text-slate-400 text-sm mt-1">
                        You have the room to yourself!
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>

          {/* Group Members Sidebar (Only if Group) */}
          {result.groupId && (
            <div className="lg:col-span-4 space-y-8">
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className={`p-2 ${theme.light} rounded-lg ${theme.icon}`}>
                    <Users className="w-6 h-6" />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Group Members</h2>
                </div>
                
                <Card className="border-slate-200 shadow-xl bg-white rounded-3xl overflow-hidden">
                  <CardHeader className="bg-slate-50 border-b border-slate-100 py-6 px-8">
                    <CardTitle className="text-xs font-black text-slate-400 uppercase tracking-widest">
                      Other Members in Group
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-slate-50">
                      {wingMates.length > 0 ? (
                        wingMates.map((mate) => (
                          <div key={mate.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors group cursor-pointer">
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-xl ${theme.light} flex items-center justify-center text-xs font-black ${theme.text} border ${theme.border}`}>
                                {mate.student?.fullName.split(' ').map(n => n[0]).join('')}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{mate.student?.fullName}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className={`text-[10px] font-black uppercase text-${theme.primary}-600`}>
                                    Room {mate.roomNumber}
                                  </span>
                                  <span className="text-[10px] text-slate-300 font-bold">•</span>
                                  <span className="text-[10px] text-slate-400 font-bold">
                                    {mate.student?.year} Year
                                  </span>
                                </div>
                              </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:translate-x-1 transition-transform" />
                          </div>
                        ))
                      ) : (
                        <div className="p-12 text-center">
                          <p className="text-sm text-slate-400 font-bold italic">All group members are in your room.</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-slate-900 text-white border-none shadow-2xl rounded-3xl overflow-hidden group">
                <CardContent className="p-8 relative">
                  <div className={`absolute -right-10 -top-10 w-32 h-32 bg-${theme.primary}-500/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700`} />
                  <div className="flex gap-5 relative z-10">
                    <div className={`p-3 bg-white/10 rounded-2xl h-fit border border-white/10 ${theme.icon}`}>
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-black text-xl text-white tracking-wide">Swap Window</p>
                      <p className="text-slate-400 text-sm mt-2 leading-relaxed font-medium">
                        Not happy with your floor or wing? Use the **Room Swaps** 
                        tool to exchange with other students once the portal opens.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
